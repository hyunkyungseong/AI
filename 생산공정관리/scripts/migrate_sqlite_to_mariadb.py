"""
SQLite(work/dashboard.db) → MariaDB(dashboard) 데이터 이관 스크립트
실행: python scripts/migrate_sqlite_to_mariadb.py

이관 대상 (운영통계자료는 대상 아님 — preprocess.py가 이후 별도로 MariaDB에 직접 INSERT하도록 변경 예정):
  1. 거래처마스터
  2. 단가마스터
  3. 거래명세서이력 (JSON-in-TEXT 업무의뢰서번호목록) → 거래명세서 + 거래명세서_의뢰서로 분리 이관
  4. 거래명세서번호_카운터 (채번 연속성 유지를 위해 반드시 함께 이관 필요)

재실행해도 안전(idempotent) — 이미 있는 행은 최신 값으로 덮어씀(UPSERT).
"""

import sys
import json
import sqlite3
from pathlib import Path
from contextlib import contextmanager

import pymysql

sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg

BASE_DIR = Path(__file__).parent.parent
SQLITE_PATH = BASE_DIR / "work" / "dashboard.db"


@contextmanager
def get_maria():
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


def get_sqlite():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def migrate_거래처마스터(sconn, mconn):
    rows = sconn.execute("SELECT * FROM 거래처마스터").fetchall()
    with mconn.cursor() as cur:
        for r in rows:
            cur.execute("""
                INSERT INTO 거래처마스터 (거래처명, 사업자등록번호, 수신이메일, 비고, 등록일, 수정일)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    사업자등록번호=VALUES(사업자등록번호), 수신이메일=VALUES(수신이메일),
                    비고=VALUES(비고), 수정일=VALUES(수정일)
            """, (r["거래처명"], r["사업자등록번호"], r["수신이메일"],
                  r["비고"], r["등록일"], r["수정일"]))
    print(f"  거래처마스터: {len(rows)}행 이관")


def migrate_단가마스터(sconn, mconn):
    rows = sconn.execute("SELECT * FROM 단가마스터").fetchall()
    with mconn.cursor() as cur:
        for r in rows:
            cur.execute("""
                INSERT INTO 단가마스터
                    (id, 거래처명, 업무명, 작업명, 출력단가, 봉입단가, 추가봉입단가,
                     용지제작단가, 봉투제작단가, 삽지제작단가, 각대대봉투단가, 각대대봉투봉입단가,
                     비고, 등록일, 수정일)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    출력단가=VALUES(출력단가), 봉입단가=VALUES(봉입단가),
                    추가봉입단가=VALUES(추가봉입단가), 용지제작단가=VALUES(용지제작단가),
                    봉투제작단가=VALUES(봉투제작단가), 삽지제작단가=VALUES(삽지제작단가),
                    각대대봉투단가=VALUES(각대대봉투단가), 각대대봉투봉입단가=VALUES(각대대봉투봉입단가),
                    비고=VALUES(비고), 수정일=VALUES(수정일)
            """, (r["id"], r["거래처명"], r["업무명"], r["작업명"],
                  r["출력단가"], r["봉입단가"], r["추가봉입단가"], r["용지제작단가"],
                  r["봉투제작단가"], r["삽지제작단가"], r["각대대봉투단가"], r["각대대봉투봉입단가"],
                  r["비고"], r["등록일"], r["수정일"]))
    print(f"  단가마스터: {len(rows)}행 이관")


def migrate_거래명세서이력(sconn, mconn):
    rows = sconn.execute("SELECT * FROM 거래명세서이력").fetchall()
    건너뜀 = 0
    의뢰서_총건수 = 0
    with mconn.cursor() as cur:
        for r in rows:
            거래명세서번호 = r["거래명세서번호"]
            if not 거래명세서번호:
                건너뜀 += 1
                print(f"  [경고] 거래명세서이력.id={r['id']} — 거래명세서번호 없음(구버전 데이터) → 건너뜀")
                continue

            cur.execute("""
                INSERT INTO 거래명세서
                    (거래명세서번호, 거래처명, 담당자, 발행일자, 품목,
                     공급가액, 세액, 합계, 발송여부, 발송일, 파일경로, 등록일)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    거래처명=VALUES(거래처명), 담당자=VALUES(담당자), 품목=VALUES(품목),
                    공급가액=VALUES(공급가액), 세액=VALUES(세액), 합계=VALUES(합계),
                    발송여부=VALUES(발송여부), 발송일=VALUES(발송일), 파일경로=VALUES(파일경로)
            """, (거래명세서번호, r["거래처명"], r["담당자"], r["발행일자"], r["품목"],
                  r["공급가액"], r["세액"], r["합계"], r["발송여부"], r["발송일"],
                  r["파일경로"], r["등록일"]))

            의뢰서목록 = json.loads(r["업무의뢰서번호목록"]) if r["업무의뢰서번호목록"] else []
            for n in 의뢰서목록:
                cur.execute("""
                    INSERT IGNORE INTO 거래명세서_의뢰서 (거래명세서번호, 업무의뢰서번호)
                    VALUES (%s, %s)
                """, (거래명세서번호, str(int(float(n)))))
                의뢰서_총건수 += 1

    print(f"  거래명세서: {len(rows) - 건너뜀}행 이관 ({건너뜀}행 건너뜀), 거래명세서_의뢰서: {의뢰서_총건수}행")


def migrate_거래명세서번호_카운터(sconn, mconn):
    rows = sconn.execute("SELECT * FROM 거래명세서번호_카운터").fetchall()
    with mconn.cursor() as cur:
        for r in rows:
            cur.execute("""
                INSERT INTO 거래명세서번호_카운터 (사업부, 연월, 마지막순번)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE 마지막순번=VALUES(마지막순번)
            """, (r["사업부"], r["연월"], r["마지막순번"]))
    print(f"  거래명세서번호_카운터: {len(rows)}행 이관")


def main():
    if not SQLITE_PATH.exists():
        print(f"오류: SQLite DB가 없습니다 — {SQLITE_PATH}")
        return

    print(f"[이관 시작] {SQLITE_PATH} → {cfg.DB_NAME}@{cfg.DB_HOST}:{cfg.DB_PORT}")
    sconn = get_sqlite()
    try:
        with get_maria() as mconn:
            migrate_거래처마스터(sconn, mconn)
            migrate_단가마스터(sconn, mconn)
            migrate_거래명세서이력(sconn, mconn)
            migrate_거래명세서번호_카운터(sconn, mconn)
    finally:
        sconn.close()
    print("이관 완료")


if __name__ == "__main__":
    main()
