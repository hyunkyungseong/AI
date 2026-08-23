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
  GET  /거래명세서품명이력     — 거래처명으로 "가장 최근 확정"에 쓰인 "새 행 추가" 품명 반환(중복 제거) —
                              미리보기 오픈 시 프론트가 곧바로 표에 행으로 자동 반영 (2026-08-12 신규)
  POST /거래명세서미리보기  — 채번 전 의뢰서번호_목록으로 원본 품목(왼쪽)·저장된 규칙 적용 결과(오른쪽 초안)·
                              미분류 항목을 JSON으로 미리보기 (2026-07-20 신규, 2026-07-22 규칙엔진 확장, Next.js 탭4 전용)
  GET  /청구품목규칙        — 거래처명+업무명으로 저장된 재사용 청구 규칙 목록 조회 (2026-07-22 신규)
  PUT  /청구품목규칙        — 거래처명+업무명의 규칙 전체를 통째로 교체 저장 (2026-07-22 신규)
  GET  /담당자              — 담당자 목록 + 각자 담당하는 거래처+업무명 매핑 반환 (2026-08-11 신규,
                              거래명세서 하단 담당자 연락처 자동 표기용, "담당자 우선" 구조)
  POST   /담당자             — 담당자 1건 신규 등록
  PUT    /담당자/{id}        — 담당자 1건 수정(이름·전화번호·이메일)
  DELETE /담당자             — id 목록으로 삭제(담당 거래처 매핑도 함께 삭제)
  POST   /담당자/{id}/거래처 — 그 담당자에게 거래처+업무명(비우면 거래처 전체 기본) 매핑 추가
  DELETE /담당자/거래처      — 매핑 id 목록으로 삭제
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
  POST   /거래명세서발행     — 발송여부=1로 변경 (발행가능=0이면 409로 거부, 2026-08-12)
  POST   /거래명세서발행취소 — 발송여부=0으로 되돌림 (원래 계획엔 없었으나 app.py에 이미 있는 기능이라 함께 추가)
  PUT    /거래명세서/{no}/발행가능 — 거래처 승인 대기 게이트 켬/끔 (발행요청목록 전용, 2026-08-12 신규)
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
    """단가마스터 목록에 각 행의 자재단가(자재명 정규화, 2026-08-15)·공정단가(공정별 단가 청구,
    2026-08-21) 하위목록을 중첩해서 함께 반환한다 — 프론트가 한 번의 요청으로 전체 트리(기본단가+
    자재별 단가+공정별 단가)를 그릴 수 있도록."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM 단가마스터 ORDER BY 거래처명, 업무명, 작업명")
            단가행목록 = cur.fetchall()

            cur.execute("""
                SELECT ad.id, ad.단가마스터_id, ad.코드, ad.단가, ad.표시명, ad.인쇄면, ad.비고,
                       am.자재코드, am.자재명
                FROM 단가마스터_자재단가 ad
                LEFT JOIN 단가마스터_자재단가_매칭 am ON am.자재단가_id = ad.id
                ORDER BY ad.단가마스터_id, ad.코드, ad.id
            """)
            자재단가행목록 = cur.fetchall()

            cur.execute("""
                SELECT id, 단가마스터_id, 공정코드, 단가, 비고
                FROM 단가마스터_공정단가
                ORDER BY 단가마스터_id, 공정코드
            """)
            공정단가행목록 = cur.fetchall()

    자재단가맵 = {}
    for r in 자재단가행목록:
        d = 자재단가맵.setdefault(r["id"], {
            "id": r["id"], "단가마스터_id": r["단가마스터_id"], "코드": r["코드"],
            "단가": float(r["단가"] or 0), "표시명": r["표시명"], "인쇄면": r["인쇄면"],
            "비고": r["비고"], "매칭자재": [],
        })
        if r["자재코드"] is not None or r["자재명"]:
            d["매칭자재"].append({"자재코드": r["자재코드"], "자재명": r["자재명"]})

    하위목록맵 = {}
    for d in 자재단가맵.values():
        하위목록맵.setdefault(d["단가마스터_id"], []).append(d)

    공정단가하위목록맵 = {}
    for r in 공정단가행목록:
        공정단가하위목록맵.setdefault(r["단가마스터_id"], []).append({
            "id": r["id"], "단가마스터_id": r["단가마스터_id"], "공정코드": r["공정코드"],
            "단가": float(r["단가"] or 0), "비고": r["비고"],
        })

    for row in 단가행목록:
        row["자재단가목록"] = 하위목록맵.get(row["id"], [])
        row["공정단가목록"] = 공정단가하위목록맵.get(row["id"], [])
    return 단가행목록


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
    의뢰서목록을 주면 그 의뢰서만 스코프(거래명세서 Excel용), 없으면 전체(예상공급가액 미리보기용).

    자재코드·자재명(2026-08-15 추가, 단가마스터 자재명 정규화)도 GROUP BY에 포함시켜 라인 단위
    구분을 보존한다 — billing.build_자재map()이 이 값을 받아 자재 단위 단가 조회용 인덱스를 만든다."""
    sql = """
        SELECT 업무의뢰서번호, 작업이름, 자재종류, 자재형태, 자재코드, 자재명, SUM(사용량) AS 사용량
        FROM (
            SELECT m.업무의뢰서번호, m.작업명 AS 작업이름, m.자재종류, m.자재형태, m.자재코드, m.자재명, m.사용량
            FROM 자재사용현황 m
            WHERE m.작업명 IS NOT NULL

            UNION ALL

            SELECT m.업무의뢰서번호, o.작업명 AS 작업이름, m.자재종류, m.자재형태, m.자재코드, m.자재명, m.사용량
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
    sql += " GROUP BY 업무의뢰서번호, 작업이름, 자재종류, 자재형태, 자재코드, 자재명"
    cur.execute(sql, params)
    return cur.fetchall()


def _우편요금맵_조회(cur, 의뢰서목록=None):
    """billing.build_품목행()·calc_공급가맵()의 우편요금맵 인자로 바로 쓸 수 있는 형태
    ({의뢰서번호int: 금액float})로 업무의뢰서_우편요금을 조회(2026-08-22,
    `.claude/plans/plan_우편요금관리.md`). 의뢰서목록을 주면 그 의뢰서만 스코프,
    없으면 전체(_자재map_조회()와 동일한 관례)."""
    sql = "SELECT 업무의뢰서번호, 금액 FROM 업무의뢰서_우편요금"
    params = []
    if 의뢰서목록:
        자리표시자 = ", ".join(["%s"] * len(의뢰서목록))
        sql += f" WHERE 업무의뢰서번호 IN ({자리표시자})"
        params = list(의뢰서목록)
    cur.execute(sql, params)
    return {int(float(r["업무의뢰서번호"])): float(r["금액"] or 0) for r in cur.fetchall()}


def _예상공급가액_표시(가격):
    """calc_공급가맵()의 한 항목({"합계", "부가세구분맵", ...})을 받아 미발행목록·발행목록 화면에
    "예상공급가액"으로 표시할 값을 계산한다(2026-08-23). calc_공급가맵()의 "합계"는 단가마스터
    "포함"(단가에 부가세가 이미 녹아있음) 거래처에서는 부가세가 안 빠진 원시 합계라, 그동안 이걸
    그대로 "예상공급가액"에 써서 확정 후 저장되는 실제 공급가액(build_품목행()이
    billing.부가세_표시분리()로 역산 분리한 값)보다 부가세만큼 커 보이는 문제가 있었다(사용자 제보 —
    "편집 안 했는데도 예상공급가액과 청구공급가액이 부가세만큼 차이난다"). 확정 시 저장 로직과
    동일하게 부가세_표시분리()를 거쳐야 "편집 안 하면 예상치와 확정치가 (반올림 오차 수준으로)
    일치한다"는 화면의 원래 취지가 맞는다. 아직 발급 전 예상치일 뿐이라 작업명별 부가세구분이
    섞여 있어도 여기서 막지 않고 "별도"로 예상해 보여준다(실제 발급 차단은 POST /거래명세서요청이
    담당 — 기존 /예상공급가액 엔드포인트와 동일한 관례)."""
    if not 가격 or 가격["합계"] <= 0:
        return None
    try:
        구분 = billing.결정_부가세구분(가격.get("부가세구분맵", {}))
    except ValueError:
        구분 = "별도"
    표시_공급가액, _ = billing.부가세_표시분리(구분, 가격["합계"])
    return round(표시_공급가액)


def _자재단가df_조회(cur):
    """billing.build_단가맵()의 자재단가df 인자로 바로 쓸 수 있는 형태(거래처명·업무명·작업명·품목·단가·
    자재코드·자재명·자재단가_id·표시명·인쇄면)로 단가마스터_자재단가를 단가마스터·단가마스터_자재단가_매칭과
    조인해서 반환(2026-08-15, 단가마스터 자재명 정규화). 매칭 행이 없는 자재단가(등록 중 미완료)는
    자재코드·자재명이 둘 다 NULL인 행으로 나오는데, build_단가맵()이 이런 행은 조회 대상에서 걸러낸다.
    자재단가_id·표시명(2026-08-16 추가)은 "한 자재단가에 여러 자재를 매칭"한 경우 원본 미리보기
    표에서도 한 줄로 합쳐 보여주기 위함(billing.build_단가맵()의 라벨 계산 참고) — 같은 자재단가_id
    행끼리는 단가가 항상 같으므로(자재단가 테이블 자체가 1행=1단가) 단가가 다른 자재끼리는 절대
    한 그룹으로 묶이지 않는다. 인쇄면(2026-08-22, "출력비" 코드 행 전용)은 NULL이면 build_단가맵()이
    거래처+업무명 레벨 값으로 폴백 — 상세: `.claude/plans/plan_출력비_장수페이지기준_인쇄면자재별.md`."""
    cur.execute("""
        SELECT dm.거래처명, dm.업무명, dm.작업명, ad.코드 AS 품목, ad.단가, ad.id AS 자재단가_id,
               ad.표시명, ad.인쇄면, am.자재코드, am.자재명
        FROM 단가마스터_자재단가 ad
        JOIN 단가마스터 dm ON ad.단가마스터_id = dm.id
        LEFT JOIN 단가마스터_자재단가_매칭 am ON am.자재단가_id = ad.id
    """)
    return cur.fetchall()


def _공정단가df_조회(cur):
    """billing.build_단가맵()의 공정단가df 인자로 바로 쓸 수 있는 형태(거래처명·업무명·작업명·공정코드·단가)로
    단가마스터_공정단가를 단가마스터와 조인해서 반환(2026-08-21, 공정별 단가 청구 —
    `.claude/plans/plan_공정별단가청구.md`). 자재단가와 달리 공정은 고정 8종 enum이라 매칭 테이블 조인이
    필요 없다."""
    cur.execute("""
        SELECT dm.거래처명, dm.업무명, dm.작업명, gd.공정코드, gd.단가
        FROM 단가마스터_공정단가 gd
        JOIN 단가마스터 dm ON gd.단가마스터_id = dm.id
    """)
    return cur.fetchall()


def _규칙_조회(cur, 거래처명, 업무명):
    """거래처명+업무명으로 저장된 청구품목규칙을 순서대로 조회. 조건 컬럼은 MariaDB JSON 타입인데
    pymysql이 자동으로 dict로 파싱해주지 않는 경우가 있어(드라이버 버전에 따라 str로 올 수 있음)
    str이면 직접 json.loads()로 변환한다. 조(시트명, 2026-07-29 조별 분할발급)·구분표시·규격·비고
    (Excel B/H/N열 직접 입력, 2026-08-11) 컬럼도 함께 반환."""
    cur.execute(
        "SELECT 순서, 최종청구품명, 조건, 조, 구분표시, 규격, 비고 FROM 청구품목규칙 "
        "WHERE 거래처명=%s AND 업무명=%s ORDER BY 순서",
        (거래처명, 업무명),
    )
    행목록 = cur.fetchall()
    for r in 행목록:
        if isinstance(r["조건"], str):
            r["조건"] = json.loads(r["조건"])
    return 행목록


def _규칙_저장(cur, 거래처명, 업무명, 규칙목록):
    """그 거래처+업무명의 규칙 전체를 통째로 교체(DELETE 후 INSERT) — 단가마스터 등 다른 마스터
    데이터 갱신과 동일한 관례. 규칙목록 각 원소는
    {"순서","최종청구품명","조건","조"(선택),"구분표시"(선택),"규격"(선택),"비고"(선택)} dict."""
    cur.execute("DELETE FROM 청구품목규칙 WHERE 거래처명=%s AND 업무명=%s", (거래처명, 업무명))
    if 규칙목록:
        cur.executemany(
            "INSERT INTO 청구품목규칙 (거래처명, 업무명, 순서, 최종청구품명, 조건, 조, 구분표시, 규격, 비고) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            [
                (거래처명, 업무명, r["순서"], r["최종청구품명"],
                 json.dumps(r["조건"], ensure_ascii=False), r.get("조"),
                 r.get("구분표시"), r.get("규격"), r.get("비고"))
                for r in 규칙목록
            ],
        )


# ── 통합조건식 (여러 업무명 조합 전용 규칙, 2026-08-08 다중업무명 규칙조회 재설계) ──────────
#
# 개별조건식(청구품목규칙, 위 _규칙_조회/_규칙_저장)은 거래처+업무명(단수) 키로만 저장돼서,
# 여러 업무명을 함께 선택해 거래명세서를 요청하면 그중 하나(대표 업무명)에 저장된 규칙만
# 적용되는 버그가 있었다. 아래 헬퍼들은 거래처+업무명조합(2개 이상) 키로 별도 저장되는
# "통합조건식"을 다루며, 존재하면 개별조건식보다 항상 우선 적용된다. 업무명조합이 선택된
# 업무명 집합과 정확히 일치하지 않으면(부족/초과) 사용자 확인을 거쳐 UPDATE로 재조정한다
# (billing.업무명조합_키() 정규화, 저장 소속 재조정은 UPDATE — 레코드 삭제 아님).

def _통합규칙_조회(cur, 거래처명, 업무명조합):
    """_규칙_조회()와 동일 패턴, 청구품목통합규칙 대상."""
    cur.execute(
        "SELECT 순서, 최종청구품명, 조건, 조, 구분표시, 규격, 비고 FROM 청구품목통합규칙 "
        "WHERE 거래처명=%s AND 업무명조합=%s ORDER BY 순서",
        (거래처명, 업무명조합),
    )
    행목록 = cur.fetchall()
    for r in 행목록:
        if isinstance(r["조건"], str):
            r["조건"] = json.loads(r["조건"])
    return 행목록


def _통합규칙_저장(cur, 거래처명, 업무명조합, 규칙목록):
    """_규칙_저장()과 동일 패턴(DELETE 후 INSERT 통째 교체), 청구품목통합규칙 대상."""
    cur.execute("DELETE FROM 청구품목통합규칙 WHERE 거래처명=%s AND 업무명조합=%s", (거래처명, 업무명조합))
    if 규칙목록:
        cur.executemany(
            "INSERT INTO 청구품목통합규칙 (거래처명, 업무명조합, 순서, 최종청구품명, 조건, 조, 구분표시, 규격, 비고) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            [
                (거래처명, 업무명조합, r["순서"], r["최종청구품명"],
                 json.dumps(r["조건"], ensure_ascii=False), r.get("조"),
                 r.get("구분표시"), r.get("규격"), r.get("비고"))
                for r in 규칙목록
            ],
        )


def _통합규칙_조합목록(cur, 거래처명):
    """이 거래처에 저장된 모든 통합조건식 업무명조합 문자열(중복 제거) — 부족/초과 판정용."""
    cur.execute("SELECT DISTINCT 업무명조합 FROM 청구품목통합규칙 WHERE 거래처명=%s", (거래처명,))
    return [r["업무명조합"] for r in cur.fetchall()]


def _통합규칙_업무명조합_수정(cur, 거래처명, 기존업무명조합, 신규업무명조합):
    """부족(축소)/초과(확장) 해결 확정 시 호출 — 같은 거래처+같은 옛 업무명조합을 가진 모든
    규칙 행(여러 순서)의 업무명조합을 새 값으로 일괄 UPDATE한다(레코드 삭제가 아니라 소속
    재조정). 정상 흐름에서는 신규업무명조합이 이미 다른 레코드로 존재하지 않는 상태에서만
    호출되므로 UNIQUE(거래처명, 업무명조합, 순서) 충돌이 나지 않는다."""
    cur.execute(
        "UPDATE 청구품목통합규칙 SET 업무명조합=%s WHERE 거래처명=%s AND 업무명조합=%s",
        (신규업무명조합, 거래처명, 기존업무명조합),
    )
    return cur.rowcount


def _개별규칙_병합조회(cur, 거래처명, 업무명_목록):
    """통합조건식이 전혀 관련 없을 때(신규 조합) 개별조건식을 병합 — 각 업무명의 청구품목규칙을
    업무명 가나다순으로 이어붙이고, 순서는 1부터 전체 재부여한다(같은 순서값이 서로 다른
    업무명에서 중복될 수 있어 그대로 합치면 billing.적용_규칙()의 순서 정렬이 뒤섞이므로).
    각 업무명 내부의 상대 순서는 유지된다."""
    전체 = []
    for 업무명 in sorted({u for u in 업무명_목록 if u}):
        전체.extend(_규칙_조회(cur, 거래처명, 업무명))
    for i, r in enumerate(전체, start=1):
        r["순서"] = i
    return 전체


def _통합조건식_판정(cur, 거래처명, S):
    """S(선택된 업무명 set, 1개 이상) 기준 통합조건식 상태 판정.

    반환: (규칙출처, 업무명조합_사용중, 불일치정보, 규칙목록)
      규칙출처: "통합"(정확 일치) | "불일치"(부족/초과 후보 발견) | "개별"(관련 통합조건식 없음)
      업무명조합_사용중: 규칙출처="통합"일 때만 그 조합 문자열, 그 외 None
      불일치정보: {"상황": "부족"|"초과", "기존업무명조합": str, "차이_업무명": [str, ...]} | None

    len(S)==1이어도 기존 통합조건식과 비교는 그대로 수행한다 — "저장은 1개면 개별조건식"이라는
    규칙(POST /거래명세서요청)과 "조회 시 관련 통합조건식이 있으면 부족/초과를 확인시켜준다"는
    규칙은 서로 다른 얘기라서 함께 취급하면 안 된다(2026-08-08, 실사용 확인 중 발견한 버그 —
    예전엔 여기서 len(S)<2면 바로 "개별"을 반환해, "교육청" 1개만 선택했는데 기존에
    "교육청+종합법인" 통합조건식이 있어도 누락 알림 자체가 안 뜨는 문제가 있었음). S가 정확히
    일치하는 1개짜리 통합조건식이 있으면(부족 해결로 축소된 경우 등, "1개짜리 통합조건식 허용"
    설계) 여기서도 정상적으로 "통합"이 반환된다. 후보가 여러 개 걸리는 경우(정상 흐름에선 거의
    안 생기지만, 부족/초과 UPDATE 없이 데이터가 꼬인 경우 대비 안전망)는 차이(빠지거나
    초과된 업무명 개수)가 가장 적은 것을 우선하고, 동률이면 "초과"를 "부족"보다 우선한다
    (기존 규칙을 좁히기보다 넓히는 쪽이 안전)."""
    후보들 = _통합규칙_조합목록(cur, 거래처명)
    for 조합 in 후보들:
        if set(조합.split("|")) == S:
            return "통합", 조합, None, _통합규칙_조회(cur, 거래처명, 조합)

    불일치_후보 = []  # [(차이개수, 상황우선순위, 조합, 상황, 차이_업무명), ...]
    for 조합 in 후보들:
        기존 = set(조합.split("|"))
        if S < 기존:
            불일치_후보.append((len(기존 - S), 1, 조합, "부족", sorted(기존 - S)))
        elif S > 기존:
            불일치_후보.append((len(S - 기존), 0, 조합, "초과", sorted(S - 기존)))
    if 불일치_후보:
        _, _, 조합, 상황, 차이 = sorted(불일치_후보)[0]
        return "불일치", None, {"상황": 상황, "기존업무명조합": 조합, "차이_업무명": 차이}, _통합규칙_조회(cur, 거래처명, 조합)

    return "개별", None, None, _개별규칙_병합조회(cur, 거래처명, S)


def _담당자_조회(cur, 거래처명, 업무명):
    """거래명세서 하단 담당자 연락처(Excel B31) 자동 표기용 조회(2026-08-11).
    (거래처명, 업무명) 정확일치 → 없으면 (거래처명, 업무명 NULL="그 거래처 전체 기본") 순서로
    폴백(단가마스터의 거래처 기본단가 폴백과 동일 관례). 등록된 담당자가 없으면 None을 반환하고,
    호출부(write_거래명세서_excel())가 템플릿에 원래 있던 고정 텍스트를 그대로 둔다."""
    cur.execute(
        """SELECT d.이름, d.전화번호, d.이메일
           FROM 담당자_담당거래처 m JOIN 담당자 d ON d.id = m.담당자_id
           WHERE m.거래처명=%s AND m.업무명=%s""",
        (거래처명, 업무명),
    )
    row = cur.fetchone()
    if row:
        return row
    cur.execute(
        """SELECT d.이름, d.전화번호, d.이메일
           FROM 담당자_담당거래처 m JOIN 담당자 d ON d.id = m.담당자_id
           WHERE m.거래처명=%s AND m.업무명 IS NULL""",
        (거래처명,),
    )
    return cur.fetchone()


@app.get("/예상공급가액", dependencies=인증필요)
def 예상공급가액(사업부: Optional[List[str]] = Query(default=None)):
    """
    미발행 건의 예상공급가액을 미리 계산해 업무의뢰서 단위로 반환.
    calc_공급가맵() 계산 자체는 app.py와 완전히 동일(billing.py 공용) — 자재 수량만 MariaDB에서 조회.
    사업부 필터는 /summary와 동일한 선택 사항.
    """
    sql = "SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 청구페이지, 확정청구페이지, 건수, 장수, 압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지 FROM 운영통계자료"
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
            자재단가행 = _자재단가df_조회(cur)
            공정단가행 = _공정단가df_조회(cur)
            우편요금맵 = _우편요금맵_조회(cur)

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
    자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
    공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])

    단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in df_all["업무의뢰서번호"] if pd.notna(x)}

    결과 = billing.calc_공급가맵(df_all, 단가맵, 자재map, 의뢰서번호셋, 우편요금맵=우편요금맵)

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
                     마케팅담당자, 청구페이지, 확정청구페이지, 건수, 출력페이지, 장수,
                     압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지
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
            자재단가행 = _자재단가df_조회(cur)
            공정단가행 = _공정단가df_조회(cur)
            우편요금맵 = _우편요금맵_조회(cur, 미발행_의뢰서목록)

    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(
        columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
    자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
    공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])

    summary = billing.build_의뢰서_summary(df_미발행, 자재df)

    단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 미발행_의뢰서목록}
    공급가맵 = billing.calc_공급가맵(df_미발행, 단가맵, 자재map, 의뢰서번호셋, 우편요금맵=우편요금맵)

    응답 = []
    for _, r in summary.iterrows():
        의뢰서int = int(float(r["업무의뢰서번호"]))
        가격 = 공급가맵.get(의뢰서int)
        예상공급가액 = _예상공급가액_표시(가격)
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
            "우편요금": 우편요금맵.get(의뢰서int, 0),
        })
    응답.sort(key=lambda x: x["작업일자"], reverse=True)
    return 응답


class 우편요금_수정(BaseModel):
    model_config = ConfigDict(title="PostageUpdateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    금액: float = 0


@app.put("/업무의뢰서/{request_no}/우편요금", dependencies=인증필요)
def 업무의뢰서_우편요금_수정(request_no: str, 요청: 우편요금_수정):
    """미발행 목록에서 마케팅 담당자가 의뢰서별로 우편요금을 입력·수정(2026-08-22,
    `.claude/plans/plan_우편요금관리.md`) — upsert(있으면 갱신, 없으면 신규 등록).
    경로 파라미터명은 반드시 영문이어야 함(SKILL-13 — 한글 파라미터명은 Starlette 라우팅 정규식이
    인식 못 해 /docs엔 정상 표시되지만 실제 호출은 항상 404가 나는 함정이 있음)."""
    from datetime import date
    오늘 = str(date.today())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO 업무의뢰서_우편요금 (업무의뢰서번호, 금액, 등록일, 수정일)
                   VALUES (%s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE 금액=%s, 수정일=%s""",
                (request_no, 요청.금액, 오늘, 오늘, 요청.금액, 오늘),
            )
    return {"status": "ok"}


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
                     마케팅담당자, 청구페이지, 확정청구페이지, 건수, 출력페이지, 장수,
                     압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지
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
                SELECT a.업무의뢰서번호, a.거래명세서번호, b.발송여부, b.편집여부, b.발행가능,
                       b.공급가액, b.공급가액_직접입력
                FROM 거래명세서_의뢰서 a
                JOIN 거래명세서 b ON a.거래명세서번호 = b.거래명세서번호
            """)
            발행행목록 = cur.fetchall()
            if not 발행행목록:
                return []

            # "편집됨" 배지는 편집여부(부분취소 게이트, 보수적으로 원본 기준 유지)가 아니라 실제
            # 감사이력이 있는지로 판단한다(2026-08-13) — 조건식만 자동 적용되고 사람은 안 건드린
            # 건까지 "편집됨"으로 보이던 문제 수정.
            cur.execute("SELECT DISTINCT 거래명세서번호 FROM 거래명세서_수정이력")
            수정이력있는번호셋 = {r["거래명세서번호"] for r in cur.fetchall()}
            # "편집됨" 배지 색상(증가=빨강/감소=파랑, 2026-08-14) — 거래명세서번호당 "합계" 로그는
            # 생성 시점에 최대 1건만 남는다(이 거래명세서에 다시 확정하는 흐름이 없어 재확정으로
            # 덮어써질 일이 없음).
            cur.execute("SELECT 거래명세서번호, 이전값, 이후값 FROM 거래명세서_수정이력 WHERE 필드명='합계'")
            합계증감맵 = {r["거래명세서번호"]: float(r["이후값"] - r["이전값"]) for r in cur.fetchall()}
            # 의뢰서번호 하나가 거래명세서 여러 개에 속할 수 있어(조별 분할발급, 2026-07-29) 리스트로
            # 누적 — 분할 안 된 일반 건은 리스트 길이가 항상 1이라 기존과 동일하게 동작한다.
            발행맵: dict = {}
            for r in 발행행목록:
                확정공급가액 = float(
                    r["공급가액_직접입력"] if r["공급가액_직접입력"] is not None else (r["공급가액"] or 0)
                )
                발행맵.setdefault(r["업무의뢰서번호"], []).append(
                    (r["거래명세서번호"], r["발송여부"], r["편집여부"], r["발행가능"], 확정공급가액)
                )

            # "예상공급가액"(2026-08-23부터 화면 표시는 "수정전공급가액") — calc_공급가맵()으로 매번
            # 원본(조건식 미적용) 기준으로 새로 계산하던 것을, 확정 시점(POST /거래명세서요청)에
            # 이미 저장해 둔 "기준"(조건식 적용 후·사람이 손대기 전) 스냅샷을 그대로 읽어 쓰도록
            # 변경(사용자 제안, 2026-08-18에 감사이력 기준선 용도로 도입된 거래명세서_품목 구분='기준'
            # 재사용) — calc_공급가맵() 기반 원본 재계산은 ①조건식을 전혀 반영 못 하고(사용자 제보로
            # 발견) ②의뢰서를 개별로 반올림해 build_품목행()의 결합 반올림과 미세하게 어긋나는(봉입비
            # 정수반올림, `bug_봉입비_수작업중복청구.md`) 두 문제가 있었는데, 저장된 값을 그대로
            # 읽으면 둘 다 해소되고 계산도 훨씬 빠르다(상세: `.claude/plans/bug_예상공급가액_부가세미반영.md`).
            거래명세서번호_전체 = {r["거래명세서번호"] for r in 발행행목록}
            기준합맵 = {}
            if 거래명세서번호_전체:
                자리3 = ", ".join(["%s"] * len(거래명세서번호_전체))
                cur.execute(
                    f"SELECT 거래명세서번호, SUM(금액) AS 기준합 FROM 거래명세서_품목 "
                    f"WHERE 구분='기준' AND 거래명세서번호 IN ({자리3}) GROUP BY 거래명세서번호",
                    list(거래명세서번호_전체),
                )
                기준합맵 = {r["거래명세서번호"]: float(r["기준합"] or 0) for r in cur.fetchall()}
            # 기준 스냅샷이 없는(2026-08-18 이전 확정된) 거래명세서 대비 폴백용 — 대표 의뢰서 1건의
            # 거래처+업무명+작업명으로 부가세구분을 판정한다(그 거래명세서에 속한 의뢰서는 확정 시점에
            # 이미 결정_부가세구분()으로 단일 값임이 검증됐으므로 아무 의뢰서나 대표로 써도 동일하다).
            거래명세서_대표의뢰서 = {}
            for r in 발행행목록:
                거래명세서_대표의뢰서.setdefault(r["거래명세서번호"], r["업무의뢰서번호"])

            df_all = pd.DataFrame(원본행)
            df_발행 = df_all[df_all["업무의뢰서번호"].isin(발행맵.keys())].copy()
            if df_발행.empty:
                return []

            발행_의뢰서목록 = df_발행["업무의뢰서번호"].unique().tolist()

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 발행_의뢰서목록)
            자재단가행 = _자재단가df_조회(cur)
            공정단가행 = _공정단가df_조회(cur)
            우편요금맵 = _우편요금맵_조회(cur, 발행_의뢰서목록)

    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(
        columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
    자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
    공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])

    summary = billing.build_의뢰서_summary(df_발행, 자재df)

    단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 발행_의뢰서목록}
    # 기준 스냅샷이 없는(2026-08-18 이전 확정된) 거래명세서 대비 폴백 전용 — 정상적으로는 아래
    # 기준합맵이 전부 채워줘 이 계산 결과가 안 쓰인다.
    공급가맵 = billing.calc_공급가맵(df_발행, 단가맵, 자재map, 의뢰서번호셋, 우편요금맵=우편요금맵)

    # 거래명세서번호별 "예상공급가액"(수정전공급가액) — 기준합맵(위에서 조회) 우선 적용, 없으면
    # (구버전 거래명세서) 대표 의뢰서의 calc_공급가맵() 기반 값으로 폴백.
    의뢰서_속성맵 = (
        df_all.drop_duplicates("업무의뢰서번호")
        .set_index("업무의뢰서번호")[["거래처명", "업무명", "작업명"]]
        .to_dict("index")
    )

    def _부가세구분_조회(거래처, 업무, 작업):
        rates = (
            단가맵.get((거래처, 업무, 작업))
            or 단가맵.get((거래처, 업무, None))
            or 단가맵.get((거래처, None, None))
        )
        return (rates or {}).get("부가세구분") or "별도"

    예상공급가액맵 = {}
    for 거래명세서번호, 기준합 in 기준합맵.items():
        if 기준합 <= 0:
            continue
        속성 = 의뢰서_속성맵.get(거래명세서_대표의뢰서.get(거래명세서번호), {})
        구분 = _부가세구분_조회(속성.get("거래처명"), 속성.get("업무명"), 속성.get("작업명"))
        표시_공급가액, _ = billing.부가세_표시분리(구분, 기준합)
        예상공급가액맵[거래명세서번호] = round(표시_공급가액)

    응답 = []
    for _, r in summary.iterrows():
        의뢰서번호 = r["업무의뢰서번호"]
        가격 = 공급가맵.get(int(float(의뢰서번호)))
        예상공급가액_폴백 = _예상공급가액_표시(가격)
        for 거래명세서번호, 발송여부, 편집여부, 발행가능, 확정공급가액 in 발행맵[의뢰서번호]:
            예상공급가액 = 예상공급가액맵.get(거래명세서번호, 예상공급가액_폴백)
            응답.append({
                "의뢰서번호": 의뢰서번호,
                "거래명세서번호": 거래명세서번호,
                "발송여부": int(발송여부),
                "편집여부": int(편집여부),
                "발행가능": int(발행가능),
                "수정이력있음": 거래명세서번호 in 수정이력있는번호셋,
                "합계증감": 합계증감맵.get(거래명세서번호, 0.0),
                # 발행요청목록/발행완료 "청구공급가액" 열 전용(2026-08-14, 사용자 요청) — 거래명세서번호
                # 단위로 이미 확정 저장된 값(공급가액_직접입력 우선)이라 의뢰서 라인마다 동일하게 붙는다.
                "확정공급가액": 확정공급가액,
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
    담당자 = _담당자_조회(cur, 거래명세서["거래처명"], 업무명)

    cur.execute(
        "SELECT 코드, 품목, 수량, 단가, 금액, 구분표시, 규격, 비고 FROM 거래명세서_품목 "
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
                "구분표시": r["구분표시"],
                "규격": r["규격"],
                "비고": r["비고"],
            }
            for r in 저장된_최종
        ]
        총합계 = sum(r["금액"] for r in 품목행목록)
        # 편집된 건은 요청 시점에 이미 계산·저장된 세액을 그대로 재사용(재계산 안 함 — 발행 당시
        # 확정한 금액을 그대로 유지하는 원칙과 동일, 2026-07-28 부가세 표기 기능 추가 시 누락됐던
        # 호출부를 2026-07-29 실사용 중 다운로드 오류로 발견해 수정).
        세액 = float(거래명세서["세액"] or 0)
        return billing.write_거래명세서_excel(품목행목록, 총합계, 세액, 거래명세서["거래처명"], 업무명, 발행일, 담당자)

    cur.execute(
        f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 청구페이지, 확정청구페이지, 건수, 장수, 압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지 "
        f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
        의뢰서목록,
    )
    원본행 = cur.fetchall()
    if not 원본행:
        raise HTTPException(status_code=404, detail="이 거래명세서의 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")

    cur.execute("SELECT * FROM 단가마스터")
    단가행 = cur.fetchall()
    자재행 = _자재map_조회(cur, 의뢰서목록)
    자재단가행 = _자재단가df_조회(cur)
    공정단가행 = _공정단가df_조회(cur)

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
    자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
    공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])

    단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 의뢰서목록}
    try:
        return billing.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일, 담당자)
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
    담당자 = _담당자_조회(cur, 거래명세서["거래처명"], 업무명)
    # 시트명 규칙(2026-08-12, 사용자 확정): 작업구분(조)이 있으면 그 값을 우선, 없으면
    # "거래처명(업무명)"으로 표기 — 조 1개짜리·조가 아예 없는(=단일 시트) 경우에도 동일 적용.
    기본시트명 = f"{거래명세서['거래처명']}({업무명})" if 업무명 else 거래명세서["거래처명"]

    from datetime import date
    발행일 = 거래명세서["발행일자"] or date.today()

    cur.execute(
        "SELECT 조, 코드, 품목, 수량, 단가, 금액, 구분표시, 규격, 비고 FROM 거래명세서_품목 "
        "WHERE 거래명세서번호=%s AND 구분='최종' ORDER BY 순서",
        (거래명세서번호,),
    )
    저장된_최종 = cur.fetchall()

    if not 저장된_최종:
        cur.execute(
            f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 청구페이지, 확정청구페이지, 건수, 장수, 압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지 "
            f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
            의뢰서목록,
        )
        원본행 = cur.fetchall()
        if not 원본행:
            raise HTTPException(status_code=404, detail="이 거래명세서의 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")
        cur.execute("SELECT * FROM 단가마스터")
        단가행 = cur.fetchall()
        자재행 = _자재map_조회(cur, 의뢰서목록)
        자재단가행 = _자재단가df_조회(cur)
        공정단가행 = _공정단가df_조회(cur)
        df_all = pd.DataFrame(원본행)
        단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
        자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
        자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
        공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])
        단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
        자재map = billing.build_자재map(자재df)
        의뢰서번호셋 = {int(float(x)) for x in 의뢰서목록}
        try:
            바이트 = billing.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일, 담당자)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=f"부가세 처리 방식 불일치로 다운로드할 수 없습니다: {e}")
        return [(바이트, 기본시트명)]

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
                "구분표시": r["구분표시"],
                "규격": r["규격"],
                "비고": r["비고"],
            }
            for r in 그룹맵[조]
        ]
        그룹공급가액 = sum(x["금액"] for x in 품목행목록)
        그룹표시_공급가액, 그룹표시_세액 = billing.부가세_표시분리(부가세구분, 그룹공급가액)
        # 공급가액·부가세 직접 입력(override, 2026-08-13) — 조가 1개 이하일 때만 이 유일한 시트에
        # 적용한다(조가 여러 개면 개별 조 시트는 절대 override 대상이 아니고, 아래 통합시트에만
        # 반영됨). DECIMAL 컬럼은 pymysql이 Decimal로 반환하므로 float로 캐스팅.
        if len(그룹순서) <= 1 and 거래명세서.get("공급가액_직접입력") is not None and 거래명세서.get("세액_직접입력") is not None:
            그룹표시_공급가액 = float(거래명세서["공급가액_직접입력"])
            그룹표시_세액 = float(거래명세서["세액_직접입력"])
        바이트 = billing.write_거래명세서_excel(
            품목행목록, 그룹표시_공급가액, 그룹표시_세액, 거래명세서["거래처명"], 업무명, 발행일, 담당자
        )
        시트_목록.append((바이트, 조 or 기본시트명))

    if len(그룹순서) > 1 and 거래명세서.get("통합시트명"):
        # 통합 명세서 시트(2026-08-12) — 전체 조의 품목을 표시품명 기준으로 병합해 맨 앞에 끼워
        # 넣는다. combine_거래명세서_시트들()은 시트_목록의 리스트 순서를 그대로 탭 순서로 쓰고,
        # 스타일·직인 등 공용 리소스도 첫 번째 항목 것을 그대로 재사용하므로(모든 시트가 같은
        # 템플릿에서 나온다는 전제) insert(0, ...)만으로 안전하게 맨 앞 탭이 된다.
        전체품목행 = [
            {
                "코드": r["코드"], "표시품명": r["품목"], "수량": float(r["수량"]),
                "단가": float(r["단가"]) if r["단가"] is not None else None,
                "금액": float(r["금액"]), "구분표시": r["구분표시"], "규격": r["규격"], "비고": r["비고"],
            }
            for r in 저장된_최종
        ]
        통합품목행목록 = billing.병합_통합품목행(전체품목행)
        통합공급가액 = sum(x["금액"] for x in 통합품목행목록)
        통합표시_공급가액, 통합표시_세액 = billing.부가세_표시분리(부가세구분, 통합공급가액)
        # 공급가액·부가세 직접 입력(override, 2026-08-13) — 조가 여러 개면 이 통합시트에만 반영.
        if 거래명세서.get("공급가액_직접입력") is not None and 거래명세서.get("세액_직접입력") is not None:
            통합표시_공급가액 = float(거래명세서["공급가액_직접입력"])
            통합표시_세액 = float(거래명세서["세액_직접입력"])
        통합바이트 = billing.write_거래명세서_excel(
            통합품목행목록, 통합표시_공급가액, 통합표시_세액, 거래명세서["거래처명"],
            거래명세서.get("통합상단업무명") or 업무명, 발행일, 담당자,
        )
        시트_목록.insert(0, (통합바이트, 거래명세서["통합시트명"]))

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
            cur.execute(
                "SELECT 편집여부, 공급가액, 세액, 공급가액_직접입력, 세액_직접입력 "
                "FROM 거래명세서 WHERE 거래명세서번호=%s",
                (no,),
            )
            거래명세서 = cur.fetchone()
            if not 거래명세서:
                # 취소·삭제된 거래명세서는 헤더가 없지만(2026-08-14), FK를 제거한 거래명세서_수정이력엔
                # 감사이력이 그대로 남아있을 수 있다 — "수정이력" 탭에서 그런 건을 클릭했을 때도
                # 이력만은 볼 수 있게 폴백(원본·최종 품목 스냅샷은 함께 사라졌으므로 빈 배열).
                cur.execute(
                    "SELECT 필드명, 이전값, 이후값, 비고, 수정자, 수정일시 FROM 거래명세서_수정이력 "
                    "WHERE 거래명세서번호=%s ORDER BY 수정일시",
                    (no,),
                )
                수정이력_잔존 = cur.fetchall()
                if not 수정이력_잔존:
                    raise HTTPException(status_code=404, detail="거래명세서번호를 찾을 수 없습니다")
                return {
                    "존재함": False,
                    "편집여부": False,
                    "원본세액": 0,
                    "최종세액": 0,
                    "원본공급가액": 0,
                    "최종공급가액": 0,
                    "원본": [],
                    "최종": [],
                    "수정이력": 수정이력_잔존,
                }

            cur.execute(
                "SELECT 구분, 코드, 품목, 작업명, 수량, 단가, 금액 FROM 거래명세서_품목 "
                "WHERE 거래명세서번호=%s ORDER BY 구분, 순서",
                (no,),
            )
            품목행목록 = cur.fetchall()

            cur.execute(
                "SELECT 필드명, 이전값, 이후값, 비고, 수정자, 수정일시 FROM 거래명세서_수정이력 "
                "WHERE 거래명세서번호=%s ORDER BY 수정일시",
                (no,),
            )
            수정이력 = cur.fetchall()

    원본_raw = [r for r in 품목행목록 if r["구분"] == "원본"]
    최종 = [r for r in 품목행목록 if r["구분"] == "최종"]
    기준 = [r for r in 품목행목록 if r["구분"] == "기준"]
    for r in 원본_raw + 최종 + 기준:
        del r["구분"]
    # "원본" 칸엔 조건식 적용 후·사람이 손대기 전 스냅샷(기준, 2026-08-18)을 우선 표시 — 아래
    # 원본공급가액/원본세액이 원래부터 이 기준으로 계산되고 있어서(기준목록 기반), 품명도 같은
    # 기준으로 맞춰야 표와 합계가 일관됨. 이 변경 이전에 발행된 과거 건은 구분='기준' 행이 없으므로
    # 기존처럼 가공 전 원본(원본_raw)으로 폴백(과거 데이터 백필 없이 하위호환).
    원본 = 기준 if 기준 else 원본_raw

    # 공급가액·세액을 원본(자동계산)·최종(실제 확정) 두 값으로 따로 계산한다(2026-08-14 버그 수정
    # — 총계 override 기능(2026-08-13) 도입 전까지는 "같은 인보이스면 원본·최종 부가세 처리가
    # 항상 같다"는 가정이 맞았지만, override나 품목 편집으로 총액이 바뀌는 경우엔 최종 쪽이 원본과
    # 달라야 하는데 지금까지 세액 하나만 양쪽에 그대로 재사용해서 "최종" 표가 실제 저장된 값이
    # 아니라 원본과 똑같은 숫자를 보여주는 오류가 있었음, 사용자 스크린샷으로 실사용 중 발견).
    # 위에서 이미 조회해둔 수정이력에 '공급가액'/'세액' 필드명 로그가 있으면(조정이 실제로 있었던
    # 건) 그 이전값/이후값이 곧 원본/최종 값 — 확정 시점(POST /거래명세서요청)에 기록한 것과
    # 정확히 같은 소스라 재계산 없이 그대로 재사용한다. 로그가 없으면(조정 자체가 없었던 건) 원본과
    # 최종이 항상 같으므로 기존 방식대로 하나의 값을 양쪽에 재사용해도 안전하다.
    def _원본최종(필드명, 폴백):
        for h in 수정이력:
            if h["필드명"] == 필드명:
                return float(h["이전값"]), float(h["이후값"])
        return 폴백, 폴백

    세액_표시 = (
        float(거래명세서["세액_직접입력"])
        if 거래명세서["세액_직접입력"] is not None
        else float(거래명세서["세액"] or 0)
    )
    공급가액_표시 = (
        float(거래명세서["공급가액_직접입력"])
        if 거래명세서["공급가액_직접입력"] is not None
        else float(거래명세서["공급가액"] or 0)
    )
    원본세액, 최종세액 = _원본최종("세액", 세액_표시)
    원본공급가액, 최종공급가액 = _원본최종("공급가액", 공급가액_표시)
    return {
        "존재함": True,
        "편집여부": bool(거래명세서["편집여부"]),
        "원본세액": 원본세액,
        "최종세액": 최종세액,
        "원본공급가액": 원본공급가액,
        "최종공급가액": 최종공급가액,
        "원본": 원본,
        "최종": 최종,
        "수정이력": 수정이력,
    }


@app.get("/거래명세서수정이력", dependencies=인증필요)
def 거래명세서수정이력():
    """전체 거래명세서에 걸친 공급가액·부가세·품목 수정 이력을 최신순으로 반환 — "수정이력" 하위탭
    전용(2026-08-13, 마케팅팀 요청). 개별 건 상세는 GET /거래명세서품목이력/{no}(팝업)가 담당하고,
    이 엔드포인트는 "누가 언제 무엇을 조정했는지" 전체를 한눈에 훑어보는 용도라 필터링 없이 전량
    반환한다(발행 건수 대비 이력이 생기는 건은 적을 것으로 예상 — 총계 조정·품목 수정이 실제로
    있었던 건에만 행이 생김)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT h.거래명세서번호, h.거래처명, i.담당자, h.업무명, h.필드명, h.이전값, h.이후값, h.비고,
                       h.수정자, h.수정일시
                FROM 거래명세서_수정이력 h
                LEFT JOIN 거래명세서 i ON i.거래명세서번호 = h.거래명세서번호
                ORDER BY h.수정일시 DESC
            """)
            return cur.fetchall()


@app.get("/거래명세서품명이력", dependencies=인증필요)
def 거래명세서품명이력(거래처명: str = Query(...)):
    """이 거래처가 **가장 최근에 확정**했을 때 "새 행 추가"(조건식 없는 수동 입력 행)로 넣었던
    품명을 중복 없이 반환 — 미리보기 화면을 열면 프론트가 곧바로 오른쪽 표에 행으로 자동 반영한다
    (2026-08-12, 사용자 요청 — 처음엔 전체 이력을 체크박스로 골라 추가하는 방식 → "선택 없이 전월
    기준 자동 반영" → 취소 사례를 계기로 "전월(달력 기준)"이 아니라 "가장 최근 저장분" 기준으로
    최종 확정. 조건식(청구품목규칙) 결과는 이 엔드포인트와 무관하게 이미 항상 자동 재적용되고
    있으므로 그대로 두고, 새 행(수동 입력)만 대상으로 함).

    "가장 최근"은 이 거래처의 거래명세서품명이력 중 가장 최신 등록일(=가장 최근 확정 시점, 취소
    여부와 무관)과 **정확히 같은 등록일**을 가진 품명들로 판정한다 — 확정할 때마다 그 확정에 쓰인
    품명들의 등록일을 함께 NOW()로 갱신하므로(POST /거래명세서요청), 같은 확정에 쓰인 품명들은
    항상 같은 등록일을 공유하고, 그보다 오래된(=최신 확정에 다시 안 쓰인) 품명은 자연히 제외된다.

    별도 영속 테이블 `거래명세서품명이력`에서 조회한다 — 처음엔 거래명세서_품목(구분='최종')을
    직접 JOIN했으나, 거래명세서를 취소하면 거래명세서_품목이 FK CASCADE로 함께 삭제돼 품명 이력도
    같이 사라지는 버그가 실사용 중 발견됨(거래명세서의 감사 기록 생명주기와 "품명 자동완성용
    이력"의 생명주기는 서로 다른데 같은 테이블에 얹혀 있었던 게 원인). 이 테이블은
    POST /거래명세서요청 확정 시(수동입력=true인 행만)에만 채워지고, 취소 API는 전혀 건드리지
    않아 취소해도 남는다. 업무명별로는 세분화하지 않고 거래처 전체 이력을 반환한다(세분화하려면
    거래명세서_의뢰서→운영통계자료까지 JOIN해야 해서 복잡도 대비 실익이 낮다고 판단, 사용자 확인).

    품명과 함께 작업구분(조)도 반환한다(2026-08-12) — 새 행을 자동 반영할 때 품명뿐 아니라 조까지
    가장 최근 확정 값으로 채워달라는 요청. 수량·단가 등 나머지는 매번 다를 수 있어 여전히 이력에
    안 남기고 프론트가 매번 새로 입력하게 둔다(범위 그대로)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 품명, 조 FROM 거래명세서품명이력 WHERE 거래처명=%s "
                "AND 등록일 = (SELECT MAX(등록일) FROM 거래명세서품명이력 WHERE 거래처명=%s) "
                "ORDER BY 품명",
                (거래처명, 거래처명),
            )
            return cur.fetchall()


@app.get("/통합시트기본값", dependencies=인증필요)
def 통합시트기본값(거래처명: str = Query(...), 업무명_목록: List[str] = Query(default=[])):
    """작업구분(조)이 2개 이상일 때 맨 앞에 붙는 "통합 명세서" 시트의 시트명·상단 업무명 입력칸
    기본값 — 이 거래처+업무명조합으로 마지막에 저장했던 값을 반환한다(2026-08-12, 확정 없으면
    두 값 다 null). 업무명조합 키는 항상 서버가 billing.업무명조합_키()로 재계산(프론트가 직접
    조립하지 않음, 2026-08-08 결정과 동일한 이유 — 정규화 어긋날 위험 없음)."""
    업무명조합 = billing.업무명조합_키(업무명_목록)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 통합시트명, 통합상단업무명 FROM 통합시트설정 WHERE 거래처명=%s AND 업무명조합=%s",
                (거래처명, 업무명조합),
            )
            row = cur.fetchone()
    return {
        "통합시트명": row["통합시트명"] if row else None,
        "상단업무명": row["통합상단업무명"] if row else None,
    }


class 거래명세서미리보기_요청(BaseModel):
    model_config = ConfigDict(title="InvoicePreviewRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    의뢰서번호_목록: List[str]
    # 프론트가 지금 화면에서 선택 중인 업무명 집합을 명시적으로 보낸다(2026-08-08 다중업무명
    # 규칙조회 재설계) — 서버 재계산값(billing.build_품목행() 결과)과 다르면 400으로 막아
    # "선택이 바뀐 줄 모르고 옛 상태로 확정"하는 걸 방지한다(사업부 혼합 검증과 동일 관례).
    # None이면(하위호환) 서버 재계산값만 그대로 사용.
    업무명_목록: Optional[List[str]] = None


@app.post("/거래명세서미리보기", dependencies=인증필요)
def 거래명세서미리보기(요청: 거래명세서미리보기_요청):
    """
    아직 채번 전인 의뢰서번호_목록으로 원본 품목(왼쪽 표)을 미리 계산하고, 그 거래처+업무명조합에
    저장된 청구 규칙(통합조건식 우선, 없으면 개별조건식 병합)이 있으면 적용해 고객사 청구 명세서
    초안(오른쪽 표)까지 함께 반환(Excel 생성 없음, DB 쓰기 없음). GET /거래명세서엑셀/{no}와 DB
    조회 패턴은 동일하지만, 이미 발급된 거래명세서번호 대신 화면에서 방금 체크한 의뢰서번호를
    직접 받는다는 점만 다르다. billing.build_품목행()·정렬행_원본목록()·적용_규칙()을 재사용
    (2026-07-20 최초 작성, 2026-07-22 규칙엔진 확장, 2026-08-08 통합조건식/다중업무명 지원).
    """
    if not 요청.의뢰서번호_목록:
        raise HTTPException(status_code=400, detail="의뢰서번호_목록이 비어 있습니다")

    with get_db() as conn:
        with conn.cursor() as cur:
            자리표시자 = ", ".join(["%s"] * len(요청.의뢰서번호_목록))
            cur.execute(
                f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 청구페이지, 확정청구페이지, 건수, 장수, 압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지 "
                f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                요청.의뢰서번호_목록,
            )
            원본행 = cur.fetchall()

            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 요청.의뢰서번호_목록)
            자재단가행 = _자재단가df_조회(cur)
            공정단가행 = _공정단가df_조회(cur)
            우편요금맵 = _우편요금맵_조회(cur, 요청.의뢰서번호_목록)

            if not 원본행:
                raise HTTPException(status_code=404, detail="해당 업무의뢰서 데이터를 운영통계자료에서 찾을 수 없습니다")

            # 거래처명 혼합 방어 — 통합조건식 키가 (거래처명, 업무명조합)이라 거래처명이 뒤섞이면
            # 키 자체가 무의미해진다(2026-08-08, 기존 사업부 혼합 검증과 동일한 관례).
            거래처명목록 = sorted({r["거래처명"] for r in 원본행})
            if len(거래처명목록) > 1:
                raise HTTPException(
                    status_code=400,
                    detail=f"선택한 의뢰서의 거래처명이 서로 다릅니다({', '.join(거래처명목록)}). 거래처를 통일해서 요청해 주세요.",
                )

            df_all = pd.DataFrame(원본행)
            단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
            자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
            자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
            공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])

            단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
            자재map = billing.build_자재map(자재df)
            의뢰서번호셋 = {int(float(x)) for x in 요청.의뢰서번호_목록}

            # 단가미등록(2026-08-22): 실제 수량은 있는데 단가가 없어 원본 표에 줄 자체가 안 생기는
            # 품목을 build_품목행() 호출과 동시에 수집(계산 결과에는 영향 없음, 안내 전용) — 상세:
            # `.claude/plans/plan_단가미등록_품목누락_감지.md`.
            단가미등록 = []
            정렬행, 총합계, 거래처명, 업무명_목록, 코드맵, 부가세구분맵 = billing.build_품목행(
                df_all, 단가맵, 자재map, 의뢰서번호셋, 미등록수집=단가미등록, 우편요금맵=우편요금맵
            )
            if not 정렬행:
                raise HTTPException(status_code=500, detail="미리보기 생성 실패 — 해당 업무의뢰서에 등록된 단가가 없을 수 있습니다")

            if 요청.업무명_목록 is not None and set(요청.업무명_목록) != set(업무명_목록):
                raise HTTPException(status_code=400, detail="선택 정보가 최신 상태가 아닙니다. 새로고침 후 다시 시도해 주세요.")

            원본목록 = billing.정렬행_원본목록(정렬행, 코드맵)
            규칙출처, 업무명조합_사용중, 통합조건식_불일치, 규칙목록 = _통합조건식_판정(cur, 거래처명, set(업무명_목록))
            # 출력비·봉입비가 장수·봉입건수 대신 자재사용량 기준으로 청구되므로(2026-08-17), 원본이
            # 서로 다를 때(생산공정관리시스템 입력 단계 휴먼 에러로 확인됨) 화면에 알려준다.
            수량불일치 = billing.자재수량_불일치_목록(df_all, 자재map, 의뢰서번호셋)

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
        "업무명_목록": 업무명_목록,
        # 통합조건식 상태(2026-08-08 신규) — "통합"(정확 일치 적용됨) | "불일치"(부족/초과, 프론트가
        # 확정을 막고 사용자 선택을 받아야 함) | "개별"(관련 통합조건식 없음, 개별조건식 병합 적용).
        "규칙출처": 규칙출처,
        "업무명조합_사용중": 업무명조합_사용중,
        "통합조건식_불일치": 통합조건식_불일치,
        "부가세구분": 부가세구분,
        "부가세오류": 부가세오류,
        "수량불일치": 수량불일치,
        "단가미등록": 단가미등록,
        "품목": [
            {"코드": row["코드"], "품목": row["품목"], "작업명": row["작업명"], "자재명": row.get("자재명"),
             "수량": row["수량"], "단가": row["단가"], "금액": row["금액"]}
            for row in 원본목록
        ],
        "규칙적용결과": [
            {"최종청구품명": row["표시품명"], "코드": row["코드"] or None,
             "수량": row["수량"], "단가": row["단가"], "금액": row["금액"], "조": row.get("조"),
             "구분표시": row.get("구분표시"), "규격": row.get("규격"), "비고": row.get("비고")}
            for row in 규칙적용결과
        ],
        "미분류": [
            {"코드": row["코드"], "품목": row["품목"], "작업명": row["작업명"], "자재명": row.get("자재명"),
             "수량": row["수량"], "단가": row["단가"], "금액": row["금액"]}
            for row in 미분류
        ],
        # 규칙목록(순서·최종청구품명·조건·조) — 프론트가 GET /청구품목규칙로 따로 재조회하지 않고
        # 이 응답을 그대로 써서 규칙적용결과와 인덱스 1:1 대응을 유지한다(2026-08-01, 별도
        # 왕복 없이 한 번의 응답으로 끝내도록 단순화).
        "규칙목록": [
            {"순서": r["순서"], "최종청구품명": r["최종청구품명"], "조건": r["조건"], "조": r.get("조"),
             "구분표시": r.get("구분표시"), "규격": r.get("규격"), "비고": r.get("비고")}
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
    # Excel B열(구분)·H열(규격)·N열(비고) 직접 입력(2026-08-11) — 없으면 미지정(하위호환)
    구분표시: Optional[str] = None
    규격: Optional[str] = None
    비고: Optional[str] = None


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


# ── 담당자(당사 담당자 연락처) 관리 API (2026-08-11) ──────────────
# 거래명세서 하단 담당자 연락처(Excel B31) 자동 표기용. "담당자 우선" 구조(사용자 확정) —
# 담당자 1명 밑에 여러 거래처+업무명을 등록해두고, 담당자 정보(이름·전화·이메일) 수정은
# 이 화면 한 곳에서만 하면 연결된 모든 거래처에 자동 반영된다(_담당자_조회() 참고).

@app.get("/담당자", dependencies=인증필요)
def 담당자_목록():
    """담당자 목록 + 각자 담당하는 거래처+업무명 매핑을 중첩 구조로 함께 반환 — 프론트가
    담당자 하나를 선택하면 곧바로 그 담당 거래처 목록을 보여줄 수 있게 한다."""
    from collections import defaultdict
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM 담당자 ORDER BY 이름")
            담당자행 = cur.fetchall()
            cur.execute("SELECT id, 담당자_id, 거래처명, 업무명 FROM 담당자_담당거래처 ORDER BY 거래처명, 업무명")
            매핑행 = cur.fetchall()
    매핑맵 = defaultdict(list)
    for m in 매핑행:
        매핑맵[m["담당자_id"]].append({"id": m["id"], "거래처명": m["거래처명"], "업무명": m["업무명"]})
    for d in 담당자행:
        d["담당거래처"] = 매핑맵.get(d["id"], [])
    return 담당자행


class 담당자행(BaseModel):
    model_config = ConfigDict(title="StaffCreateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    이름: str
    전화번호: Optional[str] = None
    이메일: Optional[str] = None


@app.post("/담당자", dependencies=인증필요)
def 담당자_추가(담당자: 담당자행):
    이름 = (담당자.이름 or "").strip()
    if not 이름:
        raise HTTPException(status_code=400, detail="이름은 필수입니다")
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO 담당자 (이름, 전화번호, 이메일) VALUES (%s,%s,%s)",
                    (이름, 담당자.전화번호, 담당자.이메일),
                )
                새_id = cur.lastrowid
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")
    return {"status": "ok", "id": 새_id}


@app.put("/담당자/{id}", dependencies=인증필요)
def 담당자_수정_요청(id: int, 담당자: 담당자행):
    이름 = (담당자.이름 or "").strip()
    if not 이름:
        raise HTTPException(status_code=400, detail="이름은 필수입니다")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE 담당자 SET 이름=%s, 전화번호=%s, 이메일=%s WHERE id=%s",
                (이름, 담당자.전화번호, 담당자.이메일, id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 id의 담당자가 없습니다")
    return {"status": "ok"}


@app.delete("/담당자", dependencies=인증필요)
def 담당자_삭제(id: List[int] = Query(...)):
    """담당자 삭제 — 담당 거래처+업무명 매핑도 함께 삭제됨(담당자_담당거래처 FK ON DELETE CASCADE)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 담당자 WHERE id=%s", [(i,) for i in id])
    return {"status": "ok", "삭제요청건수": len(id)}


class 담당거래처행(BaseModel):
    model_config = ConfigDict(title="StaffClientMappingRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래처명: str
    업무명: Optional[str] = None  # 비우면 그 거래처 전체 기본 담당자


@app.post("/담당자/{id}/거래처", dependencies=인증필요)
def 담당자_거래처_추가(id: int, 매핑: 담당거래처행):
    거래처명 = (매핑.거래처명 or "").strip()
    if not 거래처명:
        raise HTTPException(status_code=400, detail="거래처명은 필수입니다")
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM 담당자 WHERE id=%s", (id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="해당 id의 담당자가 없습니다")
                if 매핑.업무명 is None:
                    # 단가마스터 기본단가와 동일한 이유로(NULL끼리는 UNIQUE 제약이 중복을 못 막음)
                    # 거래처 전체 기본 담당자는 API 레벨에서 직접 중복 체크(2026-08-11).
                    cur.execute(
                        "SELECT 1 FROM 담당자_담당거래처 WHERE 거래처명=%s AND 업무명 IS NULL",
                        (거래처명,),
                    )
                    if cur.fetchone():
                        raise HTTPException(status_code=409, detail="이미 이 거래처의 기본 담당자가 등록되어 있습니다")
                cur.execute(
                    "INSERT INTO 담당자_담당거래처 (담당자_id, 거래처명, 업무명) VALUES (%s,%s,%s)",
                    (id, 거래처명, 매핑.업무명),
                )
                새_id = cur.lastrowid
    except HTTPException:
        raise
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 등록된 거래처+업무명입니다")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")
    return {"status": "ok", "id": 새_id}


@app.delete("/담당자/거래처", dependencies=인증필요)
def 담당자_거래처_삭제(id: List[int] = Query(...)):
    """담당자_담당거래처 매핑 id 목록으로 삭제(담당자 본인은 그대로 유지)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 담당자_담당거래처 WHERE id=%s", [(i,) for i in id])
    return {"status": "ok", "삭제요청건수": len(id)}


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
    인쇄면: Literal["단면", "양면"] = "양면"
    청구단위: Literal["페이지기준", "장수기준"] = "페이지기준"
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
                         부가세구분, 인쇄면, 청구단위, 비고, 등록일, 수정일)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (단가.거래처명, 단가.업무명, 단가.작업명, 단가.출력단가, 단가.봉입단가, 단가.추가봉입단가, 단가.동봉물삽입단가,
                      단가.용지제작단가, 단가.봉투제작단가, 단가.삽지제작단가, 단가.각대대봉투단가, 단가.각대대봉투봉입단가,
                      단가.부가세구분, 단가.인쇄면, 단가.청구단위, 단가.비고, 오늘, 오늘))
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
    인쇄면: Literal["단면", "양면"] = "양면"
    청구단위: Literal["페이지기준", "장수기준"] = "페이지기준"
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
                    각대대봉투단가=%s, 각대대봉투봉입단가=%s, 부가세구분=%s, 인쇄면=%s, 청구단위=%s,
                    비고=%s, 수정일=%s
                WHERE id=%s
            """, (단가.출력단가, 단가.봉입단가, 단가.추가봉입단가, 단가.동봉물삽입단가,
                  단가.용지제작단가, 단가.봉투제작단가, 단가.삽지제작단가,
                  단가.각대대봉투단가, 단가.각대대봉투봉입단가, 단가.부가세구분, 단가.인쇄면, 단가.청구단위,
                  단가.비고, 오늘, id))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 id의 단가가 없습니다")
    return {"status": "ok"}


@app.delete("/단가마스터", dependencies=인증필요)
def 단가마스터_삭제(id: List[int] = Query(...)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 단가마스터 WHERE id=%s", [(i,) for i in id])
    return {"status": "ok", "삭제요청건수": len(id)}


@app.get("/자재목록", dependencies=인증필요)
def 자재목록(거래처명: str, 업무명: Optional[str] = None, 작업명: Optional[str] = None):
    """단가마스터 자재단가 등록 화면에서 "실제 이 업무에 어떤 자재가 쓰였는지" 후보를 보여주기 위한
    조회(2026-08-16, 사용자 피드백 — 자재코드·자재명을 사용자가 알 방법이 없는데 직접 타이핑하게
    만들면 안 됨을 지적받아 추가). 자재사용현황에는 거래처명이 없어 운영통계자료와 업무의뢰서번호로
    조인해서 좁힌다 — 청구 계산(_자재map_조회())만큼 엄격하게 작업내역서번호까지 맞출 필요는 없는
    "후보 제안"용이라 업무의뢰서번호+작업명 수준으로만 좁힌다."""
    sql = """
        SELECT DISTINCT m.자재코드, m.자재명, m.자재종류
        FROM 자재사용현황 m
        JOIN 운영통계자료 o ON m.업무의뢰서번호 = o.업무의뢰서번호
        WHERE o.거래처명 = %s
          AND (m.자재코드 IS NOT NULL OR m.자재명 IS NOT NULL)
    """
    params: list = [거래처명]
    if 업무명:
        sql += " AND o.업무명 = %s"
        params.append(업무명)
    if 작업명:
        sql += " AND o.작업명 = %s AND (m.작업명 = o.작업명 OR m.작업명 IS NULL)"
        params.append(작업명)
    sql += " ORDER BY m.자재종류, m.자재명"
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


# ── 단가마스터_자재단가 쓰기 API (자재명 정규화, 2026-08-15) ──────────────────────
# 같은 (거래처+업무명+작업명) 조합의 F(용지)·삽지비 항목이라도 실제로 사용된 자재(용지·삽지
# 종류)에 따라 단가가 달라야 하는 업무를 지원 — 등록된 자재단가가 없는 코드는 지금까지처럼
# 단가마스터의 기본단가 컬럼(용지제작단가 등) 하나로 계산된다(billing._자재별_처리() 참고).
# 코드는 Excel 표시코드(P/M/F/E 등)가 아니라 build_품목행()의 품목명 문자열을 그대로 쓴다
# ("출력자재비"·"봉입자재비"·"삽지비") — Excel 코드 M이 봉입비·삽지비 둘 다에 쓰여 겹치는 문제를
# 피하기 위함(billing.py build_품목행() 참고).

class 자재단가_매칭항목(BaseModel):
    model_config = ConfigDict(title="MaterialPriceMatchItem")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    자재코드: Optional[int] = None
    자재명: Optional[str] = None


class 단가마스터_자재단가_신규(BaseModel):
    model_config = ConfigDict(title="PricingMaterialCreateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    # 출력비·봉입비(2026-08-17 추가) — 각각 용지·봉투 자재사용량 기준으로 청구수량이 정해지는
    # 항목이라 출력자재비·봉입자재비와 같은 자재종류 후보를 공유한다(코드_자재종류맵, 프론트엔드
    # PricingMaterialSection.tsx 참고).
    코드: Literal["출력비", "출력자재비", "봉입비", "봉입자재비", "삽지비"]
    단가: float = 0
    표시명: Optional[str] = None
    # 인쇄면(2026-08-22, "출력비" 코드 행 전용) — 이 자재(용지 종류)가 단면/양면 중 어느 쪽인지.
    # None(미설정)이면 계산 시 거래처+업무명 레벨 값으로 폴백한다. 다른 코드 행에 저장해도 계산에는
    # 안 쓰인다(단순화). 상세: `.claude/plans/plan_출력비_장수페이지기준_인쇄면자재별.md`.
    인쇄면: Optional[Literal["단면", "양면"]] = None
    비고: Optional[str] = None
    매칭자재: List[자재단가_매칭항목] = []


def _매칭자재_검증(매칭자재: List[자재단가_매칭항목]):
    if not 매칭자재:
        raise HTTPException(status_code=400, detail="매칭할 자재를 1개 이상 입력해 주세요")
    for m in 매칭자재:
        if m.자재코드 is None and not (m.자재명 and m.자재명.strip()):
            raise HTTPException(status_code=400, detail="매칭 자재는 자재코드 또는 자재명 중 하나가 필요합니다")


@app.post("/단가마스터/{id}/자재단가", dependencies=인증필요)
def 단가마스터_자재단가_추가(id: int, 자재단가: 단가마스터_자재단가_신규):
    _매칭자재_검증(자재단가.매칭자재)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM 단가마스터 WHERE id=%s", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="해당 id의 단가마스터가 없습니다")
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO 단가마스터_자재단가 (단가마스터_id, 코드, 단가, 표시명, 인쇄면, 비고) "
                    "VALUES (%s,%s,%s,%s,%s,%s)",
                    (id, 자재단가.코드, 자재단가.단가, 자재단가.표시명, 자재단가.인쇄면, 자재단가.비고),
                )
                자재단가_id = cur.lastrowid
                cur.executemany(
                    "INSERT INTO 단가마스터_자재단가_매칭 (자재단가_id, 자재코드, 자재명) VALUES (%s,%s,%s)",
                    [(자재단가_id, m.자재코드, m.자재명) for m in 자재단가.매칭자재],
                )
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 같은 코드로 등록된 자재(코드 또는 이름)가 있습니다")
    return {"status": "ok", "id": 자재단가_id}


class 단가마스터_자재단가_수정(BaseModel):
    model_config = ConfigDict(title="PricingMaterialUpdateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    단가: float = 0
    표시명: Optional[str] = None
    인쇄면: Optional[Literal["단면", "양면"]] = None
    비고: Optional[str] = None
    매칭자재: List[자재단가_매칭항목] = []


@app.put("/단가마스터/자재단가/{id}", dependencies=인증필요)
def 단가마스터_자재단가_수정_요청(id: int, 자재단가: 단가마스터_자재단가_수정):
    """단가·표시명·비고 수정과 함께 매칭자재 목록을 통째로 교체(DELETE 후 INSERT — 단가마스터 규칙
    저장 등 이 프로젝트의 다른 "목록 통째 교체" API들과 동일한 관례).
    경로 파라미터명은 반드시 영문이어야 함(SKILL-13 — 한글 파라미터명은 Starlette 라우팅 정규식이
    인식 못 해 /docs엔 정상 표시되지만 실제 호출은 항상 404가 나는 함정이 있음)."""
    자재단가_id = id
    _매칭자재_검증(자재단가.매칭자재)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE 단가마스터_자재단가 SET 단가=%s, 표시명=%s, 인쇄면=%s, 비고=%s WHERE id=%s",
                    (자재단가.단가, 자재단가.표시명, 자재단가.인쇄면, 자재단가.비고, 자재단가_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="해당 id의 자재단가가 없습니다")
                cur.execute("DELETE FROM 단가마스터_자재단가_매칭 WHERE 자재단가_id=%s", (자재단가_id,))
                cur.executemany(
                    "INSERT INTO 단가마스터_자재단가_매칭 (자재단가_id, 자재코드, 자재명) VALUES (%s,%s,%s)",
                    [(자재단가_id, m.자재코드, m.자재명) for m in 자재단가.매칭자재],
                )
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 같은 코드로 등록된 자재(코드 또는 이름)가 있습니다")
    return {"status": "ok"}


@app.delete("/단가마스터/자재단가", dependencies=인증필요)
def 단가마스터_자재단가_삭제(id: List[int] = Query(...)):
    """매칭자재 행은 단가마스터_자재단가_매칭의 ON DELETE CASCADE FK로 함께 삭제된다."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 단가마스터_자재단가 WHERE id=%s", [(i,) for i in id])
    return {"status": "ok", "삭제요청건수": len(id)}


# ── 단가마스터_공정단가 쓰기 API (공정별 단가 청구, 2026-08-21) ──────────────────
# 당사 생산공정관리시스템이 5월분부터 운영통계자료에 내려주는 공정 세분화 컬럼(압착·주소출력·
# 중철·제본·무광코팅·유광코팅·에폭시·날개접지 — 봉입·수작업은 기존 봉입단가·각대대봉투봉입단가를
# 재사용해 이 테이블 대상이 아님)에 (거래처+업무명+작업명) 단위로 단가를 등록한다. 자재단가와
# 달리 공정은 고정 8종 enum이라 매칭 자식 테이블이 없다(`.claude/plans/plan_공정별단가청구.md`).

class 단가마스터_공정단가_신규(BaseModel):
    model_config = ConfigDict(title="ProcessPriceCreateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    공정코드: Literal["압착", "주소출력", "중철", "제본", "무광코팅", "유광코팅", "에폭시", "날개접지"]
    단가: float = 0
    비고: Optional[str] = None


@app.post("/단가마스터/{id}/공정단가", dependencies=인증필요)
def 단가마스터_공정단가_추가(id: int, 공정단가: 단가마스터_공정단가_신규):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM 단가마스터 WHERE id=%s", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="해당 id의 단가마스터가 없습니다")
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO 단가마스터_공정단가 (단가마스터_id, 공정코드, 단가, 비고) VALUES (%s,%s,%s,%s)",
                    (id, 공정단가.공정코드, 공정단가.단가, 공정단가.비고),
                )
                공정단가_id = cur.lastrowid
    except pymysql.err.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 같은 공정코드로 등록된 단가가 있습니다")
    return {"status": "ok", "id": 공정단가_id}


class 단가마스터_공정단가_수정(BaseModel):
    model_config = ConfigDict(title="ProcessPriceUpdateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    단가: float = 0
    비고: Optional[str] = None


@app.put("/단가마스터/공정단가/{id}", dependencies=인증필요)
def 단가마스터_공정단가_수정_요청(id: int, 공정단가: 단가마스터_공정단가_수정):
    """경로 파라미터명은 반드시 영문이어야 함(SKILL-13)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE 단가마스터_공정단가 SET 단가=%s, 비고=%s WHERE id=%s",
                (공정단가.단가, 공정단가.비고, id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 id의 공정단가가 없습니다")
    return {"status": "ok"}


@app.delete("/단가마스터/공정단가", dependencies=인증필요)
def 단가마스터_공정단가_삭제(id: List[int] = Query(...)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.executemany("DELETE FROM 단가마스터_공정단가 WHERE id=%s", [(i,) for i in id])
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


def _품목_변경_이력(원본목록, 최종목록):
    """원본(자동계산)·최종(확정) 품목 목록을 (코드, 표시품명) 키로 매칭해 항목별 변경 이력을
    만든다(2026-08-13, 사용자 요청 — "이 품목은 이렇게 바뀌었다"를 구체적으로 남기고 싶음).

    행을 자유롭게 추가·삭제·이름 변경(규칙 적용)할 수 있어 일반적인 리스트 diff는 정의가 모호하지만,
    "품명을 그대로 두고 수량·단가만 고치는" 가장 흔한 케이스는 (코드, 표시품명)이 원본·최종 양쪽에서
    동일하게 유지되므로 이 키로 매칭하면 충분히 유용하다. 이름 자체가 바뀐 행(규칙 적용·수동 개명)은
    이 키로 매칭이 안 돼 "품목삭제(원본명)"+"품목추가(새이름)" 한 쌍으로 나타난다 — 근사치이지만
    정확한 rename 추적은 별도 식별자 없이는 불가능해 범위 밖으로 둔다.

    반환: [{"필드명","이전값","이후값","비고"}, ...] — 거래명세서_수정이력 INSERT용."""
    def _키(r):
        return (r.get("코드") or "", r.get("표시품명") or "")

    원본맵, 최종맵 = {}, {}
    for r in 원본목록:
        원본맵.setdefault(_키(r), []).append(r)
    for r in 최종목록:
        최종맵.setdefault(_키(r), []).append(r)

    이력 = []
    for 키, 최종행들 in 최종맵.items():
        품명 = 키[1] or "(품명없음)"
        원본행들 = 원본맵.get(키)
        if not 원본행들:
            # "새 행 추가"로 값을 안 채운 빈 행(수량·금액 둘 다 0)은 실제 추가로 보지 않는다
            # (billing.적용_규칙() 결과를 거를 때 이미 쓰던 것과 같은 기준, 2026-08-14).
            if not (최종행들[0].get("수량") or 최종행들[0].get("금액")):
                continue
            이력.append({"필드명": "품목추가", "이전값": None, "이후값": round(최종행들[0]["금액"], 2), "비고": 품명})
            continue
        원본행, 최종행 = 원본행들[0], 최종행들[0]
        for 필드 in ("수량", "단가", "금액"):
            이전, 이후 = 원본행.get(필드), 최종행.get(필드)
            if round(이전 or 0, 2) != round(이후 or 0, 2):
                이력.append({"필드명": 필드, "이전값": 이전, "이후값": 이후, "비고": 품명})
    for 키, 원본행들 in 원본맵.items():
        if 키 not in 최종맵:
            품명 = 키[1] or "(품명없음)"
            이력.append({"필드명": "품목삭제", "이전값": round(원본행들[0]["금액"], 2), "이후값": None, "비고": 품명})
    return 이력


class 품목행_입력(BaseModel):
    model_config = ConfigDict(title="InvoiceItemRowInput")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    코드: Optional[str] = None
    품목: str  # 원본이면 품목명, 규칙/수동 편집 결과면 최종청구품명
    수량: float
    단가: Optional[float] = None  # 병합된 항목의 단가가 갈리면 None("—")
    금액: float
    조: Optional[str] = None  # 조별 분할발급(2026-07-29) — 없으면 거래명세서 1건(하위호환)
    # Excel B열(구분)·H열(규격)·N열(비고) 직접 입력(2026-08-11) — 없으면 미지정(하위호환)
    구분표시: Optional[str] = None
    규격: Optional[str] = None
    비고: Optional[str] = None
    # 조건식(규칙) 없이 "새 행 추가"로 직접 타이핑한 행이면 true(2026-08-12) — 거래명세서품명이력에
    # 저장할 대상을 이 값으로 걸러낸다(규칙 품명은 청구품목규칙으로 이미 따로 재사용되므로 제외).
    수동입력: Optional[bool] = None


class 통합조건식_해결_입력(BaseModel):
    model_config = ConfigDict(title="IntegratedRuleResolution")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    # 미리보기 응답의 통합조건식_불일치.기존업무명조합을 그대로 echo — 신규 업무명조합은 서버가
    # 요청.업무명_목록으로부터 billing.업무명조합_키()로 재계산해서 쓴다(프론트가 직접 조립하면
    # 정규화 규칙이 미묘하게 어긋날 위험이 있어, 2026-08-08 설계 단순화).
    기존업무명조합: str


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
    업무명_목록: Optional[List[str]] = None          # 규칙 저장 시 거래처명과 함께 규칙의 소속 키로 사용(2026-08-08, 기존 "업무명" 단수 필드 대체)
    업무명조합_사용중: Optional[str] = None          # 미리보기가 "통합"(정확 일치)으로 응답했던 그 조합 — 그대로 echo
    통합조건식_해결: Optional[통합조건식_해결_입력] = None  # 부족/초과 배너에서 사용자가 "제외/추가하고 확정"을 선택했을 때만 채워짐
    품목_최종: Optional[List[품목행_입력]] = None  # 미리보기 오른쪽 표를 사람이 최종 확정한 내용
    규칙: Optional[List[청구품목규칙_행]] = None    # 이번에 새로 만들거나 고친 조건식 규칙 — 있으면 저장/재사용
    # 작업구분(조)이 2개 이상일 때 맨 앞에 붙는 "통합 명세서" 시트의 시트명·상단 업무명(2026-08-12).
    # 조가 1개뿐이거나 없으면 무시된다(서버가 최종목록의 조 종류 수로 다시 판정).
    통합시트명: Optional[str] = None
    상단업무명: Optional[str] = None
    # 공급가액·부가세 직접 입력(override, 2026-08-13, 마케팅팀 요청 — 원단위 절사·반올림 차이 보정).
    # 조가 2개 이상이면 통합시트명이 함께 있어야만 유효(서버가 최종 검증, 아래 참고). 합계는 항상
    # 두 값의 합으로 파생 — 별도로 받지 않는다.
    공급가액_직접입력: Optional[float] = None
    세액_직접입력: Optional[float] = None


@app.post("/거래명세서요청", dependencies=인증필요)
def 거래명세서요청(요청: 거래명세서요청_요청, 사용자: str = Depends(auth.get_current_user)):
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

    # 사업부·거래처명 혼합 방어 검증 (2026-07-19 사업부, 2026-08-08 거래처명 추가) — 프론트도
    # 검증하지만 서버가 최종 방어선. 통합조건식 키가 (거래처명, 업무명조합)이라 거래처명이
    # 뒤섞이면 키 자체가 무의미해진다. HTTPException도 Exception의 서브클래스라 아래
    # try/except 블록 안에서 raise하면 500으로 감싸여버리므로, 반드시 이 블록 밖에서 먼저 검증한다.
    with get_db() as conn:
        with conn.cursor() as cur:
            자리표시자 = ", ".join(["%s"] * len(요청.의뢰서번호_목록))
            cur.execute(
                f"SELECT DISTINCT 사업부, 거래처명 FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                요청.의뢰서번호_목록,
            )
            혼합확인행 = cur.fetchall()
    사업부목록 = sorted({r["사업부"] for r in 혼합확인행})
    거래처명목록 = sorted({r["거래처명"] for r in 혼합확인행})
    if len(사업부목록) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"선택한 의뢰서의 사업부가 서로 다릅니다({', '.join(사업부목록)}). 사업부를 통일해서 요청해 주세요.",
        )
    if len(거래처명목록) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"선택한 의뢰서의 거래처명이 서로 다릅니다({', '.join(거래처명목록)}). 거래처를 통일해서 요청해 주세요.",
        )

    if 요청.규칙 is not None and not 요청.업무명_목록:
        raise HTTPException(status_code=400, detail="규칙을 저장하려면 업무명_목록이 필요합니다")

    # 원본을 항상 다시 계산한다(서버가 직접 재계산 — 화면에서 보낸 "원본"을 그대로 믿지 않음, 조작
    # 방지 겸 정합성 보장). 품목_최종이 왔으면 편집여부 판정·거래명세서_품목 저장에도 재사용하고,
    # 어느 경우든 부가세구분 일관성 검증에 쓴다(2026-08-04 — 예전엔 품목_최종이 없으면 이 계산을
    # 건너뛰어 부가세 검증이 전혀 없었음).
    with get_db() as conn:
        with conn.cursor() as cur:
            자리표시자 = ", ".join(["%s"] * len(요청.의뢰서번호_목록))
            cur.execute(
                f"SELECT 업무의뢰서번호, 작업명, 거래처명, 업무명, 청구페이지, 확정청구페이지, 건수, 장수, 압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지 "
                f"FROM 운영통계자료 WHERE 업무의뢰서번호 IN ({자리표시자})",
                요청.의뢰서번호_목록,
            )
            원본행 = cur.fetchall()
            cur.execute("SELECT * FROM 단가마스터")
            단가행 = cur.fetchall()
            자재행 = _자재map_조회(cur, 요청.의뢰서번호_목록)
            자재단가행 = _자재단가df_조회(cur)
            공정단가행 = _공정단가df_조회(cur)
            우편요금맵 = _우편요금맵_조회(cur, 요청.의뢰서번호_목록)

    df_all = pd.DataFrame(원본행)
    단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
    자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
    자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
    공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])
    단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
    자재map = billing.build_자재map(자재df)
    의뢰서번호셋 = {int(float(x)) for x in 요청.의뢰서번호_목록}
    정렬행, _총, _거래처, _업무_목록, 코드맵, 부가세구분맵 = billing.build_품목행(
        df_all, 단가맵, 자재map, 의뢰서번호셋, 우편요금맵=우편요금맵
    )
    원본목록 = billing.정렬행_원본목록(정렬행, 코드맵)

    try:
        부가세구분 = billing.결정_부가세구분(부가세구분맵)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 감사이력 diff 기준선(2026-08-13, 사용자 요청) — "시스템 자동계산 원본"이 아니라 "조건식 적용
    # 후 고객사 청구명세서"를 기준으로 삼는다. POST /거래명세서미리보기와 동일한 방식으로 이 거래처+
    # 업무명에 적용되는 규칙을 다시 찾아 billing.적용_규칙()으로 재현 — 저장된 규칙이 없으면(좌측
    # 그대로 시작한 경우) 원본목록 그대로가 기준선이 된다. 편집여부(부분취소 게이트)는 이 기준선과
    # 무관하게 원본 vs 최종 그대로 유지(아래 품목_변경 참고) — 부분취소는 품목 스냅샷을 다시
    # 만들어주지 않으므로, 조건식만 적용됐을 뿐이어도 여전히 보수적으로 막아야 안전하다.
    with get_db() as conn:
        with conn.cursor() as cur:
            _, _, _, 규칙목록 = _통합조건식_판정(cur, 요청.거래처명, set(_업무_목록))
    if 규칙목록:
        규칙적용결과, 미분류 = billing.적용_규칙(원본목록, 규칙목록)
        # 어느 규칙에도 안 걸린 원본 항목(미분류)은 화면 오른쪽 표에 자동으로 안 나타나지만(초기_rightRows는
        # 규칙적용결과만 씀), "좌측 그대로 시작"·수동 추가로 사용자가 그대로 가져올 수 있다 — 이런
        # 항목까지 기준선에서 빼면 값이 하나도 안 바뀐 원본 그대로의 항목이 "품목추가"로 오탐된다
        # (2026-08-13, 종단 테스트로 발견). 규칙적용결과(필터링됨)+미분류(원본 형태 그대로, 표시품명
        # 키 이미 호환) 둘 다 기준선에 포함시켜야 "진짜 신규 항목"만 추가로 잡힌다.
        기준목록 = [r for r in 규칙적용결과 if r["수량"] != 0 or r["금액"] != 0] + 미분류
    else:
        기준목록 = 원본목록

    최종목록 = [
        {"코드": r.코드 or "", "표시품명": r.품목, "수량": r.수량, "단가": r.단가,
         "금액": round(r.금액, 2), "조": r.조 or None,
         "구분표시": r.구분표시 or None, "규격": r.규격 or None, "비고": r.비고 or None,
         "수동입력": bool(r.수동입력)}
        for r in (요청.품목_최종 or [])
    ]

    def _비교키(row):
        return (row.get("코드") or "", row.get("표시품명") or "", round(row.get("수량", 0), 2), row.get("단가"), round(row.get("금액", 0), 2))

    품목_변경 = False
    기준_대비_변경 = False
    if 요청.품목_최종 is not None:
        원본_비교 = [_비교키(r) for r in 원본목록]
        최종_비교 = [_비교키(r) for r in 최종목록]
        품목_변경 = 원본_비교 != 최종_비교
        # 감사이력용 — 조건식 적용 결과(기준목록) 대비 실제 변경 여부. 편집여부(품목_변경, 위)와는
        # 독립적으로 판단한다 — 편집여부는 부분취소 게이트라 보수적으로 원본 기준을 유지하고,
        # 이 값은 "편집됨" 배지·수정이력 기록 여부에만 쓰인다.
        기준_비교 = [_비교키(r) for r in 기준목록]
        기준_대비_변경 = 기준_비교 != 최종_비교

    from datetime import date
    오늘 = str(date.today())

    # 통합 명세서 시트(조 2개 이상일 때만 의미 있음, 2026-08-12) — 프론트가 보낸 값이 있어도
    # 실제 조 종류가 2개 미만이면 서버가 무시한다(요청 조작 방지 겸, 조건이 안 맞는데 값만 남는
    # 상황 방지).
    조집합 = {r["조"] for r in 최종목록 if r.get("조")}
    통합시트명_저장 = (요청.통합시트명 or "").strip() or None
    상단업무명_저장 = (요청.상단업무명 or "").strip() or None
    if len(조집합) < 2:
        통합시트명_저장 = None
        상단업무명_저장 = None

    # 공급가액·부가세 직접 입력(override, 2026-08-13) — 조가 2개 이상인데 통합시트명이 없으면(통합
    # 시트 자체가 생성 안 됨) 무의미하므로 무효화. 조가 1개 이하면 그 유일한 시트에 적용되므로
    # 통합시트명과 무관하게 항상 허용(위 통합시트명_저장 트리밍과 동일한 방어 패턴).
    공급가액_직접입력_저장 = 요청.공급가액_직접입력
    세액_직접입력_저장 = 요청.세액_직접입력
    # 둘 중 하나만 오면(정상 흐름에선 프론트가 항상 쌍으로 보냄) 애매한 반쪽짜리 override가 되므로
    # 무효화 — 다운로드 로직이 두 값을 항상 쌍으로 읽으므로 하나만 있으면 처리할 수 없다.
    if 공급가액_직접입력_저장 is None or 세액_직접입력_저장 is None:
        공급가액_직접입력_저장 = None
        세액_직접입력_저장 = None
    if len(조집합) >= 2 and not 통합시트명_저장:
        공급가액_직접입력_저장 = None
        세액_직접입력_저장 = None

    # 감사이력 "이전값" 기준선 — 사람이 손대기 전(기준목록, 조건식 적용 후 청구명세서) 기준으로
    # 공급가액·세액을 다시 계산한다(2026-08-14, 총액 변경 로그를 override 여부와 무관하게 통일).
    # 다운로드 시점(_거래명세서_엑셀_시트목록())과 동일하게 billing.부가세_표시분리()로 계산해야
    # "포함" 거래처에서도 어긋나지 않는다(부가세_계산()은 표시 전용이 아니라 순수 계산용이라 "포함"이면
    # 세액을 0으로만 반환해 여기 목적과 다름).
    기준_품목합 = sum(r["금액"] for r in 기준목록) if 기준목록 else _총
    기준_공급가액, 기준_세액 = billing.부가세_표시분리(부가세구분, round(기준_품목합, 2))

    # 실제로 저장될 값 — override가 있으면 그 값, 없으면 프론트가 보낸 요청.공급가액/세액(최종목록
    # 기준으로 이미 부가세_표시분리와 동일한 방식으로 계산해서 보냄, 2026-08-13 버그 수정 이후).
    저장될_공급가액 = 공급가액_직접입력_저장 if 공급가액_직접입력_저장 is not None else round(요청.공급가액, 2)
    저장될_세액 = 세액_직접입력_저장 if 세액_직접입력_저장 is not None else round(요청.세액, 2)

    # 총계 override뿐 아니라 품목 수량·단가·금액 수정으로 총액이 "자동으로" 바뀐 경우도 감사이력에
    # 남기기 위해, 기준선을 override 유무와 무관하게 항상 기준목록으로 통일한다(2026-08-14). 부수
    # 효과: 이 경우도 기존 규칙대로 부분취소가 막힌다 — 이미 품목_변경으로도 편집여부=1이 되던
    # 케이스라 실질적인 동작 변화는 없음(중복 감지를 하나로 통합한 것뿐).
    공급가액_조정됨 = round(저장될_공급가액, 2) != round(기준_공급가액, 2)
    세액_조정됨 = round(저장될_세액, 2) != round(기준_세액, 2)
    합계_조정됨 = round(저장될_공급가액 + 저장될_세액, 2) != round(기준_공급가액 + 기준_세액, 2)
    편집여부 = 1 if (품목_변경 or 공급가액_조정됨 or 세액_조정됨) else 0

    # 실제로 감사이력에 남을 품목 변경 항목을 미리 계산해둔다(2026-08-14, 0값 새 행 필터 적용 후
    # 결과) — 아래 INSERT 루프와 최종 응답의 "수정이력있음"(배지 낙관적 업데이트)이 서로 다른
    # 기준으로 판정하면(응답만 기준_대비_변경 원시값을 쓰면) 빈 행만 추가한 경우 배지가 잠깐 떴다가
    # 새로고침 후에야 사라지는 불일치가 생긴다 — 같은 값을 공유해 항상 일치시킨다.
    # 기존 저장된 규칙(개별·통합조건식 통틀어 규칙목록, 위에서 조회)이 하나도 없으면 기준선이
    # 원본목록으로 폴백돼(위 "규칙목록 없으면 원본목록" 분기) 품목 비교 자체가 무의미함 — 조건식을
    # 새로 만들면서 동시에 확정한 경우 새로 묶인 항목이 전부 "품목삭제+품목추가" 스푸리어스 기록으로
    # 남는 문제(2026-08-17, D-202608-00079 조사 중 발견) 방지. 공급가액·세액·합계 조정 로그와
    # "편집됨" 배지/부분취소 게이트(편집여부)는 원본목록 기준 그대로라 이 조건과 무관하게 유지된다
    # — 실제 총액이 달라진 경우(예: 미분류 항목 누락)는 이 총계 레벨 신호로 계속 포착된다.
    품목이력_항목 = _품목_변경_이력(기준목록, 최종목록) if (기준_대비_변경 and 규칙목록) else []

    품목_삽입_sql = """
        INSERT INTO 거래명세서_품목
            (거래명세서번호, 구분, 순서, 코드, 품목, 작업명, 조, 구분표시, 규격, 비고, 수량, 단가, 금액)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                거래명세서번호 = _발급_거래명세서번호(cur, 요청.사업부)
                cur.execute("""
                    INSERT INTO 거래명세서
                        (거래명세서번호, 거래처명, 담당자, 발행일자, 품목, 공급가액, 세액, 합계,
                         공급가액_직접입력, 세액_직접입력, 발송여부, 편집여부,
                         통합시트명, 통합상단업무명, 등록일)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, NOW())
                """, (거래명세서번호, 요청.거래처명, 요청.담당자, 오늘, 요청.품목,
                      요청.공급가액, 요청.세액, 요청.합계,
                      공급가액_직접입력_저장, 세액_직접입력_저장, 편집여부,
                      통합시트명_저장, 상단업무명_저장))

                if 공급가액_조정됨:
                    cur.execute(
                        "INSERT INTO 거래명세서_수정이력 (거래명세서번호, 거래처명, 업무명, 필드명, 이전값, 이후값, 수정자) "
                        "VALUES (%s, %s, %s, '공급가액', %s, %s, %s)",
                        (거래명세서번호, 요청.거래처명, 요청.품목, 기준_공급가액, 저장될_공급가액, 사용자),
                    )
                if 세액_조정됨:
                    cur.execute(
                        "INSERT INTO 거래명세서_수정이력 (거래명세서번호, 거래처명, 업무명, 필드명, 이전값, 이후값, 수정자) "
                        "VALUES (%s, %s, %s, '세액', %s, %s, %s)",
                        (거래명세서번호, 요청.거래처명, 요청.품목, 기준_세액, 저장될_세액, 사용자),
                    )
                if 합계_조정됨:
                    # 공급가액·세액 각각의 변경분과 별개로 "총액이 얼마나 바뀌었는지" 한눈에 보이도록
                    # 합계 자체도 별도 필드로 기록(2026-08-14, 사용자 요청 — 품목 수정으로 총액이
                    # 자동으로 바뀌는 경우까지 포함해 항상 함께 남는다).
                    cur.execute(
                        "INSERT INTO 거래명세서_수정이력 (거래명세서번호, 거래처명, 업무명, 필드명, 이전값, 이후값, 수정자) "
                        "VALUES (%s, %s, %s, '합계', %s, %s, %s)",
                        (거래명세서번호, 요청.거래처명, 요청.품목,
                         기준_공급가액 + 기준_세액, 저장될_공급가액 + 저장될_세액, 사용자),
                    )
                if 품목이력_항목:
                    for 항목 in 품목이력_항목:
                        cur.execute(
                            "INSERT INTO 거래명세서_수정이력 (거래명세서번호, 거래처명, 업무명, 필드명, 이전값, 이후값, 비고, 수정자) "
                            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                            (거래명세서번호, 요청.거래처명, 요청.품목, 항목["필드명"], 항목["이전값"], 항목["이후값"], 항목["비고"], 사용자),
                        )

                if 통합시트명_저장 and 상단업무명_저장:
                    # "마지막 입력값" 재사용용 upsert(2026-08-12) — 다음에 같은 거래처+업무명조합으로
                    # 조가 2개 이상인 거래명세서를 만들 때 GET /통합시트기본값이 이 값을 기본으로 제안.
                    cur.execute(
                        "INSERT INTO 통합시트설정 (거래처명, 업무명조합, 통합시트명, 통합상단업무명) "
                        "VALUES (%s, %s, %s, %s) "
                        "ON DUPLICATE KEY UPDATE 통합시트명=VALUES(통합시트명), 통합상단업무명=VALUES(통합상단업무명)",
                        (요청.거래처명, billing.업무명조합_키(요청.업무명_목록 or []),
                         통합시트명_저장, 상단업무명_저장),
                    )

                cur.executemany(
                    "INSERT INTO 거래명세서_의뢰서 (거래명세서번호, 업무의뢰서번호) VALUES (%s, %s)",
                    [(거래명세서번호, n) for n in 요청.의뢰서번호_목록]
                )

                if 요청.품목_최종 is not None:
                    cur.executemany(품목_삽입_sql, [
                        (거래명세서번호, "원본", i, r["코드"], r.get("품목"), r.get("작업명"), None,
                         None, None, None, r["수량"], r["단가"], r["금액"])
                        for i, r in enumerate(원본목록)
                    ])
                    cur.executemany(품목_삽입_sql, [
                        (거래명세서번호, "최종", i, r["코드"] or None, r["표시품명"], None, r["조"],
                         r["구분표시"], r["규격"], r["비고"], r["수량"], r["단가"], r["금액"])
                        for i, r in enumerate(최종목록)
                    ])
                    # "원본 vs 최종 비교" 팝업 왼쪽이 조건식 적용 전 원자재 단위 품명과 조건식 적용
                    # 후 합계(감사이력 기준선)를 섞어 보여주던 불일치 수정(2026-08-18, 사용자 제보) —
                    # 조건식 적용 후·사람이 손대기 전 스냅샷(기준목록, 위에서 이미 계산됨)을 별도
                    # 구분='기준'으로 저장해, 품목이력 조회 시 이 기준으로 "원본" 칸을 채울 수 있게 함.
                    cur.executemany(품목_삽입_sql, [
                        (거래명세서번호, "기준", i, r.get("코드") or None, r.get("표시품명"),
                         r.get("작업명"), r.get("조"), r.get("구분표시"), r.get("규격"), r.get("비고"),
                         r["수량"], r["단가"], r["금액"])
                        for i, r in enumerate(기준목록)
                    ])

                    # 품명 이력 upsert(2026-08-12) — 거래명세서_품목과 달리 취소(전체취소 시
                    # DELETE FROM 거래명세서 CASCADE)해도 지워지지 않는 별도 테이블. 미리보기
                    # "새 행 추가" 자동완성·"과거 품명 추가"(체크박스 일괄추가) 후보용.
                    # 조건식(규칙) 품명은 청구품목규칙으로 이미 재사용되므로 제외 — 수동입력=true인
                    # 행만("새 행 추가"로 직접 타이핑한 것만) 저장한다(사용자 요청, 2026-08-12).
                    # 품명별 조도 함께 저장(2026-08-12 — 자동 반영 시 조까지 복원해달라는 요청).
                    # 같은 확정 안에서 같은 품명이 조를 달리해 여러 번 나오면(드묾) 마지막 값으로 통일 —
                    # uk_거래처품명(거래처명, 품명) 유니크 제약상 한 품명당 조 1개만 저장 가능하기 때문.
                    품명별조 = {
                        r["표시품명"]: r.get("조")
                        for r in 최종목록
                        if r.get("표시품명") and r.get("수동입력")
                    }
                    if 품명별조:
                        cur.executemany(
                            "INSERT INTO 거래명세서품명이력 (거래처명, 품명, 조) VALUES (%s,%s,%s) "
                            "ON DUPLICATE KEY UPDATE 등록일=NOW(), 조=VALUES(조)",
                            [(요청.거래처명, 품명, 조) for 품명, 조 in sorted(품명별조.items())],
                        )

                if 요청.규칙 is not None:
                    # 2026-08-08 다중업무명 규칙조회 재설계: 선택된 업무명이 1개면 개별조건식,
                    # 2개 이상이면 통합조건식에 저장. 통합조건식_해결(부족/초과 배너에서 사용자가
                    # "제외/추가하고 확정"을 선택한 경우)이 오면 기존 통합조건식을 UPDATE로
                    # 재조정(레코드 삭제 아님)한 뒤 그 새 조합으로 저장.
                    S = set(요청.업무명_목록 or [])
                    규칙목록_dict = [r.model_dump() for r in 요청.규칙]
                    if 요청.통합조건식_해결:
                        신규조합 = billing.업무명조합_키(요청.업무명_목록)
                        try:
                            _통합규칙_업무명조합_수정(cur, 요청.거래처명, 요청.통합조건식_해결.기존업무명조합, 신규조합)
                        except pymysql.err.IntegrityError:
                            # 정상 흐름에선 안 생기지만(_통합조건식_판정이 사전에 겹침을 걸러줌),
                            # 데이터가 꼬여 신규조합이 이미 별도 레코드로 존재하면 UPDATE가
                            # UNIQUE(거래처명,업무명조합,순서)와 충돌한다 — 500 대신 명확히 안내.
                            raise HTTPException(
                                status_code=409,
                                detail="이미 같은 업무명조합의 통합조건식이 존재합니다. 화면을 새로고침해 다시 시도해 주세요.",
                            )
                        _통합규칙_저장(cur, 요청.거래처명, 신규조합, 규칙목록_dict)
                    elif 요청.업무명조합_사용중:
                        _통합규칙_저장(cur, 요청.거래처명, 요청.업무명조합_사용중, 규칙목록_dict)
                    elif len(S) >= 2:
                        _통합규칙_저장(cur, 요청.거래처명, billing.업무명조합_키(요청.업무명_목록), 규칙목록_dict)
                    elif len(S) == 1:
                        _규칙_저장(cur, 요청.거래처명, next(iter(S)), 규칙목록_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"거래명세서 요청 실패: {e}")

    return {
        "status": "ok",
        "거래명세서번호": 거래명세서번호,
        "편집여부": 편집여부,
        # "편집됨" 배지 낙관적 업데이트용(2026-08-13) — Tab4Invoice.tsx가 새로고침 없이 바로 반영.
        # 실제로 INSERT된 품목이력_항목 기준(2026-08-14, 0값 새 행처럼 필터로 걸러진 경우 배지가
        # 잠깐 떴다 사라지는 불일치 방지).
        "수정이력있음": bool(품목이력_항목 or 공급가액_조정됨 or 세액_조정됨 or 합계_조정됨),
        # 배지 색상(증가=빨강/감소=파랑) 낙관적 업데이트용(2026-08-14) — 변동 없으면 0.0.
        "합계증감": round(저장될_공급가액 + 저장될_세액 - 기준_공급가액 - 기준_세액, 2),
        # 발행요청목록/발행완료 "청구공급가액" 열 낙관적 업데이트용(2026-08-14).
        "확정공급가액": 저장될_공급가액,
    }


class 거래명세서번호_요청(BaseModel):
    model_config = ConfigDict(title="InvoiceNumberRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래명세서번호: str


@app.post("/거래명세서발행", dependencies=인증필요)
def 거래명세서발행(요청: 거래명세서번호_요청):
    """발송여부=1(발행완료)로 변경. Excel 생성은 app.py가 로컬에서 그대로 담당.
    발행가능=0(거래처 승인 대기 중, 2026-08-12)이면 409로 거부한다 — 프론트가 여러 건을 순차
    처리하며 실패만 모아 안내하는 기존 패턴(Tab4IssuedList.tsx의 publishOrUnpublish())을 그대로
    타서, 승인 대기 건만 자동으로 제외되고 나머지는 정상 발행된다."""
    from datetime import date
    오늘 = str(date.today())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 발행가능 FROM 거래명세서 WHERE 거래명세서번호=%s", (요청.거래명세서번호,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="해당 거래명세서번호가 없습니다")
            if not row["발행가능"]:
                raise HTTPException(
                    status_code=409,
                    detail="거래처 승인 대기 중이라 발행할 수 없습니다(발행가능 꺼짐)",
                )
            cur.execute(
                "UPDATE 거래명세서 SET 발송여부=1, 발송일=%s WHERE 거래명세서번호=%s",
                (오늘, 요청.거래명세서번호)
            )
    return {"status": "ok", "거래명세서번호": 요청.거래명세서번호}


class 발행가능_요청(BaseModel):
    model_config = ConfigDict(title="PublishGateRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    값: bool


@app.put("/거래명세서/{no}/발행가능", dependencies=인증필요)
def 발행가능_변경(no: str, 요청: 발행가능_요청):
    """발행요청목록에서 마케팅 담당자가 "거래처 승인 대기 중"을 켬/끔(2026-08-12). 꺼두면
    POST /거래명세서발행이 그 건을 409로 거부한다. 경로 파라미터명은 'no'(영문 고정, SKILL-13 —
    한글 파라미터명은 Starlette 라우팅 자체가 항상 실패)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE 거래명세서 SET 발행가능=%s WHERE 거래명세서번호=%s",
                (1 if 요청.값 else 0, no),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="해당 거래명세서번호가 없습니다")
    return {"status": "ok", "거래명세서번호": no, "발행가능": 요청.값}


class 거래명세서발행취소_요청(BaseModel):
    model_config = ConfigDict(title="InvoiceUnpublishRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래명세서번호: str
    취소사유: str  # 2026-08-14, 발행완료 "발행 취소(되돌리기)" — 필수(사용자 확정)


@app.post("/거래명세서발행취소", dependencies=인증필요)
def 거래명세서발행취소(요청: 거래명세서발행취소_요청, 사용자: str = Depends(auth.get_current_user)):
    """발송여부=0(발행대기)으로 되돌림 — app.py의 '발행 취소'(되돌리기) 버튼에 대응 (계획엔 없었으나 동일 테이블 UPDATE라 함께 추가).
    사유는 필수(2026-08-14) — 서버가 최종 방어선(프론트 검증과 별개, 이 프로젝트 기존 관례)."""
    사유 = 요청.취소사유.strip()
    if not 사유:
        raise HTTPException(status_code=400, detail="취소사유를 입력해 주세요")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 거래처명, 품목 FROM 거래명세서 WHERE 거래명세서번호=%s",
                (요청.거래명세서번호,),
            )
            헤더 = cur.fetchone()
            if not 헤더:
                raise HTTPException(status_code=404, detail="해당 거래명세서번호가 없습니다")

            cur.execute(
                "UPDATE 거래명세서 SET 발송여부=0, 발송일=NULL WHERE 거래명세서번호=%s",
                (요청.거래명세서번호,)
            )
            cur.execute(
                "INSERT INTO 거래명세서_수정이력 (거래명세서번호, 거래처명, 업무명, 필드명, 비고, 수정자) "
                "VALUES (%s, %s, %s, '발행취소(되돌리기)', %s, %s)",
                (요청.거래명세서번호, 헤더["거래처명"], 헤더["품목"], 사유, 사용자),
            )
    return {"status": "ok", "거래명세서번호": 요청.거래명세서번호}


class 거래명세서부분취소_요청(BaseModel):
    model_config = ConfigDict(title="InvoicePartialCancelRequest")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    거래명세서번호: str
    의뢰서번호_목록: List[str]
    취소사유: Optional[str] = None  # 2026-08-14, 발행요청목록 "취소" — 선택 입력(안 써도 진행)


@app.post("/거래명세서부분취소", dependencies=인증필요)
def 거래명세서부분취소(요청: 거래명세서부분취소_요청, 사용자: str = Depends(auth.get_current_user)):
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
            cur.execute("SELECT 발송여부, 편집여부, 거래처명, 품목 FROM 거래명세서 WHERE 거래명세서번호=%s", (요청.거래명세서번호,))
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

    종류 = "전체취소" if not 남을_목록 else "부분취소"
    사유 = (요청.취소사유 or "").strip() or None
    비고 = f"{종류}(의뢰서 {len(취소_대상)}건)" + (f" — {사유}" if 사유 else "")

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO 거래명세서_수정이력 (거래명세서번호, 거래처명, 업무명, 필드명, 비고, 수정자) "
                    "VALUES (%s, %s, %s, '취소', %s, %s)",
                    (요청.거래명세서번호, 헤더["거래처명"], 헤더["품목"], 비고, 사용자),
                )

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
                    f"마케팅담당자, 청구페이지, 확정청구페이지, 건수, 출력페이지, 장수, "
                    f"압착, 주소출력, 봉입, 수작업, 중철, 제본, 무광코팅, 유광코팅, 에폭시, 날개접지 FROM 운영통계자료 "
                    f"WHERE 업무의뢰서번호 IN ({남을_자리표시자})",
                    남을_목록,
                )
                원본행 = cur.fetchall()
                cur.execute("SELECT * FROM 단가마스터")
                단가행 = cur.fetchall()
                자재행 = _자재map_조회(cur, 남을_목록)
                자재단가행 = _자재단가df_조회(cur)
                공정단가행 = _공정단가df_조회(cur)
                우편요금맵 = _우편요금맵_조회(cur, 남을_목록)

                df_남을 = pd.DataFrame(원본행)
                단가df = pd.DataFrame(단가행) if 단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명"])
                자재df = pd.DataFrame(자재행) if 자재행 else pd.DataFrame(
                    columns=["업무의뢰서번호", "작업이름", "자재종류", "자재형태", "자재코드", "자재명", "사용량"])
                자재단가df = pd.DataFrame(자재단가행) if 자재단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "품목", "단가", "자재단가_id", "표시명", "인쇄면", "자재코드", "자재명"])
                공정단가df = pd.DataFrame(공정단가행) if 공정단가행 else pd.DataFrame(columns=["거래처명", "업무명", "작업명", "공정코드", "단가"])

                summary = billing.build_의뢰서_summary(df_남을, 자재df)
                단가맵 = billing.build_단가맵(단가df, 자재단가df, 공정단가df)
                자재map = billing.build_자재map(자재df)
                남을_번호셋 = {int(float(x)) for x in 남을_목록}
                # 부분취소 후 남는 의뢰서들의 금액은 원래 거래명세서요청() 확정 시점과 정확히 같은
                # 방식(build_품목행())으로 재계산해야 한다 — 예전엔 calc_공급가맵()(미발행목록 등에
                # 쓰이는 요약용 함수)을 썼는데, 2026-08-17 출력비·봉입비 자재사용량 기준 전환이
                # build_품목행()에만 반영되고 calc_공급가맵()엔 안 돼 있어서, 부분취소를 하면 정확했던
                # 금액이 부정확한 값으로 덮어써지는 실제 청구 금액 버그가 있었다(2026-08-20 수정).
                정렬행, 총합계, _거래처, _업무_목록, _코드맵, 부가세구분맵 = billing.build_품목행(
                    df_남을, 단가맵, 자재map, 남을_번호셋, 우편요금맵=우편요금맵
                )
                공급가액 = round(총합계)
                try:
                    부가세구분 = billing.결정_부가세구분(부가세구분맵)
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=str(e))
                세액, 합계 = billing.부가세_계산(부가세구분, 공급가액)
                품목 = ", ".join(sorted(set(summary["업무명"])))
                담당자 = ", ".join(sorted(set(summary["마케팅담당자"])))

                # override(공급가액_직접입력/세액_직접입력)는 남은 라인아이템 기준으로 더 이상 유효하지
                # 않으므로(2026-08-13) NULL로 리셋해 자동재계산으로 폴백시킨다 — 그대로 두면 부분취소
                # 후에도 옛 override 값이 남아 바뀐 품목 구성과 안 맞게 될 위험이 있다.
                cur.execute(
                    "UPDATE 거래명세서 SET 품목=%s, 담당자=%s, 공급가액=%s, 세액=%s, 합계=%s, "
                    "공급가액_직접입력=NULL, 세액_직접입력=NULL WHERE 거래명세서번호=%s",
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
    # 2026-08-21 추가 — 공정 세분화 컬럼 10개(`.claude/plans/plan_공정별단가청구.md`). 전부
    # 기본값 0이라 구버전 송신 시스템이 이 필드를 안 보내도 요청이 깨지지 않음(하위호환).
    압착: int = 0
    주소출력: int = 0
    봉입: int = 0
    수작업: int = 0
    중철: int = 0
    제본: int = 0
    무광코팅: int = 0
    유광코팅: int = 0
    에폭시: int = 0
    날개접지: int = 0


class 자재행(BaseModel):
    model_config = ConfigDict(title="MaterialUsageRecord")  # Swagger 표시용 영문 별명 — 필드명은 한글 그대로

    작업내역서번호: int
    작업일자: str
    자재종류: str
    작업명: Optional[str] = None  # 2026-07-19 추가 — 아직 실제로 보내주는 곳 없음(API규격서.md 요청 메모 참고)
    자재코드: Optional[int] = None  # 2026-08-15 추가 — 아직 실제로 보내주는 곳 없음, 단가마스터 자재명 정규화용(자재명보다 매칭 우선순위 높음)
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
        INSERT INTO 자재사용현황 (업무의뢰서번호, 작업내역서번호, 작업명, 작업일자, 자재종류, 자재형태, 자재코드, 자재명, 사용량)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
