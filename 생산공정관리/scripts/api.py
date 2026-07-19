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
  POST /운영통계자료수신     — 당사 생산공정관리시스템 Push 수신 (업무의뢰서 단위, 실시간)

  POST   /거래처마스터       — 거래처 1건 신규 등록 (2026-07-19 전체교체→단건생성으로 변경, Next.js [4-D])
  PUT    /거래처마스터/{name} — 거래처 1건 수정 (사업자등록번호·수신이메일·비고만, 거래처명은 변경 불가)
  DELETE /거래처마스터       — 거래처명 목록으로 삭제
  POST   /단가마스터         — 단가 1건 신규 등록
  PUT    /단가마스터/{id}    — 단가 1건 수정
  DELETE /단가마스터         — id 목록으로 삭제
  POST   /거래명세서요청     — 채번 + 거래명세서/거래명세서_의뢰서 저장
  POST   /거래명세서발행     — 발송여부=1로 변경
  POST   /거래명세서발행취소 — 발송여부=0으로 되돌림 (원래 계획엔 없었으나 app.py에 이미 있는 기능이라 함께 추가)
  POST   /거래명세서부분취소 — 선택한 의뢰서만 취소, 0건 남으면 거래명세서 자체 삭제(CASCADE), 남으면 금액 재계산 UPDATE (2026-07-19 신규)

가공 로직은 scripts/data_transform.py, 금액 계산·Excel 생성은 scripts/billing.py 재사용
(둘 다 preprocess.py·app.py와 동일한 규칙 — 2026-07-19부터 자재형태 컬럼이 MariaDB에 반영되어
 계산·Excel 생성 로직을 app.py에서 billing.py로 옮기고 이 API에서도 함께 쓸 수 있게 됨).
API 요청/응답 규격 문서: docs/API규격서.md 참고
"""

import sys
from pathlib import Path
from contextlib import contextmanager
from typing import List, Optional

import pandas as pd
import pymysql
from fastapi import FastAPI, HTTPException, Query, Depends, Response
from pydantic import BaseModel

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
        세액 = round(공급가액 * 0.1)
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
                SELECT a.업무의뢰서번호, a.거래명세서번호, b.발송여부
                FROM 거래명세서_의뢰서 a
                JOIN 거래명세서 b ON a.거래명세서번호 = b.거래명세서번호
            """)
            발행행목록 = cur.fetchall()
            if not 발행행목록:
                return []
            발행맵 = {r["업무의뢰서번호"]: (r["거래명세서번호"], r["발송여부"]) for r in 발행행목록}

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
        거래명세서번호, 발송여부 = 발행맵[의뢰서번호]
        가격 = 공급가맵.get(int(float(의뢰서번호)))
        예상공급가액 = round(가격["합계"]) if (가격 and 가격["합계"] > 0) else None
        응답.append({
            "의뢰서번호": 의뢰서번호,
            "거래명세서번호": 거래명세서번호,
            "발송여부": int(발송여부),
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


@app.get("/거래명세서엑셀/{no}", dependencies=인증필요)
def 거래명세서엑셀(no: str):
    """
    거래명세서 Excel 파일 생성·다운로드 — billing.generate_거래명세서_excel() 재사용.
    발행 시점에만 만들 수 있던 app.py 세션 임시저장 방식과 달리, 발행완료 건이면 언제든 재호출 가능.

    경로 파라미터명은 'no'(영문 고정) — Starlette가 중괄호 경로 파라미터명에 한글을 쓰면
    내부 정규식이 이를 인식 못 해 라우팅 자체가 항상 404로 실패하는 문제가 있어(실측 확인),
    다른 경로들(/단가마스터/{id} 등)과 동일하게 영문 파라미터명으로 통일함.
    """
    거래명세서번호 = no
    with get_db() as conn:
        with conn.cursor() as cur:
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
                f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 확정청구페이지, 건수, 장수 "
                f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                의뢰서목록,
            )
            원본행 = cur.fetchall()

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 의뢰서목록)

    if not 원본행:
        raise HTTPException(status_code=404, detail="이 거래명세서의 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "사용량"])

    단가맵 = billing.build_단가맵(단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 의뢰서목록}

    from datetime import date
    발행일 = 거래명세서["발행일자"] or date.today()
    엑셀바이트 = billing.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일)
    if 엑셀바이트 is None:
        raise HTTPException(status_code=500, detail="Excel 생성 실패 — 해당 업무의뢰서에 등록된 단가가 없을 수 있습니다")

    return Response(
        content=엑셀바이트,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{거래명세서번호}.xlsx"'},
    )


# ── 거래처마스터 쓰기 API ──────────────────────────────────────

class 거래처행(BaseModel):
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
    거래처명: str
    업무명: Optional[str] = None
    작업명: Optional[str] = None
    출력단가: float = 0
    봉입단가: float = 0
    추가봉입단가: float = 0
    용지제작단가: float = 0
    봉투제작단가: float = 0
    삽지제작단가: float = 0
    각대대봉투단가: float = 0
    각대대봉투봉입단가: float = 0
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
                        (거래처명, 업무명, 작업명, 출력단가, 봉입단가, 추가봉입단가,
                         용지제작단가, 봉투제작단가, 삽지제작단가, 각대대봉투단가, 각대대봉투봉입단가,
                         비고, 등록일, 수정일)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (단가.거래처명, 단가.업무명, 단가.작업명, 단가.출력단가, 단가.봉입단가, 단가.추가봉입단가,
                      단가.용지제작단가, 단가.봉투제작단가, 단가.삽지제작단가, 단가.각대대봉투단가, 단가.각대대봉투봉입단가,
                      단가.비고, 오늘, 오늘))
                새_id = cur.lastrowid
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="동일한 거래처명·업무명·작업명 조합이 이미 존재합니다")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")
    return {"status": "ok", "id": 새_id}


class 단가마스터_수정(BaseModel):
    출력단가: float = 0
    봉입단가: float = 0
    추가봉입단가: float = 0
    용지제작단가: float = 0
    봉투제작단가: float = 0
    삽지제작단가: float = 0
    각대대봉투단가: float = 0
    각대대봉투봉입단가: float = 0
    비고: Optional[str] = None


@app.put("/단가마스터/{id}", dependencies=인증필요)
def 단가마스터_수정_요청(id: int, 단가: 단가마스터_수정):
    from datetime import date
    오늘 = str(date.today())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE 단가마스터
                SET 출력단가=%s, 봉입단가=%s, 추가봉입단가=%s,
                    용지제작단가=%s, 봉투제작단가=%s, 삽지제작단가=%s,
                    각대대봉투단가=%s, 각대대봉투봉입단가=%s, 비고=%s, 수정일=%s
                WHERE id=%s
            """, (단가.출력단가, 단가.봉입단가, 단가.추가봉입단가,
                  단가.용지제작단가, 단가.봉투제작단가, 단가.삽지제작단가,
                  단가.각대대봉투단가, 단가.각대대봉투봉입단가, 단가.비고, 오늘, id))
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


class 거래명세서요청_요청(BaseModel):
    거래처명: str
    사업부: str
    담당자: str
    품목: str
    공급가액: float
    세액: float
    합계: float
    의뢰서번호_목록: List[str]


@app.post("/거래명세서요청", dependencies=인증필요)
def 거래명세서요청(요청: 거래명세서요청_요청):
    """
    금액(공급가액·세액·합계)은 app.py가 calc_공급가맵()으로 이미 계산해서 보낸 값을 그대로 저장한다.
    (일반봉투/각대대봉투 구분에 필요한 자재형태 데이터가 아직 MariaDB에 없어, 계산 자체는 당분간 app.py가 담당 — A안)
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

    from datetime import date
    오늘 = str(date.today())

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                거래명세서번호 = _발급_거래명세서번호(cur, 요청.사업부)
                cur.execute("""
                    INSERT INTO 거래명세서
                        (거래명세서번호, 거래처명, 담당자, 발행일자, 품목, 공급가액, 세액, 합계, 발송여부, 등록일)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, NOW())
                """, (거래명세서번호, 요청.거래처명, 요청.담당자, 오늘, 요청.품목,
                      요청.공급가액, 요청.세액, 요청.합계))

                cur.executemany(
                    "INSERT INTO 거래명세서_의뢰서 (거래명세서번호, 업무의뢰서번호) VALUES (%s, %s)",
                    [(거래명세서번호, n) for n in 요청.의뢰서번호_목록]
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"거래명세서 요청 실패: {e}")

    return {"status": "ok", "거래명세서번호": 거래명세서번호}


class 거래명세서번호_요청(BaseModel):
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
            cur.execute("SELECT 발송여부 FROM 거래명세서 WHERE 거래명세서번호=%s", (요청.거래명세서번호,))
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
                세액 = round(공급가액 * 0.1)
                합계 = 공급가액 + 세액
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
    작업내역서번호: int
    작업일자: str
    자재종류: str
    작업명: Optional[str] = None  # 2026-07-19 추가 — 아직 실제로 보내주는 곳 없음(API규격서.md 요청 메모 참고)
    사용량: int = 0


class 운영통계수신요청(BaseModel):
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
