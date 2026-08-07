"""
FastAPI 백엔드 서버
실행: python scripts/api.py  (또는 uvicorn scripts.api:app --host 0.0.0.0 --port 8000)

인증:
  - POST /login 으로 발급받은 토큰을 나머지 API 호출 시 Authorization: Bearer <token> 헤더에 담아야 함 (/health, /login, /운영통계자료수신 제외)
  - /운영통계자료수신 은 X-API-Key 헤더(당사 생산공정관리시스템 전용 고정 키)로 별도 보호

현재 구현된 엔드포인트:
  GET  /health              — 서버·DB 연결 상태 확인 (인증 불필요)
  POST /login               — 사용자명·비밀번호로 로그인, 토큰 발급
  GET  /summary             — 운영통계자료 전체(또는 사업부 필터) 반환 — app.py 탭1·2·3용 원본 데이터
  GET  /거래처마스터         — 거래처마스터 전체 반환
  GET  /단가마스터           — 단가마스터 전체 반환
  GET  /거래명세서이력       — 거래명세서+거래명세서_의뢰서 JOIN, 업무의뢰서번호 단위로 펼친 상태로 반환
                              (app.py는 SQLite를 직접 봄, 이 API는 미사용. Next.js 미발행 판정은 아래 /미발행목록 사용)
  GET  /예상공급가액         — calc_공급가맵() 계산 결과를 업무의뢰서 단위로 반환 (2026-07-19 신규, billing.py 재사용)
  GET  /미발행목록           — 미발행 판정+의뢰서 단위 집계+예상공급가액 계산까지 서버가 전담 반환
                              (2026-07-19 신규, Next.js 탭4 "미발행 목록" 화면 전용, billing.py 재사용)
  GET  /발행목록             — /미발행목록과 대칭(이미 요청된 의뢰서 대상) + 거래명세서번호·발송여부 포함
                              (2026-07-19 신규, Next.js 탭4 "발행요청목록"·"발행완료" 화면 공용, billing.py 재사용)
  GET  /거래명세서엑셀/{no} — 거래명세서 Excel 파일 다운로드, 언제든 재호출 가능 (2026-07-19 신규, billing.py 재사용, no=거래명세서번호)
                              편집·규칙 적용된 거래명세서는 거래명세서_품목(구분='최종')을 그대로 읽어 재사용,
                              편집 이력이 없는 예전 건은 지금처럼 운영통계자료에서 실시간 재계산(2026-07-22)
  GET  /거래명세서품목이력/{no} — 편집된 거래명세서의 원본(자동계산)·최종(확정) 품목 스냅샷을 비교용으로 반환 (2026-07-22 신규)
  POST /거래명세서미리보기  — 채번 전 의뢰서번호_목록으로 원본 품목(왼쪽)·저장된 규칙 적용 결과(오른쪽 초안)·
                              미분류 항목을 JSON으로 미리보기 (2026-07-20 신규, 2026-07-22 규칙엔진 확장, Next.js 탭4 전용)
  GET  /청구품목규칙        — 거래처명+업무명으로 저장된 재사용 청구 규칙 목록 조회 (2026-07-22 신규)
  PUT  /청구품목규칙        — 거래처명+업무명의 규칙 전체를 통째로 교체 저장 (2026-07-22 신규)
  POST /운영통계자료수신     — 당사 생산공정관리시스템 Push 수신 (업무의뢰서 단위, 실시간)

  POST   /거래처마스터       — 거래처 1건 신규 등록 (2026-07-19 전체교체→단건생성으로 변경, Next.js [4-D])
  PUT    /거래처마스터/{name} — 거래처 1건 수정 (사업자등록번호·수신이메일·비고만, 거래처명은 변경 불가)
  DELETE /거래처마스터       — 거래처명 목록으로 삭제
  POST   /단가마스터         — 단가 1건 신규 등록
  PUT    /단가마스터/{id}    — 단가 1건 수정
  DELETE /단가마스터         — id 목록으로 삭제
  POST   /거래명세서요청     — 채번 + 거래명세서/거래명세서_의뢰서 저장. 품목_최종을 함께 보내면
                              원본과 비교해 편집여부를 판정하고 거래명세서_품목(원본·최종)에 이력을 남기며,
                              규칙을 함께 보내면 그 거래처+업무명의 청구품목규칙도 갱신 (2026-07-22 확장)
  POST   /거래명세서발행     — 발송여부=1로 변경
  POST   /거래명세서발행취소 — 발송여부=0으로 되돌림 (원래 계획엔 없었으나 app.py에 이미 있는 기능이라 함께 추가)
  POST   /거래명세서부분취소 — 선택한 의뢰서만 취소, 0건 남으면 거래명세서 자체 삭제(CASCADE), 남으면 금액 재계산 UPDATE (2026-07-19 신규)
                              편집된(편집여부=1) 거래명세서는 일부만 남기는 부분취소는 막고, 전체 선택(=전체취소)만 허용 (2026-07-22)

가공 로직은 scripts/data_transform.py, 금액 계산·Excel 생성은 scripts/billing.py 재사용
(둘 다 preprocess.py·app.py와 동일한 규칙 — 2026-07-19부터 자재형태 컬럼이 MariaDB에 반영되어
 계산·Excel 생성 로직을 app.py에서 billing.py로 옮기고 이 API에서도 함께 쓸 수 있게 됨).
API 요청/응답 규격 문서: docs/API규격서.md 참고
"""

import json
import sys
from pathlib import Path
from contextlib import contextmanager
from typing import List, Literal, Optional

import pandas as pd
import pymysql
from pymysql.constants import CLIENT
from fastapi import FastAPI, HTTPException, Query, Depends, Response
from pydantic import BaseModel, ConfigDict

sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg
import data_transform as dt
import billing
import auth

인증필요 = [Depends(auth.get_current_user)]

app = FastAPI(title="생산공정관리 대시보드 API", version="0.1.0")


@contextmanager
def get_db():
    conn = pymysql.connect(
        host=cfg.DB_HOST,
        port=cfg.DB_PORT,
        user=cfg.DB_USER,
        password=cfg.DB_PASSWORD,
        database=cfg.DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
        # 기본값(FOUND_ROWS 미설정)은 cur.rowcount가 "실제로 값이 바뀐 행 수"를 반환해서, 제출한
        # 값이 이미 DB와 같으면(예: 같은 날 두 번째로 같은 내용 저장) UPDATE는 정상 실행됐는데도
        # rowcount=0이 되어 "해당 id가 없습니다"로 오판하는 버그가 있었다(2026-07-29 실사용 중
        # 단가마스터 수정에서 발견). CLIENT.FOUND_ROWS를 켜서 rowcount가 "조건에 매칭된 행 수"를
        # 반환하도록 통일 — 거래처마스터·단가마스터·거래명세서발행(취소) 등 `rowcount==0으로
        # 존재 여부를 판정하는 모든 곳에 공통 적용됨.
        client_flag=CLIENT.FOUND_ROWS,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/health")
def health():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB 연결 실패: {e}")


class 로그인요청(BaseModel):
    model_config = ConfigDict(title="LoginRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    사용자명: str
    비밀번호: str


@app.post("/login")
def login(요청: 로그인요청):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM 사용자 WHERE 사용자명=%s", (요청.사용자명,))
            user = cur.fetchone()
    if not user or not auth.비밀번호_확인(요청.비밀번호, user["비밀번호_해시"]):
        raise HTTPException(status_code=401, detail="사용자명 또는 비밀번호가 올바르지 않습니다")
    token = auth.토큰_발급(요청.사용자명)
    return {"access_token": token, "token_type": "bearer", "이름": user["이름"]}


@app.get("/summary", dependencies=인증필요)
def summary(사업부: Optional[List[str]] = Query(default=None)):
    """
    운영통계자료를 원본 그대로 반환 (탭1·2·3의 집계·필터링은 지금처럼 app.py(pandas)가 그대로 담당).
    app.py의 df_all = load_data(...) 자리를 이 API 호출로 대체하는 용도 — 집계 로직은 옮기지 않음(A안).
    사업부 필터는 선택 사항 (없으면 전체 반환).
    """
    sql = "SELECT * FROM 운영통계자료"
    params = []
    if 사업부:
        자리표시자 = ", ".join(["%s"] * len(사업부))
        sql += f" WHERE 사업부 IN ({자리표시자})"
        params = 사업부

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return rows


@app.get("/거래처마스터", dependencies=인증필요)
def 거래처마스터_목록():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM 거래처마스터 ORDER BY 거래처명")
            return cur.fetchall()


@app.get("/단가마스터", dependencies=인증필요)
def 단가마스터_목록():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM 단가마스터 ORDER BY 거래처명, 업무명, 작업명")
            return cur.fetchall()


@app.get("/거래명세서이력", dependencies=인증필요)
def 거래명세서이력(발송여부: Optional[int] = Query(default=None)):
    """
    거래명세서(그룹 집계·상태) + 거래명세서_의뢰서(의뢰서번호 목록)를 JOIN해서
    업무의뢰서번호 단위로 이미 펼쳐진 형태로 반환. 구 SQLite의 업무의뢰서번호목록(JSON) 파싱이 필요 없어짐 —
    정규화 설계 덕분에 JOIN 한 번으로 대체됨.
    미발행목록 계산(전체 의뢰서 - 이 목록에 있는 의뢰서번호)·3단계 드릴다운은 지금처럼 app.py가 담당(A안).
    """
    sql = """
        SELECT b.거래명세서번호, b.거래처명, b.담당자, b.발행일자, b.품목,
               b.공급가액, b.세액, b.합계, b.발송여부, b.발송일, b.파일경로, b.등록일,
               a.업무의뢰서번호
        FROM 거래명세서_의뢰서 a
        JOIN 거래명세서 b ON a.거래명세서번호 = b.거래명세서번호
    """
    params = []
    if 발송여부 is not None:
        sql += " WHERE b.발송여부 = %s"
        params = [발송여부]
    sql += " ORDER BY b.등록일 DESC"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def _자재map_조회(cur, 의뢰서목록=None):
    """billing.build_자재map()이 기대하는 형태(업무의뢰서번호·작업이름·자재종류·자재형태·사용량)로 집계해서 반환.
    2026-07-19: 자재사용현황에 작업명 컬럼이 생기기 전에는 운영통계자료와 (업무의뢰서번호,작업내역서번호)로만
    JOIN해서 작업명을 추측했는데, 작업내역서번호 하나에 작업명이 여러 개 걸리면(실제로 있음 — 예: 의뢰서
    97232) 자재 수량이 작업명 개수만큼 그대로 복제되어 청구 금액까지 부풀려지는 버그가 있었음.
    이제는 저장된 m.작업명이 있으면 그대로 쓰고(배치 재적재분 — 정확), 작업명이 비어 있는 행만(주로 아직
    작업명을 안 보내주는 실시간 API 수신 건) 예전처럼 추측 JOIN으로 보완한다(그 행들만 여전히 같은
    한계가 남음 — docs/API규격서.md 요청 메모 참고).
    의뢰서목록을 주면 그 의뢰서만 스코프(거래명세서 Excel용), 없으면 전체(예상공급가액 미리보기용)."""
    sql = """
        SELECT 업무의뢰서번호, 작업이름, 자재종류, 자재형태, SUM(사용량) AS 사용량
        FROM (
            SELECT m.업무의뢰서번호, m.작업명 AS 작업이름, m.자재종류, m.자재형태, m.사용량
            FROM 자재사용현황 m
            WHERE m.작업명 IS NOT NULL

            UNION ALL

            SELECT m.업무의뢰서번호, o.작업명 AS 작업이름, m.자재종류, m.자재형태, m.사용량
            FROM 자재사용현황 m
            LEFT JOIN (SELECT DISTINCT 업무의뢰서번호, 작업내역서번호, 작업명 FROM 운영통계자료) o
              ON m.업무의뢰서번호 = o.업무의뢰서번호 AND m.작업내역서번호 = o.작업내역서번호
            WHERE m.작업명 IS NULL
        ) 자재통합
    """
    params = []
    if 의뢰서목록:
        자리표시자 = ", ".join(["%s"] * len(의뢰서목록))
        sql += f" WHERE 업무의뢰서번호 IN ({자리표시자})"
        params = list(의뢰서목록)
    sql += " GROUP BY 업무의뢰서번호, 작업이름, 자재종류, 자재형태"
    cur.execute(sql, params)
    return cur.fetchall()


def _규칙_조회(cur, 거래처명, 업무명):
    """거래처명+업무명으로 저장된 청구품목규칙을 순서대로 조회. 조건 컬럼은 MariaDB JSON 타입인데
    pymysql이 자동으로 dict로 파싱해주지 않는 경우가 있어(드라이버 버전에 따라 str로 올 수 있음)
    str이면 직접 json.loads()로 변환한다. 조(시트명, 2026-07-29 조별 분할발급) 컬럼도 함께 반환."""
    cur.execute(
        "SELECT 순서, 최종청구품명, 조건, 조 FROM 청구품목규칙 WHERE 거래처명=%s AND 업무명=%s ORDER BY 순서",
        (거래처명, 업무명),
    )
    행목록 = cur.fetchall()
    for r in 행목록:
        if isinstance(r["조건"], str):
            r["조건"] = json.loads(r["조건"])
    return 행목록


def _규칙_저장(cur, 거래처명, 업무명, 규칙목록):
    """그 거래처+업무명의 규칙 전체를 통째로 교체(DELETE 후 INSERT) — 단가마스터 등 다른 마스터
    데이터 갱신과 동일한 관례. 규칙목록 각 원소는 {"순서","최종청구품명","조건","조"(선택)} dict."""
    cur.execute("DELETE FROM 청구품목규칙 WHERE 거래처명=%s AND 업무명=%s", (거래처명, 업무명))
    if 규칙목록:
        cur.executemany(
            "INSERT INTO 청구품목규칙 (거래처명, 업무명, 순서, 최종청구품명, 조건, 조) VALUES (%s,%s,%s,%s,%s,%s)",
            [
                (거래처명, 업무명, r["순서"], r["최종청구품명"],
                 json.dumps(r["조건"], ensure_ascii=False), r.get("조"))
                for r in 규칙목록
            ],
        )


@app.get("/예상공급가액", dependencies=인증필요)
def 예상공급가액(사업부: Optional[List[str]] = Query(default=None)):
    """
    미발행 건의 예상공급가액을 미리 계산해 업무의뢰서 단위로 반환.
    calc_공급가맵() 계산 자체는 app.py와 완전히 동일(billing.py 공용) — 자재 수량만 MariaDB에서 조회.
    사업부 필터는 /summary와 동일한 선택 사항.
    """
    sql = "SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 확정청구페이지, 건수, 장수 FROM 운영통계자료"
    params = []
    if 사업부:
        자리표시자 = ", ".join(["%s"] * len(사업부))
        sql += f" WHERE 사업부 IN ({자리표시자})"
        params = 사업부

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            원본행 = cur.fetchall()
            if not 원본행:
                return []

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur)

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

    단가맵 = billing.build_단가맵(단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in df_all["업무의뢰서번호"] if pd.notna(x)}

    결과 = billing.calc_공급가맵(df_all, 단가맵, 자재map, 의뢰서번호셋)

    응답 = []
    for 의뢰서, v in 결과.items():
        공급가액 = round(v["합계"])
        # 이 목록은 아직 발급 전 예상치일 뿐이라(2026-08-04), 작업명별 부가세구분이 섞여 있어도
        # 여기서 막지 않고 "별도"로 예상해 보여준다 — 실제 발급 차단은 POST /거래명세서요청이 담당.
        try:
            _구분 = billing.결정_부가세구분(v.get("부가세구분맵", {}))
        except ValueError:
            _구분 = "별도"
        세액, _ = billing.부가세_계산(_구분, 공급가액)
        응답.append({
            "업무의뢰서번호": str(의뢰서),
            "거래처명": v["거래처명"],
            "업무명": v["업무명"],
            "공급가액": 공급가액,
            "세액": 세액,
            "합계": 공급가액 + 세액,
        })
    return 응답


@app.get("/미발행목록", dependencies=인증필요)
def 미발행목록(사업부: Optional[List[str]] = Query(default=None)):
    """
    아직 거래명세서_의뢰서에 등장하지 않은(=거래명세서 요청이 한 번도 안 된) 업무의뢰서를
    의뢰서 단위로 집계하고 예상공급가액까지 계산해서 반환 (탭4 "미발행 목록" 화면 전용, 2026-07-19 신규).
    app.py 684~950행(build_의뢰서_summary + calc_공급가맵 조합)과 동일한 계산 — 자재 소스만 MariaDB.
    발송여부(0/1)와 무관하게 거래명세서_의뢰서에 존재하기만 하면 제외한다(요청 시점부터 미발행 아님).
    """
    sql = """SELECT 업무의뢰서번호, 거래처명, 업무명, 업무명상세, 작업명, 사업부, 연월, 날짜,
                     마케팅담당자, 확정청구페이지, 건수, 출력페이지, 장수
              FROM 운영통계자료"""
    params = []
    if 사업부:
        자리표시자 = ", ".join(["%s"] * len(사업부))
        sql += f" WHERE 사업부 IN ({자리표시자})"
        params = 사업부

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            원본행 = cur.fetchall()
            if not 원본행:
                return []

            # 미발행 판정: 업무의뢰서번호는 MariaDB 전체가 VARCHAR(20)로 통일돼 있어 문자열 그대로 비교
            cur.execute("SELECT DISTINCT 업무의뢰서번호 FROM 거래명세서_의뢰서")
            이미발행_번호셋 = {r["업무의뢰서번호"] for r in cur.fetchall()}

            df_all = pd.DataFrame(원본행)
            df_미발행 = df_all[~df_all["업무의뢰서번호"].isin(이미발행_번호셋)].copy()
            if df_미발행.empty:
                return []

            미발행_의뢰서목록 = df_미발행["업무의뢰서번호"].unique().tolist()

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 미발행_의뢰서목록)

    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(
        columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

    summary = billing.build_의뢰서_summary(df_미발행, 자재df)

    단가맵 = billing.build_단가맵(단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 미발행_의뢰서목록}
    공급가맵 = billing.calc_공급가맵(df_미발행, 단가맵, 자재map, 의뢰서번호셋)

    응답 = []
    for _, r in summary.iterrows():
        가격 = 공급가맵.get(int(float(r["업무의뢰서번호"])))
        예상공급가액 = round(가격["합계"]) if (가격 and 가격["합계"] > 0) else None
        응답.append({
            "의뢰서번호": r["업무의뢰서번호"],
            "담당자": r["마케팅담당자"],
            "사업부": r["사업부"],
            "거래처명": r["거래처명"],
            "업무명": r["업무명"],
            "업무명상세": r["업무명상세"],
            "작업일자": r["날짜"],
            "청구페이지": int(r["확정청구페이지"]),
            "장수": int(r["장수_합"]),
            "봉입건수": int(r["봉입건수_합"]),
            "용지수량": int(r["용지_사용량_합"]),
            "봉투수량": int(r["봉투_사용량_합"]),
            "삽지수량": int(r["삽지_사용량_합"]),
            "예상공급가액": 예상공급가액,
        })
    응답.sort(key=lambda x: x["작업일자"], reverse=True)
    return 응답


@app.get("/발행목록", dependencies=인증필요)
def 발행목록(사업부: Optional[List[str]] = Query(default=None)):
    """
    이미 거래명세서 요청된(=거래명세서_의뢰서에 존재하는) 업무의뢰서를 의뢰서 단위로 집계해서
    반환 (탭4 "발행요청목록"·"발행완료" 화면 공용, 2026-07-19 신규).
    /미발행목록과 대칭 구조(판정 방향만 반대) — build_의뢰서_summary()·calc_공급가맵() 그대로 재사용하고
    거래명세서번호·발송여부 필드만 추가한다.

    발송여부(0/1) 쿼리 파라미터는 받지 않고 항상 전체(대기+완료)를 반환한다 — 두 서브탭이 화면에
    동시 마운트(상시 마운트+hidden)되어 있어 한 번에 받아두는 편이 단순하고, 프론트가 응답의
    발송여부 필드로 그룹만 나눠 쓴다.

    예상공급가액은 거래명세서 헤더에 저장된 합계가 아니라 매번 calc_공급가맵()으로 재계산한다 —
    레벨1 요약이 (거래명세서번호, 업무명) 단위인데 저장값은 번호 전체 단위라 쪼갤 수 없고,
    /거래명세서엑셀/{no}도 이미 매번 라이브 재계산 방식이라 통일성을 유지한다(단가마스터가 그
    사이 바뀌면 저장값과 달라질 수 있음 — 기존에도 있던 특성).

    조별 분할발급(2026-07-29)된 건은 의뢰서 하나가 거래명세서 여러 개에 동시에 속하므로(설계상
    모든 조가 같은 의뢰서번호_목록 전체를 공유), 그 의뢰서를 속한 거래명세서 수만큼 각각의 행으로
    중복 표시한다(사용자 확정: "의뢰서를 거래명세서별로 각각 표시" — 레벨1이 거래명세서번호 단위
    요약이라 이 방식이 기존 집계 로직과 가장 잘 맞음). 분할 안 된 일반 건은 지금처럼 1행 그대로.
    """
    sql = """SELECT 업무의뢰서번호, 거래처명, 업무명, 업무명상세, 작업명, 사업부, 연월, 날짜,
                     마케팅담당자, 확정청구페이지, 건수, 출력페이지, 장수
              FROM 운영통계자료"""
    params = []
    if 사업부:
        자리표시자 = ", ".join(["%s"] * len(사업부))
        sql += f" WHERE 사업부 IN ({자리표시자})"
        params = 사업부

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            원본행 = cur.fetchall()
            if not 원본행:
                return []

            cur.execute("""
                SELECT a.업무의뢰서번호, a.거래명세서번호, b.발송여부, b.편집여부
                FROM 거래명세서_의뢰서 a
                JOIN 거래명세서 b ON a.거래명세서번호 = b.거래명세서번호
            """)
            발행행목록 = cur.fetchall()
            if not 발행행목록:
                return []
            # 의뢰서번호 하나가 거래명세서 여러 개에 속할 수 있어(조별 분할발급, 2026-07-29) 리스트로
            # 누적 — 분할 안 된 일반 건은 리스트 길이가 항상 1이라 기존과 동일하게 동작한다.
            발행맵: dict = {}
            for r in 발행행목록:
                발행맵.setdefault(r["업무의뢰서번호"], []).append(
                    (r["거래명세서번호"], r["발송여부"], r["편집여부"])
                )

            df_all = pd.DataFrame(원본행)
            df_발행 = df_all[df_all["업무의뢰서번호"].isin(발행맵.keys())].copy()
            if df_발행.empty:
                return []

            발행_의뢰서목록 = df_발행["업무의뢰서번호"].unique().tolist()

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 발행_의뢰서목록)

    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(
        columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

    summary = billing.build_의뢰서_summary(df_발행, 자재df)

    단가맵 = billing.build_단가맵(단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 발행_의뢰서목록}
    공급가맵 = billing.calc_공급가맵(df_발행, 단가맵, 자재map, 의뢰서번호셋)

    응답 = []
    for _, r in summary.iterrows():
        의뢰서번호 = r["업무의뢰서번호"]
        가격 = 공급가맵.get(int(float(의뢰서번호)))
        예상공급가액 = round(가격["합계"]) if (가격 and 가격["합계"] > 0) else None
        for 거래명세서번호, 발송여부, 편집여부 in 발행맵[의뢰서번호]:
            응답.append({
                "의뢰서번호": 의뢰서번호,
                "거래명세서번호": 거래명세서번호,
                "발송여부": int(발송여부),
                "편집여부": int(편집여부),
                "담당자": r["마케팅담당자"],
                "사업부": r["사업부"],
                "거래처명": r["거래처명"],
                "업무명": r["업무명"],
                "업무명상세": r["업무명상세"],
                "작업일자": r["날짜"],
                "청구페이지": int(r["확정청구페이지"]),
                "장수": int(r["장수_합"]),
                "봉입건수": int(r["봉입건수_합"]),
                "용지수량": int(r["용지_사용량_합"]),
                "봉투수량": int(r["봉투_사용량_합"]),
                "삽지수량": int(r["삽지_사용량_합"]),
                "예상공급가액": 예상공급가액,
            })
    응답.sort(key=lambda x: x["작업일자"], reverse=True)
    return 응답


def _거래명세서_엑셀_바이트(cur, 거래명세서번호):
    """거래명세서번호 하나에 대한 엑셀 바이트를 만든다 — 기존 GET /거래명세서엑셀/{no}의 단일 파일
    생성 로직 그대로(스냅샷 우선, 없으면 실시간 재계산). 조별 분할발급 통합엑셀(2026-07-29)에서
    묶음에 속한 형제 거래명세서 각각의 시트를 만들 때도 이 함수를 재사용한다."""
    cur.execute("SELECT * FROM 거래명세서 WHERE 거래명세서번호=%s", (거래명세서번호,))
    거래명세서 = cur.fetchone()
    if not 거래명세서:
        raise HTTPException(status_code=404, detail="거래명세서번호를 찾을 수 없습니다")

    cur.execute("SELECT 업무의뢰서번호 FROM 거래명세서_의뢰서 WHERE 거래명세서번호=%s", (거래명세서번호,))
    의뢰서목록 = [r["업무의뢰서번호"] for r in cur.fetchall()]
    if not 의뢰서목록:
        raise HTTPException(status_code=404, detail="이 거래명세서에 연결된 업무의뢰서가 없습니다")

    자리표시자 = ", ".join(["%s"] * len(의뢰서목록))
    cur.execute(
        f"SELECT DISTINCT 업무명 FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
        의뢰서목록,
    )
    업무명행 = cur.fetchall()
    업무명 = 업무명행[0]["업무명"] if 업무명행 else None

    cur.execute(
        "SELECT 코드, 품목, 수량, 단가, 금액 FROM 거래명세서_품목 "
        "WHERE 거래명세서번호=%s AND 구분='최종' ORDER BY 순서",
        (거래명세서번호,),
    )
    저장된_최종 = cur.fetchall()

    from datetime import date
    발행일 = 거래명세서["발행일자"] or date.today()

    if 저장된_최종:
        품목행목록 = [
            {
                "코드": r["코드"],
                "표시품명": r["품목"],
                "수량": float(r["수량"]),
                "단가": float(r["단가"]) if r["단가"] is not None else None,
                "금액": float(r["금액"]),
            }
            for r in 저장된_최종
        ]
        총합계 = sum(r["금액"] for r in 품목행목록)
        # 편집된 건은 요청 시점에 이미 계산·저장된 세액을 그대로 재사용(재계산 안 함 — 발행 당시
        # 확정한 금액을 그대로 유지하는 원칙과 동일, 2026-07-28 부가세 표기 기능 추가 시 누락됐던
        # 호출부를 2026-07-29 실사용 중 다운로드 오류로 발견해 수정).
        세액 = float(거래명세서["세액"] or 0)
        return billing.write_거래명세서_excel(품목행목록, 총합계, 세액, 거래명세서["거래처명"], 업무명, 발행일)

    cur.execute(
        f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 확정청구페이지, 건수, 장수 "
        f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
        의뢰서목록,
    )
    원본행 = cur.fetchall()
    if not 원본행:
        raise HTTPException(status_code=404, detail="이 거래명세서의 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")

    cur.execute("SELECT * FROM 단가마스터")
    단가행 = cur.fetchall()
    자재행 = _자재map_조회(cur, 의뢰서목록)

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

    단가맵 = billing.build_단가맵(단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 의뢰서목록}
    try:
        return billing.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"부가세 처리 방식 불일치로 다운로드할 수 없습니다: {e}")


def _거래명세서_엑셀_시트목록(cur, 거래명세서번호):
    """거래명세서 1건의 저장된 최종 품목을 "조" 값으로 나눠 시트별 엑셀 바이트 목록을 만든다
    (2026-08-01 — 조는 이제 거래명세서를 여러 건으로 쪼개지 않고, 한 건 안의 시트 구성에만 쓰인다).
    [(엑셀바이트, 시트명), ...] 형태로 반환 — billing.combine_거래명세서_시트들()에 그대로 넘길 수 있는
    입력 형식(len<=1이면 그 파일 그대로 반환하므로 조가 없거나 1개뿐이어도 문제없음).
    스냅샷(거래명세서_품목)이 없으면(구 발행 건 또는 편집 없이 원본 그대로 발행된 건) 조 개념 자체가
    없었으므로 기존처럼 실시간 재계산한 단일 시트 1개짜리 목록을 반환한다."""
    cur.execute("SELECT * FROM 거래명세서 WHERE 거래명세서번호=%s", (거래명세서번호,))
    거래명세서 = cur.fetchone()
    if not 거래명세서:
        raise HTTPException(status_code=404, detail="거래명세서번호를 찾을 수 없습니다")

    cur.execute("SELECT 업무의뢰서번호 FROM 거래명세서_의뢰서 WHERE 거래명세서번호=%s", (거래명세서번호,))
    의뢰서목록 = [r["업무의뢰서번호"] for r in cur.fetchall()]
    if not 의뢰서목록:
        raise HTTPException(status_code=404, detail="이 거래명세서에 연결된 업무의뢰서가 없습니다")

    자리표시자 = ", ".join(["%s"] * len(의뢰서목록))
    cur.execute(
        f"SELECT DISTINCT 업무명 FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
        의뢰서목록,
    )
    업무명행 = cur.fetchall()
    업무명 = 업무명행[0]["업무명"] if 업무명행 else None

    from datetime import date
    발행일 = 거래명세서["발행일자"] or date.today()

    cur.execute(
        "SELECT 조, 코드, 품목, 수량, 단가, 금액 FROM 거래명세서_품목 "
        "WHERE 거래명세서번호=%s AND 구분='최종' ORDER BY 순서",
        (거래명세서번호,),
    )
    저장된_최종 = cur.fetchall()

    if not 저장된_최종:
        cur.execute(
            f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 확정청구페이지, 건수, 장수 "
            f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
            의뢰서목록,
        )
        원본행 = cur.fetchall()
        if not 원본행:
            raise HTTPException(status_code=404, detail="이 거래명세서의 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")
        cur.execute("SELECT * FROM 단가마스터")
        단가행 = cur.fetchall()
        자재행 = _자재map_조회(cur, 의뢰서목록)
        df_all = pd.DataFrame(원본행)
        단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
        자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])
        단가맵 = billing.build_단가맵(단가df)
        자재map = billing.build_자재map(자재df)
        의뢰서번호셋 = {int(float(x)) for x in 의뢰서목록}
        try:
            바이트 = billing.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=f"부가세 처리 방식 불일치로 다운로드할 수 없습니다: {e}")
        return [(바이트, None)]

    cur.execute("SELECT * FROM 단가마스터")
    단가행 = cur.fetchall()
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    단가맵 = billing.build_단가맵(단가df)

    # 부가세구분은 조 그룹마다 다시 판정하지 않고 인보이스 전체 기준으로 한 번만 결정한다(부가세
    # 취급은 인보이스 단위 결정이라는 원칙). "최종" 구분 행은 작업명이 비어 있어(정렬행_원본목록 참고)
    # 조 그룹 단위로는 판정할 수 없으므로, 같이 저장돼 있는 "원본" 구분 행의 작업명을 대신 쓴다
    # (2026-08-04 — 기본단가 행이 없는 거래처는 항상 "별도"로 잘못 계산되던 버그 수정).
    cur.execute(
        "SELECT DISTINCT 작업명 FROM 거래명세서_품목 WHERE 거래명세서번호=%s AND 구분='원본'",
        (거래명세서번호,),
    )
    작업명목록 = [r["작업명"] for r in cur.fetchall()]
    부가세구분맵 = {}
    for 작업 in (작업명목록 or [None]):
        rates = (
            단가맵.get((거래명세서["거래처명"], 업무명, 작업))
            or 단가맵.get((거래명세서["거래처명"], 업무명, None))
            or 단가맵.get((거래명세서["거래처명"], None, None))
            or {}
        )
        부가세구분맵[작업] = rates.get("부가세구분") or "별도"
    try:
        부가세구분 = billing.결정_부가세구분(부가세구분맵)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"부가세 처리 방식 불일치로 다운로드할 수 없습니다: {e}")

    그룹순서 = []
    그룹맵 = {}
    for r in 저장된_최종:
        key = r["조"] or None
        if key not in 그룹맵:
            그룹맵[key] = []
            그룹순서.append(key)
        그룹맵[key].append(r)

    시트_목록 = []
    for 조 in 그룹순서:
        품목행목록 = [
            {
                "코드": r["코드"],
                "표시품명": r["품목"],
                "수량": float(r["수량"]),
                "단가": float(r["단가"]) if r["단가"] is not None else None,
                "금액": float(r["금액"]),
            }
            for r in 그룹맵[조]
        ]
        그룹공급가액 = sum(x["금액"] for x in 품목행목록)
        그룹세액, _ = billing.부가세_계산(부가세구분, 그룹공급가액)
        바이트 = billing.write_거래명세서_excel(
            품목행목록, 그룹공급가액, 그룹세액, 거래명세서["거래처명"], 업무명, 발행일
        )
        시트_목록.append((바이트, 조))

    return 시트_목록


@app.get("/거래명세서엑셀/{no}", dependencies=인증필요)
def 거래명세서엑셀(no: str):
    """
    거래명세서 Excel 파일 생성·다운로드. 발행 시점에만 만들 수 있던 app.py 세션 임시저장 방식과
    달리, 발행완료 건이면 언제든 재호출 가능.

    묶음번호가 있으면(2026-07-29~2026-08-01에 조별로 각각 채번·저장됐던 예전 발행 건 — 하위호환
    전용, 새 건은 이 값이 절대 안 생김) 같은 묶음번호를 가진 형제 거래명세서 전부를 각각
    _거래명세서_엑셀_바이트()로 만들어 합친다. 묶음번호가 없으면(2026-08-01부터의 모든 새 건 +
    조를 아예 안 쓰는 기존 건) _거래명세서_엑셀_시트목록()으로 이 거래명세서 1건이 가진 품목들을
    "조" 값 기준으로 나눠 시트를 만든다. 두 경우 모두 billing.combine_거래명세서_시트들()로
    최종 워크북(여러 시트)을 만든다(시트가 1개뿐이면 그 파일 그대로 반환).

    경로 파라미터명은 'no'(영문 고정) — Starlette가 중괄호 경로 파라미터명에 한글을 쓰면
    내부 정규식이 이를 인식 못 해 라우팅 자체가 항상 404로 실패하는 문제가 있어(실측 확인),
    다른 경로들(/단가마스터/{id} 등)과 동일하게 영문 파라미터명으로 통일함.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 묶음번호 FROM 거래명세서 WHERE 거래명세서번호=%s", (no,))
            거래명세서 = cur.fetchone()
            if not 거래명세서:
                raise HTTPException(status_code=404, detail="거래명세서번호를 찾을 수 없습니다")

            묶음번호 = 거래명세서["묶음번호"]
            if 묶음번호:
                cur.execute(
                    "SELECT 거래명세서번호, 시트명 FROM 거래명세서 WHERE 묶음번호=%s ORDER BY 등록일, 거래명세서번호",
                    (묶음번호,),
                )
                형제목록 = cur.fetchall()
                시트_목록 = [
                    (_거래명세서_엑셀_바이트(cur, r["거래명세서번호"]), r["시트명"])
                    for r in 형제목록
                ]
            else:
                시트_목록 = _거래명세서_엑셀_시트목록(cur, no)

    엑셀바이트 = billing.combine_거래명세서_시트들(시트_목록)
    if 엑셀바이트 is None:
        raise HTTPException(status_code=500, detail="Excel 생성 실패 — 해당 업무의뢰서에 등록된 단가가 없을 수 있습니다")

    return Response(
        content=엑셀바이트,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{no}.xlsx"'},
    )


@app.get("/거래명세서품목이력/{no}", dependencies=인증필요)
def 거래명세서품목이력(no: str):
    """
    편집(규칙 적용·수동 수정)을 거쳐 발행된 거래명세서의 원본(자동계산)·최종(실제 확정) 품목
    스냅샷을 나란히 비교할 수 있게 반환 — 확정 시점에 POST /거래명세서요청이 거래명세서_품목에
    저장해둔 이력을 읽기만 한다(2026-07-22 신규, 사용자 요청: "원본과 수정본의 차이 이력관리는
    어떻게 관리하지?" → 저장은 되지만 조회 화면이 없다는 걸 확인 후 추가).

    경로 파라미터명은 'no'(영문 고정) — GET /거래명세서엑셀/{no}와 동일한 이유(SKILL-13).
    이 기능 이전에 발행됐거나 편집 없이 원본 그대로 발행된 건은 거래명세서_품목에 저장된 행이
    없으므로 원본·최종 모두 빈 배열로 반환한다(버튼 자체를 편집여부=1인 건에만 노출하므로
    정상 경로에서는 거의 발생하지 않음).
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 편집여부 FROM 거래명세서 WHERE 거래명세서번호=%s", (no,))
            거래명세서 = cur.fetchone()
            if not 거래명세서:
                raise HTTPException(status_code=404, detail="거래명세서번호를 찾을 수 없습니다")

            cur.execute(
                "SELECT 구분, 코드, 품목, 작업명, 수량, 단가, 금액 FROM 거래명세서_품목 "
                "WHERE 거래명세서번호=%s ORDER BY 구분, 순서",
                (no,),
            )
            품목행목록 = cur.fetchall()

    원본 = [r for r in 품목행목록 if r["구분"] == "원본"]
    최종 = [r for r in 품목행목록 if r["구분"] == "최종"]
    for r in 원본 + 최종:
        del r["구분"]

    return {"편집여부": bool(거래명세서["편집여부"]), "원본": 원본, "최종": 최종}


class 거래명세서미리보기_요청(BaseModel):
    model_config = ConfigDict(title="InvoicePreviewRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    의뢰서번호_목록: List[str]


@app.post("/거래명세서미리보기", dependencies=인증필요)
def 거래명세서미리보기(요청: 거래명세서미리보기_요청):
    """
    아직 채번 전인 의뢰서번호_목록으로 원본 품목(왼쪽 표)을 미리 계산하고, 그 거래처+업무명에
    저장된 청구품목규칙이 있으면 적용해 고객사 청구 명세서 초안(오른쪽 표)까지 함께 반환
    (Excel 생성 없음, DB 쓰기 없음). GET /거래명세서엑셀/{no}와 DB 조회 패턴은 동일하지만,
    이미 발급된 거래명세서번호 대신 화면에서 방금 체크한 의뢰서번호를 직접 받는다는 점만 다르다.
    billing.build_품목행()·정렬행_원본목록()·적용_규칙()을 재사용
    (2026-07-20 최초 작성, 2026-07-22 규칙엔진 확장 — [거래명세서편집_규칙엔진] 착수 순서 3).
    """
    if not 요청.의뢰서번호_목록:
        raise HTTPException(status_code=400, detail="의뢰서번호_목록이 비어 있습니다")

    with get_db() as conn:
        with conn.cursor() as cur:
            자리표시자 = ", ".join(["%s"] * len(요청.의뢰서번호_목록))
            cur.execute(
                f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 확정청구페이지, 건수, 장수 "
                f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                요청.의뢰서번호_목록,
            )
            원본행 = cur.fetchall()

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 요청.의뢰서번호_목록)

            if not 원본행:
                raise HTTPException(status_code=404, detail="해당 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")

            df_all = pd.DataFrame(원본행)
            단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
            자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

            단가맵 = billing.build_단가맵(단가df)
            자재map = billing.build_자재map(자재df)
            의뢰서번호셋 = {int(float(x)) for x in 요청.의뢰서번호_목록}

            정렬행, 총합계, 거래처명, 업무명, 코드맵, 부가세구분맵 = billing.build_품목행(df_all, 단가맵, 자재map, 의뢰서번호셋)
            if not 정렬행:
                raise HTTPException(status_code=500, detail="미리보기 생성 실패 — 해당 업무의뢰서에 등록된 단가가 없을 수 있습니다")

            원본목록 = billing.정렬행_원본목록(정렬행, 코드맵)
            규칙목록 = _규칙_조회(cur, 거래처명, 업무명)

    if 규칙목록:
        규칙적용결과, 미분류 = billing.적용_규칙(원본목록, 규칙목록)
        # 매칭된 원본 항목이 하나도 없는 규칙은 결과에서 제외한다(2026-08-01, 실사용 제보: "쓰레기
        # 값" — 이번 선택과 무관한 저장된 규칙까지 수량0·금액0인 빈 줄로 노출되는 문제 방지).
        # billing.적용_규칙()은 규칙 개수만큼 결과를 무조건 1개씩 만드는 구조(줄 순서를 규칙목록과
        # 인덱스로 맞추기 위함)라 필터링은 이 호출부에서 담당 — 규칙적용결과·규칙목록을 반드시
        # 같이 걸러내 인덱스 대응을 유지한다(InvoicePreviewDialog.tsx가 둘을 인덱스로 1:1 매칭해서 씀).
        유지 = [i for i, r in enumerate(규칙적용결과) if r["수량"] != 0 or r["금액"] != 0]
        규칙적용결과 = [규칙적용결과[i] for i in 유지]
        규칙목록 = [규칙목록[i] for i in 유지]
    else:
        규칙적용결과, 미분류 = [], []

    # 프론트가 세액을 무조건 공급가액×10%로 가정하지 않도록, 실제로 청구된 작업명들의 부가세구분을
    # 판정해 함께 내려준다(편집으로 공급가액이 바뀌어도 프론트가 이 값 기준으로 재계산, 2026-07-28).
    # 작업명끼리 포함/별도가 섞여 있으면(2026-08-04, 기본단가 행이 없는 거래처는 항상 "별도"로
    # 잘못 계산되던 버그로 발견) 부가세구분=None + 부가세오류 메시지를 내려 프론트가 발급을 막는다.
    try:
        부가세구분 = billing.결정_부가세구분(부가세구분맵)
        부가세오류 = None
    except ValueError as e:
        부가세구분 = None
        부가세오류 = str(e)

    return {
        "거래처명": 거래처명,
        "업무명": 업무명,
        "부가세구분": 부가세구분,
        "부가세오류": 부가세오류,
        "품목": [
            {"코드": row["코드"], "품목": row["품목"], "작업명": row["작업명"],
             "수량": row["수량"], "단가": row["단가"], "금액": row["금액"]}
            for row in 원본목록
        ],
        "규칙적용결과": [
            {"최종청구품명": row["표시품명"], "코드": row["코드"] or None,
             "수량": row["수량"], "단가": row["단가"], "금액": row["금액"], "조": row.get("조")}
            for row in 규칙적용결과
        ],
        "미분류": [
            {"코드": row["코드"], "품목": row["품목"], "작업명": row["작업명"],
             "수량": row["수량"], "단가": row["단가"], "금액": row["금액"]}
            for row in 미분류
        ],
        # 규칙목록(순서·최종청구품명·조건·조) — 프론트가 GET /청구품목규칙로 따로 재조회하지 않고
        # 이 응답을 그대로 써서 규칙적용결과와 인덱스 1:1 대응을 유지한다(2026-08-01, 별도
        # 왕복 없이 한 번의 응답으로 끝내도록 단순화).
        "규칙목록": [
            {"순서": r["순서"], "최종청구품명": r["최종청구품명"], "조건": r["조건"], "조": r.get("조")}
            for r in 규칙목록
        ],
        "총합계": round(총합계),
    }


class 청구품목규칙_행(BaseModel):
    model_config = ConfigDict(title="BillingRuleRow")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    순서: int
    최종청구품명: str
    조건: dict  # {"or": [{"and": [{"field","op","value"}, ...]}, ...]} — {"or": []}이면 전체 매칭
    조: Optional[str] = None  # 조별 분할발급 시트명(2026-07-29) — 없으면 미지정(하위호환)


@app.get("/청구품목규칙", dependencies=인증필요)
def 청구품목규칙_목록(거래처명: str = Query(...), 업무명: str = Query(...)):
    """거래처명+업무명으로 저장된 재사용 청구 규칙 목록 조회(없으면 빈 배열) — 미리보기 화면이
    같은 거래처+업무명을 다시 열 때 저장된 규칙을 자동으로 불러오는 용도(2026-07-22 신규)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            return _규칙_조회(cur, 거래처명, 업무명)


class 청구품목규칙_저장요청(BaseModel):
    model_config = ConfigDict(title="BillingRuleSaveRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래처명: str
    업무명: str
    규칙목록: List[청구품목규칙_행]


@app.put("/청구품목규칙", dependencies=인증필요)
def 청구품목규칙_저장(요청: 청구품목규칙_저장요청):
    """그 거래처+업무명의 규칙 전체를 통째로 교체 저장 — 미리보기에서 조건식을 새로 만들거나 고칠
    때마다 프론트가 호출(2026-07-22 신규). /거래명세서요청도 확정 시 같은 로직으로 규칙을 저장한다."""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                _규칙_저장(cur, 요청.거래처명, 요청.업무명, [r.model_dump() for r in 요청.규칙목록])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"규칙 저장 실패: {e}")
    return {"status": "ok", "저장건수": len(요청.규칙목록)}


# ── 거래처마스터 쓰기 API ──────────────────────────────────────

class 거래처행(BaseModel):
    model_config = ConfigDict(title="ClientCreateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래처명: str
    사업자등록번호: Optional[str] = None
    수신이메일: Optional[str] = None
    비고: Optional[str] = None
    등록일: Optional[str] = None
    수정일: Optional[str] = None


@app.post("/거래처마스터", dependencies=인증필요)
def 거래처마스터_추가(거래처: 거래처행):
    """거래처 1건 신규 등록. 거래처명은 PK라 생성 후 변경 불가(PUT에서 필드 자체를 안 받음) —
    단가마스터·거래명세서·운영통계자료가 거래처명을 FK 없이 문자열로만 참조하고 있어,
    이름이 바뀌면 기존 연결이 조용히 끊어지는 위험을 API 단에서부터 차단한다."""
    거래처명 = (거래처.거래처명 or "").strip()
    if not 거래처명:
        raise HTTPException(status_code=400, detail="거래처명은 필수입니다")
    from datetime import date
    오늘 = str(date.today())
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO 거래처마스터 (거래처명, 사업자등록번호, 수신이메일, 비고, 등록일, 수정일)
                    VALUES (%s,%s,%s,%s,%s,%s)
                """, (거래처명, 거래처.사업자등록번호, 거래처.수신이메일, 거래처.비고,
                      거래처.등록일 or 오늘, 거래처.수정일 or 오늘))
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 존재하는 거래처명입니다")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")
    return {"status": "ok"}


class 거래처행_수정(BaseModel):
    model_config = ConfigDict(title="ClientUpdateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    사업자등록번호: Optional[str] = None
    수신이메일: Optional[str] = None
    비고: Optional[str] = None


@app.put("/거래처마스터/{name}", dependencies=인증필요)
def 거래처마스터_수정_요청(name: str, 거래처: 거래처행_수정):
    """거래처 1건 수정 — 사업자등록번호·수신이메일·비고만 변경 가능, 거래처명은 요청 바디에
    필드 자체가 없어 API 레벨에서부터 변경 불가."""
    from datetime import date
    오늘 = str(date.today())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE 거래처마스터
                SET 사업자등록번호=%s, 수신이메일=%s, 비고=%s, 수정일=%s
                WHERE 거래처명=%s
            """, (거래처.사업자등록번호, 거래처.수신이메일, 거래처.비고, 오늘, name))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 거래처명이 없습니다")
    return {"status": "ok"}


@app.delete("/거래처마스터", dependencies=인증필요)
def 거래처마스터_삭제(거래처명: List[str] = Query(...)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 거래처마스터 WHERE 거래처명=%s", [(n,) for n in 거래처명])
    return {"status": "ok", "삭제요청건수": len(거래처명)}


# ── 단가마스터 쓰기 API ────────────────────────────────────────

class 단가마스터_신규(BaseModel):
    model_config = ConfigDict(title="PricingCreateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래처명: str
    업무명: Optional[str] = None
    작업명: Optional[str] = None
    출력단가: float = 0
    봉입단가: float = 0
    추가봉입단가: float = 0
    동봉물삽입단가: float = 0
    용지제작단가: float = 0
    봉투제작단가: float = 0
    삽지제작단가: float = 0
    각대대봉투단가: float = 0
    각대대봉투봉입단가: float = 0
    부가세구분: Literal["포함", "별도"] = "별도"
    비고: Optional[str] = None


@app.post("/단가마스터", dependencies=인증필요)
def 단가마스터_추가(단가: 단가마스터_신규):
    from datetime import date
    오늘 = str(date.today())
    # 작업명이 NULL인 "기본단가"(거래처 전체 기본단가: 업무명도 NULL / 업무명 단위 기본단가: 업무명만 있음)는
    # DB UNIQUE(거래처명,업무명,작업명) 제약이 NULL끼리는 서로 다른 값으로 취급해 중복을 못 막는다
    # — 작업명이 NULL인 모든 경우를 이 체크 하나로 커버(업무명은 <=>로 NULL-세이프 비교).
    if 단가.작업명 is None:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM 단가마스터 WHERE 거래처명=%s AND 업무명 <=> %s AND 작업명 IS NULL",
                    (단가.거래처명, 단가.업무명),
                )
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="이미 등록된 기본단가가 있습니다")
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO 단가마스터
                        (거래처명, 업무명, 작업명, 출력단가, 봉입단가, 추가봉입단가, 동봉물삽입단가,
                         용지제작단가, 봉투제작단가, 삽지제작단가, 각대대봉투단가, 각대대봉투봉입단가,
                         부가세구분, 비고, 등록일, 수정일)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (단가.거래처명, 단가.업무명, 단가.작업명, 단가.출력단가, 단가.봉입단가, 단가.추가봉입단가, 단가.동봉물삽입단가,
                      단가.용지제작단가, 단가.봉투제작단가, 단가.삽지제작단가, 단가.각대대봉투단가, 단가.각대대봉투봉입단가,
                      단가.부가세구분, 단가.비고, 오늘, 오늘))
                새_id = cur.lastrowid
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="동일한 거래처명·업무명·작업명 조합이 이미 존재합니다")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")
    return {"status": "ok", "id": 새_id}


class 단가마스터_수정(BaseModel):
    model_config = ConfigDict(title="PricingUpdateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    출력단가: float = 0
    봉입단가: float = 0
    추가봉입단가: float = 0
    동봉물삽입단가: float = 0
    용지제작단가: float = 0
    봉투제작단가: float = 0
    삽지제작단가: float = 0
    각대대봉투단가: float = 0
    각대대봉투봉입단가: float = 0
    부가세구분: Literal["포함", "별도"] = "별도"
    비고: Optional[str] = None


@app.put("/단가마스터/{id}", dependencies=인증필요)
def 단가마스터_수정_요청(id: int, 단가: 단가마스터_수정):
    from datetime import date
    오늘 = str(date.today())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE 단가마스터
                SET 출력단가=%s, 봉입단가=%s, 추가봉입단가=%s, 동봉물삽입단가=%s,
                    용지제작단가=%s, 봉투제작단가=%s, 삽지제작단가=%s,
                    각대대봉투단가=%s, 각대대봉투봉입단가=%s, 부가세구분=%s, 비고=%s, 수정일=%s
                WHERE id=%s
            """, (단가.출력단가, 단가.봉입단가, 단가.추가봉입단가, 단가.동봉물삽입단가,
                  단가.용지제작단가, 단가.봉투제작단가, 단가.삽지제작단가,
                  단가.각대대봉투단가, 단가.각대대봉투봉입단가, 단가.부가세구분, 단가.비고, 오늘, id))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 id의 단가가 없습니다")
    return {"status": "ok"}


@app.delete("/단가마스터", dependencies=인증필요)
def 단가마스터_삭제(id: List[int] = Query(...)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 단가마스터 WHERE id=%s", [(i,) for i in id])
    return {"status": "ok", "삭제요청건수": len(id)}


# ── 거래명세서요청/발행 쓰기 API ─────────────────────────────────

def _발급_거래명세서번호(cur, 사업부: str) -> str:
    """사업부·연월 단위로 순번을 증가시켜 거래명세서번호를 발급 (취소돼도 재사용하지 않음) — app.py와 동일 로직"""
    from datetime import date
    사업부코드 = "D" if 사업부 == "DM사업부" else "N"
    연월 = date.today().strftime("%Y%m")
    cur.execute("SELECT 마지막순번 FROM 거래명세서번호_카운터 WHERE 사업부=%s AND 연월=%s", (사업부, 연월))
    row = cur.fetchone()
    다음순번 = (row["마지막순번"] + 1) if row else 1
    cur.execute("""
        INSERT INTO 거래명세서번호_카운터 (사업부, 연월, 마지막순번) VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE 마지막순번=VALUES(마지막순번)
    """, (사업부, 연월, 다음순번))
    return f"{사업부코드}-{연월}-{다음순번:05d}"


class 품목행_입력(BaseModel):
    model_config = ConfigDict(title="InvoiceItemRowInput")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    코드: Optional[str] = None
    품목: str  # 원본이면 품목명, 규칙/수동 편집 결과면 최종청구품명
    수량: float
    단가: Optional[float] = None  # 병합된 항목의 단가가 갈리면 None("—")
    금액: float
    조: Optional[str] = None  # 조별 분할발급(2026-07-29) — 없으면 거래명세서 1건(하위호환)


class 거래명세서요청_요청(BaseModel):
    model_config = ConfigDict(title="InvoiceRequestBody")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래처명: str
    사업부: str
    담당자: str
    품목: str
    공급가액: float
    세액: float
    합계: float
    의뢰서번호_목록: List[str]
    업무명: Optional[str] = None                    # 규칙 저장 시 거래처명과 함께 규칙의 소속 키로 사용
    품목_최종: Optional[List[품목행_입력]] = None  # 미리보기 오른쪽 표를 사람이 최종 확정한 내용
    규칙: Optional[List[청구품목규칙_행]] = None    # 이번에 새로 만들거나 고친 조건식 규칙 — 있으면 저장/재사용


@app.post("/거래명세서요청", dependencies=인증필요)
def 거래명세서요청(요청: 거래명세서요청_요청):
    """
    금액(공급가액·세액·합계)은 app.py가 calc_공급가맵()으로 이미 계산해서 보낸 값을 그대로 저장한다.
    (일반봉투/각대대봉투 구분에 필요한 자재형태 데이터가 아직 MariaDB에 없어, 계산 자체는 당분간 app.py가 담당 — A안)

    품목_최종을 함께 보내면(Next.js 탭4 미리보기 편집 화면 전용) 서버가 원본을 다시 계산해 비교하고
    다르면 편집여부=1로 저장하며, 원본·최종 스냅샷을 거래명세서_품목에 남긴다(이력 보존).
    규칙을 함께 보내면 그 거래처+업무명의 청구품목규칙도 함께 갱신해 다음 명세서부터 재사용된다
    (2026-07-22, [거래명세서편집_규칙엔진] 착수 순서 3).

    원본은 품목_최종 여부와 무관하게 항상 재계산한다 — 이번에 청구되는 작업명들의 부가세구분
    (포함/별도)이 서로 다르면 발급 자체를 400으로 막는다(2026-08-04, 기본단가 행이 없는 거래처는
    항상 "별도"로 잘못 계산되던 버그 수정 — billing.결정_부가세구분() 참고).

    거래명세서는 항상 1건만 생성한다(2026-08-01) — 품목_최종의 각 행에 실린 "조"는
    거래명세서_품목에 그대로 저장해두고, 다운로드 시점(GET /거래명세서엑셀/{no})에 그 값으로
    시트를 나눠 통합 엑셀을 만드는 데만 쓴다. (2026-07-29~2026-08-01엔 조가 2개 이상이면
    거래명세서 자체를 조 개수만큼 각각 채번·저장했었으나, 실사용 중 "발행요청목록에 번호가
    여러 개 생겨 불편하다"는 피드백으로 변경 — 그 시절 만들어진 기존 발행 건은
    `거래명세서.묶음번호`로 여전히 인식·다운로드된다, GET /거래명세서엑셀/{no} 참고.)
    """
    if not 요청.의뢰서번호_목록:
        raise HTTPException(status_code=400, detail="의뢰서번호_목록이 비어 있습니다")

    # 사업부 혼합 방어 검증 (2026-07-19 신규) — 프론트도 검증하지만 서버가 최종 방어선.
    # HTTPException도 Exception의 서브클래스라 아래 try/except 블록 안에서 raise하면 500으로
    # 감싸여버리므로, 반드시 이 블록 밖에서 먼저 검증한다.
    with get_db() as conn:
        with conn.cursor() as cur:
            자리표시자 = ", ".join(["%s"] * len(요청.의뢰서번호_목록))
            cur.execute(
                f"SELECT DISTINCT 사업부 FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                요청.의뢰서번호_목록,
            )
            사업부목록 = [r["사업부"] for r in cur.fetchall()]
    if len(사업부목록) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"선택한 의뢰서의 사업부가 서로 다릅니다({', '.join(사업부목록)}). 사업부를 통일해서 요청해 주세요.",
        )

    if 요청.규칙 is not None and not 요청.업무명:
        raise HTTPException(status_code=400, detail="규칙을 저장하려면 업무명이 필요합니다")

    # 원본을 항상 다시 계산한다(서버가 직접 재계산 — 화면에서 보낸 "원본"을 그대로 믿지 않음, 조작
    # 방지 겸 정합성 보장). 품목_최종이 왔으면 편집여부 판정·거래명세서_품목 저장에도 재사용하고,
    # 어느 경우든 부가세구분 일관성 검증에 쓴다(2026-08-04 — 예전엔 품목_최종이 없으면 이 계산을
    # 건너뛰어 부가세 검증이 전혀 없었음).
    with get_db() as conn:
        with conn.cursor() as cur:
            자리표시자 = ", ".join(["%s"] * len(요청.의뢰서번호_목록))
            cur.execute(
                f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 확정청구페이지, 건수, 장수 "
                f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                요청.의뢰서번호_목록,
            )
            원본행 = cur.fetchall()
            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 요청.의뢰서번호_목록)

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])
    단가맵 = billing.build_단가맵(단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 요청.의뢰서번호_목록}
    정렬행, _총, _거래처, _업무, 코드맵, 부가세구분맵 = billing.build_품목행(df_all, 단가맵, 자재map, 의뢰서번호셋)
    원본목록 = billing.정렬행_원본목록(정렬행, 코드맵)

    try:
        billing.결정_부가세구분(부가세구분맵)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    최종목록 = [
        {"코드": r.코드 or "", "표시품명": r.품목, "수량": r.수량, "단가": r.단가,
         "금액": round(r.금액, 2), "조": r.조 or None}
        for r in (요청.품목_최종 or [])
    ]

    def _비교키(row):
        return (row.get("코드") or "", row.get("표시품명") or "", round(row.get("수량", 0), 2), row.get("단가"), round(row.get("금액", 0), 2))

    편집여부 = 0
    if 요청.품목_최종 is not None:
        원본_비교 = [_비교키(r) for r in 원본목록]
        최종_비교 = [_비교키(r) for r in 최종목록]
        편집여부 = 1 if 원본_비교 != 최종_비교 else 0

    from datetime import date
    오늘 = str(date.today())

    품목_삽입_sql = """
        INSERT INTO 거래명세서_품목
            (거래명세서번호, 구분, 순서, 코드, 품목, 작업명, 조, 수량, 단가, 금액)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                거래명세서번호 = _발급_거래명세서번호(cur, 요청.사업부)
                cur.execute("""
                    INSERT INTO 거래명세서
                        (거래명세서번호, 거래처명, 담당자, 발행일자, 품목, 공급가액, 세액, 합계, 발송여부, 편집여부, 등록일)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s, NOW())
                """, (거래명세서번호, 요청.거래처명, 요청.담당자, 오늘, 요청.품목,
                      요청.공급가액, 요청.세액, 요청.합계, 편집여부))

                cur.executemany(
                    "INSERT INTO 거래명세서_의뢰서 (거래명세서번호, 업무의뢰서번호) VALUES (%s, %s)",
                    [(거래명세서번호, n) for n in 요청.의뢰서번호_목록]
                )

                if 요청.품목_최종 is not None:
                    cur.executemany(품목_삽입_sql, [
                        (거래명세서번호, "원본", i, r["코드"], r.get("품목"), r.get("작업명"), None, r["수량"], r["단가"], r["금액"])
                        for i, r in enumerate(원본목록)
                    ])
                    cur.executemany(품목_삽입_sql, [
                        (거래명세서번호, "최종", i, r["코드"] or None, r["표시품명"], None, r["조"], r["수량"], r["단가"], r["금액"])
                        for i, r in enumerate(최종목록)
                    ])

                if 요청.규칙 is not None:
                    _규칙_저장(cur, 요청.거래처명, 요청.업무명, [r.model_dump() for r in 요청.규칙])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"거래명세서 요청 실패: {e}")

    return {
        "status": "ok",
        "거래명세서번호": 거래명세서번호,
        "편집여부": 편집여부,
    }


class 거래명세서번호_요청(BaseModel):
    model_config = ConfigDict(title="InvoiceNumberRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래명세서번호: str


@app.post("/거래명세서발행", dependencies=인증필요)
def 거래명세서발행(요청: 거래명세서번호_요청):
    """발송여부=1(발행완료)로 변경. Excel 생성은 app.py가 로컬에서 그대로 담당."""
    from datetime import date
    오늘 = str(date.today())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE 거래명세서 SET 발송여부=1, 발송일=%s WHERE 거래명세서번호=%s",
                (오늘, 요청.거래명세서번호)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 거래명세서번호가 없습니다")
    return {"status": "ok", "거래명세서번호": 요청.거래명세서번호}


@app.post("/거래명세서발행취소", dependencies=인증필요)
def 거래명세서발행취소(요청: 거래명세서번호_요청):
    """발송여부=0(발행대기)으로 되돌림 — app.py의 '발행 취소'(되돌리기) 버튼에 대응 (계획엔 없었으나 동일 테이블 UPDATE라 함께 추가)"""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE 거래명세서 SET 발송여부=0, 발송일=NULL WHERE 거래명세서번호=%s",
                (요청.거래명세서번호,)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 거래명세서번호가 없습니다")
    return {"status": "ok", "거래명세서번호": 요청.거래명세서번호}


class 거래명세서부분취소_요청(BaseModel):
    model_config = ConfigDict(title="InvoicePartialCancelRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래명세서번호: str
    의뢰서번호_목록: List[str]


@app.post("/거래명세서부분취소", dependencies=인증필요)
def 거래명세서부분취소(요청: 거래명세서부분취소_요청):
    """
    거래명세서_의뢰서 중 선택한 의뢰서번호만 취소한다(app.py의 "취소" 버튼·부분취소 다이얼로그에 대응,
    2026-07-19 신규). 남는 의뢰서가 0건이면 거래명세서 행 자체를 DELETE(FK가 ON DELETE CASCADE라
    거래명세서_의뢰서도 자동 정리됨 → 미발행 목록으로 자연 복귀). 1건 이상 남으면 취소분만
    거래명세서_의뢰서에서 삭제하고 품목·담당자·공급가액·세액·합계를 재계산해 UPDATE한다.

    거래명세서_의뢰서는 의뢰서 단위 행이라 체크한 만큼만 정확히 취소되므로(발행/발행취소와 달리)
    "다른 의뢰서와 함께 처리됩니다" 같은 안내가 필요 없다.
    """
    if not 요청.의뢰서번호_목록:
        raise HTTPException(status_code=400, detail="의뢰서번호_목록이 비어 있습니다")

    # ── 사전 검증 (HTTPException은 반드시 아래 try/except 밖에서 raise —
    #     /거래명세서요청의 사업부 검증과 동일 관례, 안 그러면 500으로 감싸여버림) ──
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 발송여부, 편집여부 FROM 거래명세서 WHERE 거래명세서번호=%s", (요청.거래명세서번호,))
            헤더 = cur.fetchone()
            if not 헤더:
                raise HTTPException(status_code=404, detail="해당 거래명세서번호가 없습니다")
            if 헤더["발송여부"] == 1:
                raise HTTPException(
                    status_code=400,
                    detail="이미 발행완료된 거래명세서는 취소할 수 없습니다. 먼저 발행 취소(되돌리기)를 진행해 주세요.",
                )

            cur.execute("SELECT 업무의뢰서번호 FROM 거래명세서_의뢰서 WHERE 거래명세서번호=%s", (요청.거래명세서번호,))
            기존_목록 = [r["업무의뢰서번호"] for r in cur.fetchall()]

    취소_대상 = set(요청.의뢰서번호_목록)
    미포함 = 취소_대상 - set(기존_목록)
    if 미포함:
        raise HTTPException(
            status_code=400,
            detail=f"이 거래명세서번호에 속하지 않는 의뢰서번호가 포함되어 있습니다: {', '.join(sorted(미포함))}",
        )

    남을_목록 = [n for n in 기존_목록 if n not in 취소_대상]

    # 편집된(자동계산과 다르게 확정된) 거래명세서는 일부만 남기는 부분취소를 막는다(사용자 확정 사항) —
    # 전체 의뢰서를 다 선택해서 남을_목록이 비면(=전체취소) 아래 DELETE 분기로 그대로 진행 허용.
    if 헤더.get("편집여부") and 남을_목록:
        raise HTTPException(
            status_code=400,
            detail="편집된 거래명세서는 부분취소할 수 없습니다. 전체 의뢰서를 선택해 전체취소해 주세요.",
        )

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                if not 남을_목록:
                    cur.execute("DELETE FROM 거래명세서 WHERE 거래명세서번호=%s", (요청.거래명세서번호,))
                    return {"status": "ok", "action": "delete",
                            "거래명세서번호": 요청.거래명세서번호, "남은건수": 0}

                자리표시자 = ", ".join(["%s"] * len(취소_대상))
                cur.execute(
                    f"DELETE FROM 거래명세서_의뢰서 WHERE 거래명세서번호=%s AND 업무의뢰서번호 IN ({자리표시자})",
                    [요청.거래명세서번호, *취소_대상],
                )

                남을_자리표시자 = ", ".join(["%s"] * len(남을_목록))
                cur.execute(
                    f"SELECT 업무의뢰서번호, 거래처명, 업무명, 업무명상세, 작업명, 사업부, 연월, 날짜, "
                    f"마케팅담당자, 확정청구페이지, 건수, 출력페이지, 장수 FROM 운영통계자료 "
                    f"WHERE 업무의뢰서번호 IN ({남을_자리표시자})",
                    남을_목록,
                )
                원본행 = cur.fetchall()
                cur.execute("SELECT * FROM 단가마스터")
                단가행 = cur.fetchall()
                자재행 = _자재map_조회(cur, 남을_목록)

                df_남을 = pd.DataFrame(원본행)
                단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
                자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(
                    columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

                summary = billing.build_의뢰서_summary(df_남을, 자재df)
                단가맵 = billing.build_단가맵(단가df)
                자재map = billing.build_자재map(자재df)
                남을_번호셋 = {int(float(x)) for x in 남을_목록}
                공급가맵 = billing.calc_공급가맵(df_남을, 단가맵, 자재map, 남을_번호셋)

                공급가액 = round(sum(v["합계"] for v in 공급가맵.values()))
                병합_부가세구분맵 = {}
                for v in 공급가맵.values():
                    병합_부가세구분맵.update(v.get("부가세구분맵", {}))
                try:
                    부가세구분 = billing.결정_부가세구분(병합_부가세구분맵)
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=str(e))
                세액, 합계 = billing.부가세_계산(부가세구분, 공급가액)
                품목 = ", ".join(sorted(set(summary["업무명"])))
                담당자 = ", ".join(sorted(set(summary["마케팅담당자"])))

                cur.execute(
                    "UPDATE 거래명세서 SET 품목=%s, 담당자=%s, 공급가액=%s, 세액=%s, 합계=%s WHERE 거래명세서번호=%s",
                    (품목, 담당자, 공급가액, 세액, 합계, 요청.거래명세서번호),
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"부분취소 처리 실패: {e}")

    return {"status": "ok", "action": "update", "거래명세서번호": 요청.거래명세서번호, "남은건수": len(남을_목록)}


# ── 운영통계자료수신 요청/응답 스키마 ──────────────────────────────

class 운영통계행(BaseModel):
    model_config = ConfigDict(title="OperationRecord")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    마케팅담당자: str
    등록자: str
    업무명: str
    작업일자: str
    작업내역서번호: int
    작업내역서: str
    작업명: str
    작업내역서상세: Optional[str] = None
    반제품여부: Optional[str] = "N"
    P수: Optional[str] = None
    장수: int = 0
    건수: int = 0
    출력페이지: int = 0
    청구페이지: int = 0


class 자재행(BaseModel):
    model_config = ConfigDict(title="MaterialUsageRecord")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    작업내역서번호: int
    작업일자: str
    자재종류: str
    작업명: Optional[str] = None  # 2026-07-19 추가 — 아직 실제로 보내주는 곳 없음(API규격서.md 요청 메모 참고)
    자재명: Optional[str] = None  # 2026-07-19 추가 — 보내주면 merge_자재()가 _봉투종류()로 자동 분류
    자재형태: Optional[str] = None  # 2026-07-19 추가 — 이미 분류된 값(예: 일반봉투/각대대봉투, 향후 소·중·대봉투 등)을 직접 보내는 경우, 자재명보다 우선 적용
    사용량: int = 0


class 운영통계수신요청(BaseModel):
    # /docs(Swagger)의 "Example Value"가 자재사용현황=[] 기본값을 그대로 보여줘 자재명·자재형태 필드가
    # 안 보인다는 문제가 있었음(2026-07-19) — docs/API규격서.md 예시와 동일한 값으로 명시해 해결
    model_config = ConfigDict(
        title="OperationDataSubmitRequest",  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로
        json_schema_extra={
            "example": {
                "업무의뢰서번호": "93690",
                "운영통계": [{
                    "마케팅담당자": "강서윤",
                    "등록자": "강서윤",
                    "업무명": "정기청구서",
                    "작업일자": "2026-07-19 10:00:00",
                    "작업내역서번호": 12345,
                    "작업내역서": "거래처명 - 업무상세내용",
                    "작업명": "개인일반",
                    "작업내역서상세": "상세 설명 (선택)",
                    "반제품여부": "N",
                    "P수": "1P",
                    "장수": 100,
                    "건수": 50,
                    "출력페이지": 100,
                    "청구페이지": 100,
                }],
                "자재사용현황": [{
                    "작업내역서번호": 12345,
                    "작업일자": "2026-07-19",
                    "자재종류": "봉투",
                    "작업명": "개인일반",
                    "자재명": "일반봉투 100매",
                    "자재형태": "일반봉투",
                    "사용량": 50,
                }],
            }
        },
    )

    업무의뢰서번호: str
    운영통계: List[운영통계행]
    자재사용현황: List[자재행] = []


@app.post("/운영통계자료수신", dependencies=[Depends(auth.verify_api_key)])
def 운영통계자료수신(요청: 운영통계수신요청):
    """
    업무의뢰서 하나가 완료되면, 그 의뢰서에 속한 모든 작업내역 행 + 관련 자재사용량을 한 번에 수신.
    같은 업무의뢰서번호로 재전송되면 기존 데이터를 통째로 교체(삭제 후 재삽입)한다.
    """
    if not 요청.운영통계:
        raise HTTPException(status_code=400, detail="운영통계 배열이 비어 있습니다")

    df = pd.DataFrame([r.model_dump() for r in 요청.운영통계])
    df["업무의뢰서번호"] = 요청.업무의뢰서번호

    df = dt.apply_반제품_logic(df)
    df = dt.add_date_columns(df)
    df = dt.add_client_column(df)
    df = dt.add_사업부(df)

    if 요청.자재사용현황:
        자재df = pd.DataFrame([r.model_dump() for r in 요청.자재사용현황])
        자재df["업무의뢰서번호"] = int(요청.업무의뢰서번호)
        df, 자재_long = dt.merge_자재(df, 자재df)
    else:
        for col in ("봉투_사용량", "용지_사용량", "삽지_사용량", "미구분_사용량"):
            df[col] = 0
        자재_long = pd.DataFrame(columns=["업무의뢰서번호", "작업내역서번호", "작업일자", "자재종류", "자재형태", "사용량"])

    df = dt.apply_billing_logic(df)

    운영통계_값목록 = [dt.운영통계_행_변환(r) for _, r in df.iterrows()]
    자재_값목록 = [dt.자재_행_변환(r) for _, r in 자재_long.iterrows()]

    자리표시자 = ", ".join(["%s"] * len(dt.MARIADB_컬럼))
    운영통계_sql = f"INSERT INTO 운영통계자료 ({', '.join(dt.MARIADB_컬럼)}) VALUES ({자리표시자})"
    자재_sql = """
        INSERT INTO 자재사용현황 (업무의뢰서번호, 작업내역서번호, 작업명, 작업일자, 자재종류, 자재형태, 사용량)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM 운영통계자료 WHERE 업무의뢰서번호=%s", (요청.업무의뢰서번호,))
                cur.executemany(운영통계_sql, 운영통계_값목록)

                cur.execute("DELETE FROM 자재사용현황 WHERE 업무의뢰서번호=%s", (요청.업무의뢰서번호,))
                if 자재_값목록:
                    cur.executemany(자재_sql, 자재_값목록)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB 반영 실패: {e}")

    return {
        "status": "ok",
        "업무의뢰서번호": 요청.업무의뢰서번호,
        "운영통계_반영행수": len(df),
        "자재사용현황_반영행수": len(자재_값목록),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
