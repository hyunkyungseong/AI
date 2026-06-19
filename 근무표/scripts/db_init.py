"""
DB 초기화 스크립트 — 최초 1회 실행
실행: python scripts/db_init.py
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "schedule.db"
EMPLOYEES_PATH = Path(__file__).parent.parent / "data" / "employees.json"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS employees (
            id      INTEGER PRIMARY KEY,
            name    TEXT NOT NULL,
            shift   TEXT NOT NULL,
            role    TEXT NOT NULL,
            active  INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS off_requests (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            year        INTEGER NOT NULL,
            month       INTEGER NOT NULL,
            day         INTEGER NOT NULL,
            type        TEXT NOT NULL DEFAULT 'requested',
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            UNIQUE(employee_id, year, month, day)
        );

        CREATE TABLE IF NOT EXISTS schedule_rules (
            key     TEXT PRIMARY KEY,
            value   TEXT NOT NULL
        );
    """)

    # 기본 규칙값 삽입 (이미 있으면 무시) — 전임자 확인 후 업데이트 필요
    default_rules = [
        ("max_simultaneous_off", "1"),
        ("min_weekday",          "5"),
        ("min_sunday",           "4"),
        ("off_per_week",         "1"),
    ]
    c.executemany(
        "INSERT OR IGNORE INTO schedule_rules (key, value) VALUES (?, ?)",
        default_rules
    )

    # employees.json 에서 직원 데이터 삽입
    with open(EMPLOYEES_PATH, encoding="utf-8") as f:
        data = json.load(f)

    for shift, roles in data.items():
        for role, members in roles.items():
            for emp in members:
                c.execute(
                    "INSERT OR IGNORE INTO employees (id, name, shift, role, active) VALUES (?, ?, ?, ?, ?)",
                    (emp["id"], emp["name"], shift, emp["role"], 1 if emp["active"] else 0)
                )

    conn.commit()
    conn.close()
    print(f"DB 초기화 완료: {DB_PATH}")


if __name__ == "__main__":
    init_db()
