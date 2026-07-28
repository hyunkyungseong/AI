"""
SQLite DB 초기화 스크립트
실행: python scripts/init_db.py
결과: work/dashboard.db 생성 (기존 DB는 마이그레이션)
"""

import sqlite3
import openpyxl
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DB_PATH  = BASE_DIR / "work" / "dashboard.db"
XLS_PATH = BASE_DIR / "data" / "세금계산서.xlsx"


def create_tables(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS 거래처마스터 (
            거래처명        TEXT PRIMARY KEY,
            사업자등록번호  TEXT,
            수신이메일      TEXT,
            비고            TEXT,
            등록일          TEXT DEFAULT (date('now','localtime')),
            수정일          TEXT DEFAULT (date('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS 단가마스터 (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            거래처명  TEXT NOT NULL,
            업무명    TEXT,
            작업명    TEXT,
            출력단가          REAL DEFAULT 0,
            봉입단가          REAL DEFAULT 0,
            추가봉입단가      REAL DEFAULT 0,
            동봉물삽입단가    REAL DEFAULT 0,
            용지제작단가      REAL DEFAULT 0,
            봉투제작단가      REAL DEFAULT 0,
            삽지제작단가      REAL DEFAULT 0,
            각대대봉투단가    REAL DEFAULT 0,
            각대대봉투봉입단가 REAL DEFAULT 0,
            비고      TEXT,
            등록일    TEXT DEFAULT (date('now','localtime')),
            수정일    TEXT DEFAULT (date('now','localtime')),
            UNIQUE(거래처명, 업무명, 작업명)
        );

        CREATE TABLE IF NOT EXISTS 거래명세서이력 (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            거래처명            TEXT,
            업무의뢰서번호목록  TEXT,
            발행일자            TEXT,
            품목                TEXT,
            공급가액            REAL,
            세액                REAL,
            합계                REAL,
            발송여부            INTEGER DEFAULT 0,
            발송일              TEXT,
            파일경로            TEXT,
            담당자              TEXT,
            등록일              TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS 거래명세서번호_카운터 (
            사업부     TEXT NOT NULL,
            연월       TEXT NOT NULL,
            마지막순번 INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (사업부, 연월)
        );
    """)
    conn.commit()


def migrate_db(conn):
    """
    기존 거래처마스터의 단가 필드 → 단가마스터(기본단가)로 이관 후 필드 제거
    """
    cur = conn.cursor()

    # 거래처마스터에 단가 컬럼이 없으면 이미 마이그레이션 완료
    cur.execute("PRAGMA table_info(거래처마스터)")
    cols = [row[1] for row in cur.fetchall()]
    if "출력단가" not in cols:
        return

    print("  [마이그레이션] 단가마스터 테이블 신규 생성 및 데이터 이관 중...")

    # 단가마스터 생성
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS 단가마스터 (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            거래처명  TEXT NOT NULL,
            업무명    TEXT,
            작업명    TEXT,
            출력단가      REAL DEFAULT 0,
            봉입단가      REAL DEFAULT 0,
            추가봉입단가  REAL DEFAULT 0,
            용지제작단가  REAL DEFAULT 0,
            봉투제작단가  REAL DEFAULT 0,
            삽지제작단가  REAL DEFAULT 0,
            비고      TEXT,
            등록일    TEXT DEFAULT (date('now','localtime')),
            수정일    TEXT DEFAULT (date('now','localtime')),
            UNIQUE(거래처명, 업무명, 작업명)
        );
    """)

    # 기존 거래처마스터 단가 → 단가마스터 기본단가(업무명=NULL, 작업명=NULL)로 이관
    cur.execute("PRAGMA table_info(거래처마스터)")
    cols = [row[1] for row in cur.fetchall()]
    단가컬럼 = ["출력단가", "봉입단가", "추가봉입단가", "용지제작단가", "봉투제작단가"]

    if all(c in cols for c in 단가컬럼):  # 항상 True (위에서 출력단가 존재 확인했으므로)
        cur.execute("SELECT 거래처명, 출력단가, 봉입단가, 추가봉입단가, 용지제작단가, 봉투제작단가 FROM 거래처마스터")
        rows = cur.fetchall()
        for r in rows:
            conn.execute("""
                INSERT OR IGNORE INTO 단가마스터
                    (거래처명, 업무명, 작업명, 출력단가, 봉입단가, 추가봉입단가, 용지제작단가, 봉투제작단가)
                VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)
            """, r)
        print(f"    → {len(rows)}개 거래처 기본단가 이관 완료")

        # 거래처마스터에서 단가 필드 제거 (SQLite 3.35+ 지원)
        for col in 단가컬럼:
            try:
                conn.execute(f"ALTER TABLE 거래처마스터 DROP COLUMN {col}")
            except Exception:
                pass
        print("    → 거래처마스터 단가 필드 제거 완료")

    conn.commit()
    print("  [마이그레이션] 완료")


def migrate_단가마스터_컬럼(conn):
    """단가마스터 신규 컬럼 추가 (없을 때만 ALTER TABLE 실행)"""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(단가마스터)")
    existing = {row[1] for row in cur.fetchall()}
    추가할컬럼 = {
        "삽지제작단가":       "REAL DEFAULT 0",
        "각대대봉투단가":     "REAL DEFAULT 0",
        "각대대봉투봉입단가": "REAL DEFAULT 0",
        "동봉물삽입단가":     "REAL DEFAULT 0",
    }
    for col, col_type in 추가할컬럼.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE 단가마스터 ADD COLUMN {col} {col_type}")
            print(f"  [마이그레이션] 단가마스터.{col} 컬럼 추가")
            if col == "동봉물삽입단가":
                # 기존 거래처는 "추가봉입단가"와 같은 값으로 백필 — 추가봉입비에서 삽지를 분리하는
                # 계산식 변경(2026-07-24, scripts/billing.py) 직후에도 총 청구액이 그대로 유지되도록 함.
                conn.execute("UPDATE 단가마스터 SET 동봉물삽입단가 = 추가봉입단가")
                print("  [마이그레이션] 단가마스터.동봉물삽입단가 → 추가봉입단가로 백필 완료")
    conn.commit()


def migrate_거래명세서이력_컬럼(conn):
    """거래명세서이력 신규 컬럼 추가 (없을 때만 ALTER TABLE 실행)"""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(거래명세서이력)")
    existing = {row[1] for row in cur.fetchall()}
    if "거래명세서번호" not in existing:
        conn.execute("ALTER TABLE 거래명세서이력 ADD COLUMN 거래명세서번호 TEXT")
        print("  [마이그레이션] 거래명세서이력.거래명세서번호 컬럼 추가")
    conn.commit()


def parse_요청내용(ws):
    """요청내용 시트에서 거래처 정보 파싱"""
    data = {}
    for row in ws.iter_rows(values_only=True):
        key = row[1]
        val = row[2]
        if key and val:
            data[str(key).strip()] = str(val).strip()
    return data


def seed_master(conn):
    """세금계산서.xlsx 요청내용 시트에서 거래처 마스터 초기 적재"""
    wb = openpyxl.load_workbook(str(XLS_PATH), read_only=True, data_only=True)
    ws = wb["요청내용"]
    info = parse_요청내용(ws)
    wb.close()

    name  = info.get("법인명", "")
    regno = info.get("사업자등록증", "")
    email = info.get("담당자이메일", "")
    note  = info.get("비고", "")

    if not name:
        print("  거래처명 없음 - 건너뜀")
        return

    conn.execute("""
        INSERT OR IGNORE INTO 거래처마스터
            (거래처명, 사업자등록번호, 수신이메일, 비고)
        VALUES (?, ?, ?, ?)
    """, (name, regno, email, note))
    conn.commit()
    print(f"  마스터 적재: {name} / {regno} / {email}")


def main():
    print("[1/3] 테이블 생성 중...")
    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)
    print(f"  DB 위치: {DB_PATH}")

    print("[2/3] DB 마이그레이션 확인 중...")
    migrate_db(conn)
    migrate_단가마스터_컬럼(conn)
    migrate_거래명세서이력_컬럼(conn)

    print("[3/3] 거래처 마스터 초기 데이터 적재 중...")
    seed_master(conn)

    conn.close()
    print("완료")


if __name__ == "__main__":
    main()
