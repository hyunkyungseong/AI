"""
SQLite DB 초기화 스크립트
실행: python scripts/init_db.py
결과: work/dashboard.db 생성
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
            출력단가        REAL DEFAULT 0,
            봉입단가        REAL DEFAULT 0,
            추가봉입단가    REAL DEFAULT 0,
            용지제작단가    REAL DEFAULT 0,
            봉투제작단가    REAL DEFAULT 0,
            비고            TEXT,
            등록일          TEXT DEFAULT (date('now','localtime')),
            수정일          TEXT DEFAULT (date('now','localtime'))
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
    """)
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
    print("[1/2] 테이블 생성 중...")
    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)
    print(f"  DB 위치: {DB_PATH}")

    print("[2/2] 거래처 마스터 초기 데이터 적재 중...")
    seed_master(conn)

    conn.close()
    print("완료")


if __name__ == "__main__":
    main()
