"""
MariaDB(dashboard DB) 초기화 스크립트 — 이 프로젝트 전용 신규 인스턴스
실행: python scripts/init_db_mariadb.py
결과: db_config.py에 지정된 DB(기본값 dashboard)에 6개 테이블 생성

테이블 목록:
  1. 운영통계자료      — preprocess.py 산출물(processed.pkl) 대체용 원본+파생 데이터
  2. 거래처마스터      — 기존 SQLite 구조 동일
  3. 단가마스터        — 기존 SQLite 구조 동일 (각대대봉투 필드 포함)
  4. 거래명세서        — 거래명세서 단위 집계·상태 (구 거래명세서이력의 그룹 정보)
  5. 거래명세서_의뢰서  — 거래명세서에 속한 업무의뢰서번호 (구 업무의뢰서번호목록 JSON-in-TEXT 정규화)
  6. 거래명세서번호_카운터 — 사업부·연월별 채번 순번 (기존 SQLite 구조 동일)
"""

import sys
from pathlib import Path
from contextlib import contextmanager

import pymysql

sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg


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


테이블_SQL = {
    "운영통계자료": """
        CREATE TABLE IF NOT EXISTS 운영통계자료 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            마케팅담당자    VARCHAR(50),
            등록자          VARCHAR(50),
            업무명          VARCHAR(200),
            업무의뢰서번호  INT,
            작업일자        DATETIME,
            작업내역서번호  INT,
            작업내역서      VARCHAR(300),
            작업명          VARCHAR(200),
            작업내역서상세  TEXT,
            반제품여부      CHAR(1),
            P수             VARCHAR(20),
            장수            INT,
            건수            INT,
            출력페이지      INT,
            청구페이지      INT,
            연월            VARCHAR(7),
            날짜            VARCHAR(10),
            시간대          INT,
            거래처명        VARCHAR(100),
            업무명상세      VARCHAR(300),
            사업부          VARCHAR(20),
            확정청구페이지  INT,
            봉투_사용량     INT DEFAULT 0,
            용지_사용량     INT DEFAULT 0,
            삽지_사용량     INT DEFAULT 0,
            미구분_사용량   INT DEFAULT 0,
            INDEX idx_업무의뢰서번호 (업무의뢰서번호),
            INDEX idx_거래처명 (거래처명),
            INDEX idx_연월 (연월)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래처마스터": """
        CREATE TABLE IF NOT EXISTS 거래처마스터 (
            거래처명        VARCHAR(100) PRIMARY KEY,
            사업자등록번호  VARCHAR(30),
            수신이메일      VARCHAR(200),
            비고            TEXT,
            등록일          DATE DEFAULT (CURRENT_DATE),
            수정일          DATE DEFAULT (CURRENT_DATE)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "단가마스터": """
        CREATE TABLE IF NOT EXISTS 단가마스터 (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            거래처명            VARCHAR(100) NOT NULL,
            업무명              VARCHAR(200),
            작업명              VARCHAR(200),
            출력단가            DECIMAL(10,2) DEFAULT 0,
            봉입단가            DECIMAL(10,2) DEFAULT 0,
            추가봉입단가        DECIMAL(10,2) DEFAULT 0,
            용지제작단가        DECIMAL(10,2) DEFAULT 0,
            봉투제작단가        DECIMAL(10,2) DEFAULT 0,
            삽지제작단가        DECIMAL(10,2) DEFAULT 0,
            각대대봉투단가      DECIMAL(10,2) DEFAULT 0,
            각대대봉투봉입단가  DECIMAL(10,2) DEFAULT 0,
            비고                TEXT,
            등록일              DATE DEFAULT (CURRENT_DATE),
            수정일              DATE DEFAULT (CURRENT_DATE),
            UNIQUE KEY uk_단가 (거래처명, 업무명, 작업명)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서": """
        CREATE TABLE IF NOT EXISTS 거래명세서 (
            거래명세서번호  VARCHAR(30) PRIMARY KEY,
            거래처명        VARCHAR(100),
            담당자          VARCHAR(50),
            발행일자        DATE,
            품목            VARCHAR(500),
            공급가액        DECIMAL(12,2),
            세액            DECIMAL(12,2),
            합계            DECIMAL(12,2),
            발송여부        TINYINT DEFAULT 0,
            발송일          DATE,
            파일경로        VARCHAR(500),
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서_의뢰서": """
        CREATE TABLE IF NOT EXISTS 거래명세서_의뢰서 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래명세서번호  VARCHAR(30) NOT NULL,
            업무의뢰서번호  INT NOT NULL,
            UNIQUE KEY uk_의뢰서 (거래명세서번호, 업무의뢰서번호),
            FOREIGN KEY (거래명세서번호) REFERENCES 거래명세서(거래명세서번호)
                ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서번호_카운터": """
        CREATE TABLE IF NOT EXISTS 거래명세서번호_카운터 (
            사업부      VARCHAR(20) NOT NULL,
            연월        VARCHAR(7) NOT NULL,
            마지막순번  INT NOT NULL DEFAULT 0,
            PRIMARY KEY (사업부, 연월)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
}


def main():
    print(f"[MariaDB 초기화] {cfg.DB_NAME}@{cfg.DB_HOST}:{cfg.DB_PORT}")
    with get_db() as conn:
        with conn.cursor() as cur:
            for i, (이름, sql) in enumerate(테이블_SQL.items(), 1):
                cur.execute(sql)
                print(f"  ({i}/{len(테이블_SQL)}) {이름} 테이블 생성 완료")
    print("완료")


if __name__ == "__main__":
    main()
