"""
로그인 계정 생성 스크립트 (관리자가 명령줄에서 직접 실행 — 화면 UI는 아직 없음)
실행: python scripts/create_user.py
"""

import sys
from pathlib import Path
from getpass import getpass

import pymysql

sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg
import auth


def main():
    사용자명 = input("사용자명(로그인 ID): ").strip()
    이름 = input("이름(표시용): ").strip()
    비밀번호 = getpass("비밀번호: ")
    비밀번호_확인용 = getpass("비밀번호 확인: ")

    if not 사용자명 or not 비밀번호:
        print("사용자명과 비밀번호는 비워둘 수 없습니다.")
        return
    if 비밀번호 != 비밀번호_확인용:
        print("비밀번호가 일치하지 않습니다.")
        return

    해시 = auth.비밀번호_해시(비밀번호)

    conn = pymysql.connect(
        host=cfg.DB_HOST, port=cfg.DB_PORT, user=cfg.DB_USER,
        password=cfg.DB_PASSWORD, database=cfg.DB_NAME, charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO 사용자 (사용자명, 비밀번호_해시, 이름) VALUES (%s, %s, %s)",
                (사용자명, 해시, 이름 or None),
            )
        conn.commit()
        print(f"사용자 '{사용자명}' 생성 완료")
    except pymysql.err.IntegrityError:
        print(f"오류: 사용자명 '{사용자명}'이 이미 존재합니다")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
