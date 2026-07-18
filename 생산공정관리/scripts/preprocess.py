"""
운영통계자료.xlsx 전처리 스크립트
실행: python scripts/preprocess.py
결과: work/processed.pkl (대시보드에서 바로 로드) + MariaDB 운영통계자료·자재사용현황 테이블 반영

가공 로직(반제품 처리·거래처명 파싱·사업부 구분·청구페이지 계산)은 scripts/data_transform.py에서 관리 —
api.py(실시간 API 수신)와 동일한 로직을 공유한다.
"""

import sys
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "data" / "운영통계자료.xlsx"
자재_FILE = BASE_DIR / "data" / "자재사용현황.xlsx"
OUTPUT_FILE = BASE_DIR / "work" / "processed.pkl"

sys.path.insert(0, str(Path(__file__).parent))
import data_transform as dt


def load_raw():
    df = pd.read_excel(DATA_FILE, engine="openpyxl")
    df.columns = df.columns.str.strip()
    return df


def load_자재_raw():
    """자재사용현황.xlsx를 읽어 data_transform.merge_자재()가 기대하는 컬럼 형태로 정리"""
    자재df = pd.read_excel(자재_FILE, engine="openpyxl")
    자재df.columns = 자재df.columns.str.strip()
    자재df = 자재df.rename(columns={
        "업무의뢰서코드": "업무의뢰서번호",
        "작업내역서코드": "작업내역서번호",
    })
    자재df["업무의뢰서번호"] = 자재df["업무의뢰서번호"].astype(int)
    자재df["작업내역서번호"] = 자재df["작업내역서번호"].astype(int)
    자재df["작업일자"] = pd.to_datetime(자재df["작업일자"]).dt.strftime("%Y-%m-%d")
    return 자재df


def save_to_mariadb(df):
    """운영통계자료를 MariaDB에 TRUNCATE & INSERT (실패해도 pkl 저장에는 영향 없음 — main()에서 예외 처리)"""
    import pymysql
    import db_config as cfg

    값목록 = [dt.운영통계_행_변환(r) for _, r in df.iterrows()]
    자리표시자 = ", ".join(["%s"] * len(dt.MARIADB_컬럼))
    sql = f"INSERT INTO 운영통계자료 ({', '.join(dt.MARIADB_컬럼)}) VALUES ({자리표시자})"

    conn = pymysql.connect(
        host=cfg.DB_HOST, port=cfg.DB_PORT, user=cfg.DB_USER,
        password=cfg.DB_PASSWORD, database=cfg.DB_NAME, charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE 운영통계자료")
            cur.executemany(sql, 값목록)
        conn.commit()
        print(f"  MariaDB 운영통계자료: {len(값목록):,}행 반영 완료")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def save_자재사용현황_to_mariadb(자재_long):
    """자재사용현황.xlsx 라인 단위 원본을 MariaDB에 TRUNCATE & INSERT"""
    import pymysql
    import db_config as cfg

    값목록 = [dt.자재_행_변환(r) for _, r in 자재_long.iterrows()]
    sql = """
        INSERT INTO 자재사용현황 (업무의뢰서번호, 작업내역서번호, 작업일자, 자재종류, 자재형태, 사용량)
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    conn = pymysql.connect(
        host=cfg.DB_HOST, port=cfg.DB_PORT, user=cfg.DB_USER,
        password=cfg.DB_PASSWORD, database=cfg.DB_NAME, charset="utf8mb4",
    )
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE 자재사용현황")
            cur.executemany(sql, 값목록)
        conn.commit()
        print(f"  MariaDB 자재사용현황: {len(값목록):,}행 반영 완료")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def main():
    print("[1/5] 데이터 로드 중...")
    df = load_raw()
    print(f"  총 {len(df):,}행 로드 완료")

    print("[2/5] 반제품 처리 중...")
    df = dt.apply_반제품_logic(df)

    print("[3/5] 날짜/시간 컬럼 추가 중...")
    df = dt.add_date_columns(df)

    print("[4/5] 거래처명·사업부 추가 및 자재 조인 중...")
    df = dt.add_client_column(df)
    df = dt.add_사업부(df)
    자재df = load_자재_raw()
    df, 자재_long = dt.merge_자재(df, 자재df)

    print("[5/5] 청구페이지 계산 중...")
    df = dt.apply_billing_logic(df)

    df.to_pickle(OUTPUT_FILE)
    print(f"완료 -> {OUTPUT_FILE}")
    print(f"컬럼 목록: {list(df.columns)}")

    print("[MariaDB 반영] 운영통계자료·자재사용현황 테이블에 반영 중...")
    try:
        save_to_mariadb(df)
        save_자재사용현황_to_mariadb(자재_long)
    except Exception as e:
        print(f"  [경고] MariaDB 반영 실패 (pkl은 정상 저장됐으니 대시보드는 그대로 동작합니다): {e}")


if __name__ == "__main__":
    main()
