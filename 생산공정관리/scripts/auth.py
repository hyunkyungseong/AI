"""
로그인 인증(JWT) + 당사 생산공정관리시스템 연동용 API 키 검증

- 화면(app.py)이 호출하는 API: 로그인 후 발급된 토큰(Authorization: Bearer <token>)으로 보호
- 당사 생산공정관리시스템이 호출하는 /운영통계자료수신: 사람이 로그인하는 게 아니라 시스템 간 연동이므로
  별도의 고정 API 키(X-API-Key 헤더)로 보호
"""

import sys
import secrets
import string
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import pymysql
from jose import jwt, JWTError
from fastapi import Header, HTTPException

sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg

ALGORITHM = "HS256"
TOKEN_유효시간_시간 = 12


def 비밀번호_해시(평문: str) -> str:
    return bcrypt.hashpw(평문.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def 비밀번호_확인(평문: str, 해시: str) -> bool:
    return bcrypt.checkpw(평문.encode("utf-8"), 해시.encode("utf-8"))


def 새_세션ID() -> str:
    """로그인할 때마다 새로 찍는 출입증 "카드 번호"(32자, 추측 불가). 사용자.세션ID에도 같은 값을 저장해
    가장 최근 로그인의 출입증만 유효하게 만드는 데 쓴다(2026-11-13, 7단계 — 중복 로그인 차단)."""
    return secrets.token_hex(16)


def 토큰_발급(사용자명: str, 세션ID: str) -> str:
    만료 = datetime.now(timezone.utc) + timedelta(hours=TOKEN_유효시간_시간)
    return jwt.encode({"sub": 사용자명, "sid": 세션ID, "exp": 만료}, cfg.JWT_SECRET_KEY, algorithm=ALGORITHM)


class 인증오류(HTTPException):
    """출입증 거부(401). api.py의 전용 처리기가 {"detail": 안내문구, "인증사유": 사유코드}로 응답한다 —
    detail은 기존처럼 문자열 그대로라 화면의 data.detail 표시는 영향 없고, 화면 접속 감시 장치(7단계 2-1)는
    인증사유(missing/expired/disabled/duplicate/idle — 401, password_change/forbidden — 403)로 안내창 문구를 고른다.
    401은 "다시 로그인해야 함", 403은 "로그인은 유지되지만 이 기능은 안 됨"으로 구분한다."""

    def __init__(self, 사유: str, 안내: str, 상태코드: int = 401):
        super().__init__(status_code=상태코드, detail=안내)
        self.사유 = 사유


# 비밀번호 규칙(2026-11-13 사용자 확정): 8자 이상 + 영문·숫자·특수문자 모두 포함.
# 새로 정하는 비밀번호(계정 추가·관리자 초기화·본인 변경·create_user.py)에만 적용 — 이미 쓰던 비밀번호로의
# 로그인은 막지 않는다. 특수문자는 키보드의 ASCII 기호(string.punctuation)만 인정(한글은 특수문자로 안 셈).
비밀번호_최소길이 = 8


def 비밀번호_규칙_검사(평문: str) -> Optional[str]:
    """규칙을 만족하면 None, 아니면 부족한 점을 담은 안내 문구를 반환."""
    평문 = 평문 or ""
    부족 = []
    if len(평문) < 비밀번호_최소길이:
        부족.append(f"{비밀번호_최소길이}자 이상")
    if not any(ch in string.ascii_letters for ch in 평문):
        부족.append("영문")
    if not any(ch in string.digits for ch in 평문):
        부족.append("숫자")
    if not any(ch in string.punctuation for ch in 평문):
        부족.append("특수문자")
    if 부족:
        return (f"비밀번호는 {비밀번호_최소길이}자 이상, 영문·숫자·특수문자를 모두 포함해야 합니다 "
                f"(부족: {', '.join(부족)})")
    return None


_만료_안내 = "접속 시간이 만료되었습니다. 다시 로그인해 주세요"
_활동기록_간격_초 = 30  # 화면 첫 진입 시 요청 5개가 동시에 오므로 DB 쓰기를 이 간격으로 줄임


def _db_연결():
    # api.get_db()를 쓰면 api↔auth가 서로를 import하는 순환이 생겨 여기서 직접 연결
    # (init_db_mariadb.py·create_user.py와 같은 방식)
    return pymysql.connect(
        host=cfg.DB_HOST, port=cfg.DB_PORT, user=cfg.DB_USER, password=cfg.DB_PASSWORD,
        database=cfg.DB_NAME, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def 출입증_검사(authorization: Optional[str], 활동갱신: bool = True,
               비밀번호변경중_허용: bool = False) -> dict:
    """출입증 검사 본체(2026-11-13, 7단계 1-3·1-4). 처음 걸린 사유로 인증오류를 낸다.
    순서: 출입증 없음 → 12시간 만료·위조·번호 없는 옛 출입증 → 사용중지 → 다른 곳 로그인(설정 켜졌을 때만)
    → 유휴 시간 초과 → 비밀번호 변경 필요(403, 비밀번호변경중_허용=True인 내정보·내비밀번호·세션확인만 통과).
    통과하면 {"id", "사용자명", "이름", "관리자", "비밀번호변경필요"} 반환.
    활동갱신=False는 화면의 30초 주기 "세션확인"용 — 화면만 켜두고 자리를 비우면 갱신되지 않아야
    유휴 자동 로그아웃이 동작한다."""
    if not authorization or not authorization.startswith("Bearer "):
        raise 인증오류("missing", "로그인이 필요합니다")
    token = authorization[len("Bearer "):].strip()
    try:
        payload = jwt.decode(token, cfg.JWT_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:  # 12시간 만료(ExpiredSignatureError)·위조·손상 모두
        raise 인증오류("expired", _만료_안내)
    사용자명 = payload.get("sub")
    출입증번호 = payload.get("sid")
    if not 사용자명 or not 출입증번호:  # 1-2 이전에 발급된 번호 없는 옛 출입증
        raise 인증오류("expired", _만료_안내)

    conn = _db_연결()
    try:
        with conn.cursor() as cur:
            # 경과 시간은 DB 시계(NOW()) 기준으로 계산 — PC 시계·시간대 차이 영향 없음
            cur.execute(
                """SELECT id, 사용자명, 이름, 관리자, 사용여부, 세션ID, 비밀번호변경필요,
                          TIMESTAMPDIFF(SECOND, 마지막활동, NOW()) AS 경과초
                   FROM 사용자 WHERE 사용자명=%s""",
                (사용자명,),
            )
            user = cur.fetchone()
            if not user or not user["사용여부"]:
                raise 인증오류("disabled", "사용이 중지된 계정입니다. 관리자에게 문의해 주세요")

            cur.execute("SELECT 설정이름, 값 FROM 시스템설정")
            설정 = {r["설정이름"]: r["값"] for r in cur.fetchall()}
            중복차단 = 설정.get("중복로그인차단", "1") == "1"
            try:
                유휴분 = int(설정.get("유휴시간_분", "30"))
            except ValueError:
                유휴분 = 30

            if 중복차단 and 출입증번호 != user["세션ID"]:
                raise 인증오류("duplicate", "다른 PC에서 같은 ID로 로그인하여 접속이 종료되었습니다")

            경과초 = user["경과초"]
            if 유휴분 > 0 and 경과초 is not None and 경과초 >= 유휴분 * 60:
                raise 인증오류("idle", f"{유휴분}분 동안 사용하지 않아 자동 로그아웃되었습니다")

            # 관리자가 만들었거나 초기화한 계정은 본인 비밀번호로 바꾸기 전까지 다른 기능 사용 불가
            # (2026-11-13 사용자 확정 "로그인 후 반드시 비밀번호를 바꾸도록" — 화면 안내와 별개로 서버에서 강제)
            if user["비밀번호변경필요"] and not 비밀번호변경중_허용:
                raise 인증오류("password_change", "비밀번호를 변경한 후 사용할 수 있습니다", 상태코드=403)

            if 활동갱신 and (경과초 is None or 경과초 >= _활동기록_간격_초):
                cur.execute("UPDATE 사용자 SET 마지막활동=NOW() WHERE id=%s", (user["id"],))
    finally:
        conn.close()
    return {
        "id": user["id"],
        "사용자명": user["사용자명"],
        "이름": user["이름"],
        "관리자": bool(user["관리자"]),
        "비밀번호변경필요": bool(user["비밀번호변경필요"]),
    }


def get_current_user(authorization: str = Header(default=None)) -> str:
    """Authorization: Bearer <token> 헤더 검증 — 화면이 호출하는 모든 API의 공통 문지기.
    반환값(사용자명)은 거래명세서 수정이력의 "수정자"로 쓰인다."""
    return 출입증_검사(authorization, 활동갱신=True)["사용자명"]


def 비밀번호변경중_사용자(authorization: str = Header(default=None)) -> dict:
    """비밀번호 변경이 필요한 상태에서도 통과시키는 문지기 — 내정보·내비밀번호 전용."""
    return 출입증_검사(authorization, 활동갱신=True, 비밀번호변경중_허용=True)


def 관리자_확인(authorization: str = Header(default=None)) -> dict:
    """관리자 전용 API 문지기 — 화면에서 메뉴를 숨기는 것과 별개로 서버에서 이중 차단."""
    정보 = 출입증_검사(authorization, 활동갱신=True)
    if not 정보["관리자"]:
        raise 인증오류("forbidden", "관리자만 사용할 수 있습니다", 상태코드=403)
    return 정보


def verify_api_key(x_api_key: str = Header(default=None)) -> None:
    """X-API-Key 헤더 검증. 당사 생산공정관리시스템 연동(/운영통계자료수신) 보호용."""
    if not x_api_key or x_api_key != cfg.API_KEY:
        raise HTTPException(status_code=401, detail="API 키가 유효하지 않습니다")
