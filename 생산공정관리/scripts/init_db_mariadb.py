"""
MariaDB(dashboard DB) 초기화 스크립트 — 이 프로젝트 전용 신규 인스턴스
실행: python scripts/init_db_mariadb.py
결과: db_config.py에 지정된 DB(기본값 dashboard)에 14개 테이블 생성

테이블 목록:
  1. 운영통계자료      — preprocess.py 산출물(processed.pkl) 대체용 원본+파생 데이터
  2. 자재사용현황      — data/자재사용현황.xlsx 원본(라인 단위), 운영통계자료의 자재사용량 4컬럼은 이 테이블의 집계값
                       자재형태(일반봉투/각대대봉투)는 자재종류='봉투' 행에서만 값이 있고 나머지는 NULL (2026-07-19 추가)
  3. 거래처마스터      — 기존 SQLite 구조 동일
  4. 단가마스터        — 기존 SQLite 구조 동일 (각대대봉투 필드 포함)
  5. 거래명세서        — 거래명세서 단위 집계·상태 (구 거래명세서이력의 그룹 정보)
  6. 거래명세서_의뢰서  — 거래명세서에 속한 업무의뢰서번호 (구 업무의뢰서번호목록 JSON-in-TEXT 정규화)
  7. 거래명세서번호_카운터 — 사업부·연월별 채번 순번 (기존 SQLite 구조 동일)
  8. 사용자            — 로그인 계정 (담당자별 개별 계정, 비밀번호는 bcrypt 해시로 저장)
  9. 청구품목규칙      — 거래처+업무명(단수)별로 저장되는 재사용 청구 규칙(조건식→최종 청구품명 매핑) (2026-07-22 추가)
  10. 거래명세서_품목   — 거래명세서별 원본/최종 품목 스냅샷(편집 이력용) (2026-07-22 추가)
  11. 청구품목통합규칙  — 거래처+업무명조합(2개 이상)별로 저장되는 재사용 청구 규칙, 개별조건식(9번)보다
                       우선 적용됨 (2026-08-08 재설계로 정식 복원 — 아래 이력 참고)
  12. 담당자            — 거래명세서 하단 담당자 연락처(이름·전화·이메일) (2026-08-11 추가)
  13. 담당자_담당거래처  — 담당자 1명이 담당하는 거래처+업무명 매핑("담당자 우선" 구조) (2026-08-11 추가)
  14. 거래명세서품명이력  — 거래처별로 과거 확정 발행된 최종 품명 이력(거래명세서 취소·삭제와 무관하게
                       영속 — 미리보기 "새 행 추가"/"과거 품명 추가" 자동완성·일괄추가용) (2026-08-12 추가)
  15. 단가마스터_자재단가       — 단가마스터의 코드(F/E/삽지비=M)별로 자재 단위 복수 단가를 등록하는
                       정규화 테이블(2026-08-15 추가). 이 테이블에 행이 없으면 기존 단가마스터의
                       단일 컬럼(용지제작단가 등)이 그대로 폴백으로 쓰임 — 기존 거래처는 영향 없음.
  16. 단가마스터_자재단가_매칭  — 위 자재단가 행 하나에 여러 자재코드/자재명을 묶어 매칭하는 테이블
                       (2026-08-15 추가). 자재코드 우선, 없으면 자재명으로 매칭.

(2026-07-31~2026-08-01에 이 "청구품목통합규칙" 테이블을 "통합조건식" 기능으로 처음 시도했다가
 부작용(매칭 0건 규칙 노출, 단일 업무명 요청 차단)으로 같은 날 코드를 원복함 — 그때는 이 스크립트에서
 더 이상 만들지 않았으나, 이미 그 테이블을 만든 DB(사무실 PC)에는 테이블과 실 데이터가 남아있었음.
 2026-08-08 재설계(부족/초과 시 업무명조합을 UPDATE로 재조정하는 방식)로 정식 복원 — 사무실 PC의
 기존 데이터는 8/1 테스트 중 남은 leftover라 배포 시 정리(삭제) 후 빈 테이블로 재사용하기로 함
 (docs/CHANGELOG.md 2026-08-08 항목 참고).)
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
            업무의뢰서번호  VARCHAR(20),
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
            압착            INT DEFAULT 0,
            주소출력        INT DEFAULT 0,
            봉입            INT DEFAULT 0,
            수작업          INT DEFAULT 0,
            중철            INT DEFAULT 0,
            제본            INT DEFAULT 0,
            무광코팅        INT DEFAULT 0,
            유광코팅        INT DEFAULT 0,
            에폭시          INT DEFAULT 0,
            날개접지        INT DEFAULT 0,
            INDEX idx_업무의뢰서번호 (업무의뢰서번호),
            INDEX idx_거래처명 (거래처명),
            INDEX idx_연월 (연월)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "자재사용현황": """
        CREATE TABLE IF NOT EXISTS 자재사용현황 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            업무의뢰서번호  VARCHAR(20) NOT NULL,
            작업내역서번호  INT NOT NULL,
            작업명          VARCHAR(200) NULL,
            작업일자        DATE NOT NULL,
            자재종류        VARCHAR(20) NOT NULL,
            자재형태        VARCHAR(20) NULL,
            사용량          INT DEFAULT 0,
            UNIQUE KEY uk_자재 (업무의뢰서번호, 작업내역서번호, 작업명, 작업일자, 자재종류, 자재형태),
            INDEX idx_업무의뢰서번호 (업무의뢰서번호)
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
            동봉물삽입단가      DECIMAL(10,2) DEFAULT 0,
            용지제작단가        DECIMAL(10,2) DEFAULT 0,
            봉투제작단가        DECIMAL(10,2) DEFAULT 0,
            삽지제작단가        DECIMAL(10,2) DEFAULT 0,
            각대대봉투단가      DECIMAL(10,2) DEFAULT 0,
            각대대봉투봉입단가  DECIMAL(10,2) DEFAULT 0,
            부가세구분          ENUM('포함','별도') DEFAULT '별도',
            비고                TEXT,
            등록일              DATE DEFAULT (CURRENT_DATE),
            수정일              DATE DEFAULT (CURRENT_DATE),
            UNIQUE KEY uk_단가 (거래처명, 업무명, 작업명)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "단가마스터_자재단가": """
        CREATE TABLE IF NOT EXISTS 단가마스터_자재단가 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            단가마스터_id   INT NOT NULL,
            코드            VARCHAR(10) NOT NULL,
            단가            DECIMAL(10,2) NOT NULL DEFAULT 0,
            표시명          VARCHAR(100),
            비고            TEXT,
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP,
            수정일          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (단가마스터_id) REFERENCES 단가마스터(id) ON DELETE CASCADE,
            INDEX idx_단가마스터_코드 (단가마스터_id, 코드)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "단가마스터_자재단가_매칭": """
        CREATE TABLE IF NOT EXISTS 단가마스터_자재단가_매칭 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            자재단가_id     INT NOT NULL,
            자재코드        INT NULL,
            자재명          VARCHAR(200) NULL,
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (자재단가_id) REFERENCES 단가마스터_자재단가(id) ON DELETE CASCADE,
            UNIQUE KEY uk_자재코드매칭 (자재단가_id, 자재코드),
            UNIQUE KEY uk_자재명매칭 (자재단가_id, 자재명)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "단가마스터_공정단가": """
        CREATE TABLE IF NOT EXISTS 단가마스터_공정단가 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            단가마스터_id   INT NOT NULL,
            공정코드        ENUM('압착','주소출력','중철','제본','무광코팅','유광코팅','에폭시','날개접지') NOT NULL,
            단가            DECIMAL(10,2) NOT NULL DEFAULT 0,
            비고            TEXT,
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP,
            수정일          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (단가마스터_id) REFERENCES 단가마스터(id) ON DELETE CASCADE,
            UNIQUE KEY uk_단가마스터_공정 (단가마스터_id, 공정코드)
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
            공급가액_직접입력 DECIMAL(12,2),
            세액_직접입력   DECIMAL(12,2),
            발송여부        TINYINT DEFAULT 0,
            발행가능        TINYINT DEFAULT 1,
            발송일          DATE,
            파일경로        VARCHAR(500),
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서_의뢰서": """
        CREATE TABLE IF NOT EXISTS 거래명세서_의뢰서 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래명세서번호  VARCHAR(30) NOT NULL,
            업무의뢰서번호  VARCHAR(20) NOT NULL,
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

    "사용자": """
        CREATE TABLE IF NOT EXISTS 사용자 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            사용자명        VARCHAR(50) NOT NULL UNIQUE,
            비밀번호_해시   VARCHAR(255) NOT NULL,
            이름            VARCHAR(50),
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "청구품목규칙": """
        CREATE TABLE IF NOT EXISTS 청구품목규칙 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래처명        VARCHAR(100) NOT NULL,
            업무명          VARCHAR(200) NOT NULL,
            순서            INT NOT NULL,
            최종청구품명    VARCHAR(200) NOT NULL,
            구분표시        VARCHAR(50),
            규격            VARCHAR(50),
            비고            VARCHAR(200),
            조건            JSON NOT NULL,
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP,
            수정일          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_규칙 (거래처명, 업무명, 순서)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서_품목": """
        CREATE TABLE IF NOT EXISTS 거래명세서_품목 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래명세서번호  VARCHAR(30) NOT NULL,
            구분            ENUM('원본', '최종', '기준') NOT NULL,
            순서            INT NOT NULL,
            코드            VARCHAR(10),
            품목            VARCHAR(100),
            작업명          VARCHAR(200),
            조              VARCHAR(50),
            구분표시        VARCHAR(50),
            규격            VARCHAR(50),
            비고            VARCHAR(200),
            수량            DECIMAL(12,2),
            단가            DECIMAL(12,2),
            금액            DECIMAL(14,2),
            FOREIGN KEY (거래명세서번호) REFERENCES 거래명세서(거래명세서번호)
                ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "청구품목통합규칙": """
        CREATE TABLE IF NOT EXISTS 청구품목통합규칙 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래처명        VARCHAR(100) NOT NULL,
            업무명조합      VARCHAR(500) NOT NULL,
            순서            INT NOT NULL,
            최종청구품명    VARCHAR(200) NOT NULL,
            조건            JSON NOT NULL,
            조              VARCHAR(50),
            구분표시        VARCHAR(50),
            규격            VARCHAR(50),
            비고            VARCHAR(200),
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP,
            수정일          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_통합규칙 (거래처명, 업무명조합, 순서)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "담당자": """
        CREATE TABLE IF NOT EXISTS 담당자 (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            이름        VARCHAR(50) NOT NULL,
            전화번호    VARCHAR(30),
            이메일      VARCHAR(100),
            등록일      DATETIME DEFAULT CURRENT_TIMESTAMP,
            수정일      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "담당자_담당거래처": """
        CREATE TABLE IF NOT EXISTS 담당자_담당거래처 (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            담당자_id   INT NOT NULL,
            거래처명    VARCHAR(100) NOT NULL,
            업무명      VARCHAR(200),
            등록일      DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (담당자_id) REFERENCES 담당자(id) ON DELETE CASCADE,
            UNIQUE KEY uk_거래처업무 (거래처명, 업무명)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서품명이력": """
        CREATE TABLE IF NOT EXISTS 거래명세서품명이력 (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            거래처명    VARCHAR(100) NOT NULL,
            품명        VARCHAR(200) NOT NULL,
            조          VARCHAR(50),
            등록일      DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_거래처품명 (거래처명, 품명)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    # 업무의뢰서 단위 우편요금(2026-08-22, `.claude/plans/plan_우편요금관리.md`) — 마케팅 담당자가
    # 미발행 목록 화면에서 의뢰서별로 직접 입력. 운영통계자료(실시간 수신+preprocess.py 재적재 시
    # TRUNCATE 대상)와 분리된 별도 테이블이라 재적재해도 입력값이 안전하다. 의뢰서가 취소돼 미발행
    # 목록으로 돌아와도 값은 그대로 남는다(거래명세서품명이력과 동일한 관례 — 삭제 안 함).
    "업무의뢰서_우편요금": """
        CREATE TABLE IF NOT EXISTS 업무의뢰서_우편요금 (
            업무의뢰서번호  VARCHAR(20) PRIMARY KEY,
            금액            DECIMAL(10,2) NOT NULL DEFAULT 0,
            등록일          DATE DEFAULT (CURRENT_DATE),
            수정일          DATE DEFAULT (CURRENT_DATE)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "통합시트설정": """
        CREATE TABLE IF NOT EXISTS 통합시트설정 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래처명        VARCHAR(100) NOT NULL,
            업무명조합      VARCHAR(500) NOT NULL,
            통합시트명      VARCHAR(50),
            통합상단업무명  VARCHAR(200),
            등록일          DATETIME DEFAULT CURRENT_TIMESTAMP,
            수정일          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_통합시트 (거래처명, 업무명조합)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,

    "거래명세서_수정이력": """
        CREATE TABLE IF NOT EXISTS 거래명세서_수정이력 (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            거래명세서번호  VARCHAR(30) NOT NULL,
            거래처명        VARCHAR(100),
            업무명          VARCHAR(300),
            필드명          VARCHAR(20) NOT NULL,
            이전값          DECIMAL(12,2),
            이후값          DECIMAL(12,2),
            비고            VARCHAR(200),
            수정자          VARCHAR(50) NOT NULL,
            수정일시        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_거래명세서번호 (거래명세서번호)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
}


def _컬럼_존재(cur, 테이블, 컬럼):
    cur.execute(
        """SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s""",
        (cfg.DB_NAME, 테이블, 컬럼),
    )
    return cur.fetchone()["cnt"] > 0


def migrate():
    """CREATE TABLE IF NOT EXISTS는 이미 존재하는 테이블을 건드리지 않으므로,
    이전에 만들어둔 테이블에 뒤늦게 추가된 컬럼은 여기서 ALTER TABLE로 보정한다.
    이미 컬럼이 있으면(신규 설치 등) 건너뛰어 몇 번을 실행해도 안전하다."""
    with get_db() as conn:
        with conn.cursor() as cur:
            if not _컬럼_존재(cur, "자재사용현황", "자재형태"):
                cur.execute("ALTER TABLE 자재사용현황 DROP INDEX uk_자재")
                cur.execute("ALTER TABLE 자재사용현황 ADD COLUMN 자재형태 VARCHAR(20) NULL AFTER 자재종류")
                cur.execute(
                    "ALTER TABLE 자재사용현황 ADD UNIQUE KEY uk_자재 "
                    "(업무의뢰서번호, 작업내역서번호, 작업일자, 자재종류, 자재형태)"
                )
                print("  마이그레이션: 자재사용현황.자재형태 컬럼 추가 완료")
            else:
                print("  마이그레이션: 자재사용현황.자재형태 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "자재사용현황", "작업명"):
                cur.execute("ALTER TABLE 자재사용현황 DROP INDEX uk_자재")
                cur.execute("ALTER TABLE 자재사용현황 ADD COLUMN 작업명 VARCHAR(200) NULL AFTER 작업내역서번호")
                cur.execute(
                    "ALTER TABLE 자재사용현황 ADD UNIQUE KEY uk_자재 "
                    "(업무의뢰서번호, 작업내역서번호, 작업명, 작업일자, 자재종류, 자재형태)"
                )
                print("  마이그레이션: 자재사용현황.작업명 컬럼 추가 완료")
            else:
                print("  마이그레이션: 자재사용현황.작업명 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "거래명세서", "편집여부"):
                cur.execute("ALTER TABLE 거래명세서 ADD COLUMN 편집여부 TINYINT DEFAULT 0 AFTER 발송여부")
                print("  마이그레이션: 거래명세서.편집여부 컬럼 추가 완료")
            else:
                print("  마이그레이션: 거래명세서.편집여부 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "단가마스터", "동봉물삽입단가"):
                cur.execute("ALTER TABLE 단가마스터 ADD COLUMN 동봉물삽입단가 DECIMAL(10,2) DEFAULT 0 AFTER 추가봉입단가")
                # 기존 거래처는 "추가봉입단가"와 같은 값으로 백필 — 이번 변경(추가봉입비에서 삽지 분리)
                # 직후에도 총 청구액이 그대로 유지되도록 함(사용자 확정, 2026-07-24). 0으로 두면
                # 삽지분이 아무 항목에도 청구되지 않아 총액이 즉시 줄어드는 위험이 있어 피함.
                cur.execute("UPDATE 단가마스터 SET 동봉물삽입단가 = 추가봉입단가")
                print("  마이그레이션: 단가마스터.동봉물삽입단가 컬럼 추가 + 추가봉입단가로 백필 완료")
            else:
                print("  마이그레이션: 단가마스터.동봉물삽입단가 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "단가마스터", "부가세구분"):
                cur.execute(
                    "ALTER TABLE 단가마스터 ADD COLUMN 부가세구분 ENUM('포함','별도') DEFAULT '별도' "
                    "AFTER 각대대봉투봉입단가"
                )
                # DEFAULT '별도'가 기존 행에도 자동으로 채워짐 — 지금까지 모든 거래처가 사실상
                # "별도"(공급가액에 10% 별도 청구)로 계산되고 있었으므로 별도 백필 불필요(2026-07-28).
                print("  마이그레이션: 단가마스터.부가세구분 컬럼 추가 완료(기존 행 전부 '별도'로 채워짐)")
            else:
                print("  마이그레이션: 단가마스터.부가세구분 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "청구품목규칙", "조"):
                cur.execute("ALTER TABLE 청구품목규칙 ADD COLUMN 조 VARCHAR(50) NULL AFTER 최종청구품명")
                print("  마이그레이션: 청구품목규칙.조 컬럼 추가 완료")
            else:
                print("  마이그레이션: 청구품목규칙.조 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "거래명세서", "묶음번호"):
                cur.execute("ALTER TABLE 거래명세서 ADD COLUMN 묶음번호 VARCHAR(30) NULL AFTER 편집여부")
                print("  마이그레이션: 거래명세서.묶음번호 컬럼 추가 완료")
            else:
                print("  마이그레이션: 거래명세서.묶음번호 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "거래명세서", "시트명"):
                cur.execute("ALTER TABLE 거래명세서 ADD COLUMN 시트명 VARCHAR(50) NULL AFTER 묶음번호")
                print("  마이그레이션: 거래명세서.시트명 컬럼 추가 완료")
            else:
                print("  마이그레이션: 거래명세서.시트명 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "거래명세서_품목", "조"):
                cur.execute("ALTER TABLE 거래명세서_품목 ADD COLUMN 조 VARCHAR(50) NULL AFTER 작업명")
                print("  마이그레이션: 거래명세서_품목.조 컬럼 추가 완료")
            else:
                print("  마이그레이션: 거래명세서_품목.조 컬럼 이미 존재 (건너뜀)")

            # 2026-08-11 — 거래명세서 구분표시(Excel B열)·규격(H열)·비고(N열) 조건식 입력 지원.
            # "구분"이라는 이름은 거래명세서_품목.구분(ENUM 원본/최종)과 충돌해서 쓸 수 없어
            # "구분표시"로 명명(청구품목규칙.md, docs 참고).
            for 테이블, 이후컬럼 in [
                ("청구품목규칙", "최종청구품명"),
                ("청구품목통합규칙", "조"),
            ]:
                for 컬럼, 정의 in [("구분표시", "VARCHAR(50)"), ("규격", "VARCHAR(50)"), ("비고", "VARCHAR(200)")]:
                    if not _컬럼_존재(cur, 테이블, 컬럼):
                        cur.execute(f"ALTER TABLE {테이블} ADD COLUMN {컬럼} {정의} NULL AFTER {이후컬럼}")
                        print(f"  마이그레이션: {테이블}.{컬럼} 컬럼 추가 완료")
                        이후컬럼 = 컬럼
                    else:
                        print(f"  마이그레이션: {테이블}.{컬럼} 컬럼 이미 존재 (건너뜀)")
                        이후컬럼 = 컬럼

            이후컬럼 = "조"
            for 컬럼, 정의 in [("구분표시", "VARCHAR(50)"), ("규격", "VARCHAR(50)"), ("비고", "VARCHAR(200)")]:
                if not _컬럼_존재(cur, "거래명세서_품목", 컬럼):
                    cur.execute(f"ALTER TABLE 거래명세서_품목 ADD COLUMN {컬럼} {정의} NULL AFTER {이후컬럼}")
                    print(f"  마이그레이션: 거래명세서_품목.{컬럼} 컬럼 추가 완료")
                else:
                    print(f"  마이그레이션: 거래명세서_품목.{컬럼} 컬럼 이미 존재 (건너뜀)")
                이후컬럼 = 컬럼

            # 2026-08-12 — 작업구분(조) 2개 이상일 때 맨 앞에 붙는 "통합 명세서" 시트의 시트명·
            # 상단 업무명(B12). 확정 시점에 사용자가 입력한 값을 이 거래명세서에 고정 저장해
            # 재다운로드해도 값이 안 바뀌게 한다(마지막 입력값 재사용은 별도 통합시트설정 테이블).
            이후컬럼 = "시트명"
            for 컬럼, 정의 in [("통합시트명", "VARCHAR(50)"), ("통합상단업무명", "VARCHAR(200)")]:
                if not _컬럼_존재(cur, "거래명세서", 컬럼):
                    cur.execute(f"ALTER TABLE 거래명세서 ADD COLUMN {컬럼} {정의} NULL AFTER {이후컬럼}")
                    print(f"  마이그레이션: 거래명세서.{컬럼} 컬럼 추가 완료")
                else:
                    print(f"  마이그레이션: 거래명세서.{컬럼} 컬럼 이미 존재 (건너뜀)")
                이후컬럼 = 컬럼

            # 2026-08-12 — 발행대기 상태에서 경영지원부가 발행해도 되는지 표시하는 게이트.
            # 거래처 승인이 필요한 건은 마케팅 담당자가 이 값을 꺼서(0) "거래처 승인 대기 중"으로
            # 표시하고, 경영지원부는 꺼진 건을 발행할 수 없다(POST /거래명세서발행에서 차단).
            # 기존 행은 DEFAULT 1이 자동으로 채워져 지금까지 발행 가능하던 건들의 동작이 그대로
            # 유지된다.
            if not _컬럼_존재(cur, "거래명세서", "발행가능"):
                cur.execute("ALTER TABLE 거래명세서 ADD COLUMN 발행가능 TINYINT DEFAULT 1 AFTER 발송여부")
                print("  마이그레이션: 거래명세서.발행가능 컬럼 추가 완료(기존 행 전부 1로 채워짐)")
            else:
                print("  마이그레이션: 거래명세서.발행가능 컬럼 이미 존재 (건너뜀)")

            # 2026-08-12 — "새 행 추가" 자동 반영 시 품명뿐 아니라 작업구분(조)도 가장 최근 확정
            # 값으로 함께 복원(수량·단가 등 나머지는 여전히 매번 새로 입력, 사용자 요청).
            if not _컬럼_존재(cur, "거래명세서품명이력", "조"):
                cur.execute("ALTER TABLE 거래명세서품명이력 ADD COLUMN 조 VARCHAR(50) NULL AFTER 품명")
                print("  마이그레이션: 거래명세서품명이력.조 컬럼 추가 완료")
            else:
                print("  마이그레이션: 거래명세서품명이력.조 컬럼 이미 존재 (건너뜀)")

            # 2026-08-13 — 공급가액·부가세 직접 입력(override, 마케팅팀 요청: 원단위 절사·반올림
            # 차이 보정). NULL이면 지금처럼 자동계산, 값이 있으면 다운로드 시 그 값을 우선 사용한다
            # (_거래명세서_엑셀_시트목록() 참고). 기존 행은 전부 NULL로 채워져 회귀 없음.
            이후컬럼 = "합계"
            for 컬럼 in ("공급가액_직접입력", "세액_직접입력"):
                if not _컬럼_존재(cur, "거래명세서", 컬럼):
                    cur.execute(f"ALTER TABLE 거래명세서 ADD COLUMN {컬럼} DECIMAL(12,2) NULL AFTER {이후컬럼}")
                    print(f"  마이그레이션: 거래명세서.{컬럼} 컬럼 추가 완료")
                else:
                    print(f"  마이그레이션: 거래명세서.{컬럼} 컬럼 이미 존재 (건너뜀)")
                이후컬럼 = 컬럼

            # 2026-08-14 — 수정이력 3건 보완. ①거래명세서_수정이력의 ON DELETE CASCADE FK를
            # 제거해(거래명세서품명이력과 동일하게) 원본 거래명세서가 취소·삭제돼도 감사이력은
            # 남도록 변경. 제약 이름은 환경마다 다를 수 있어 information_schema로 조회 후 제거.
            cur.execute(
                """SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
                   WHERE TABLE_SCHEMA = %s AND TABLE_NAME = '거래명세서_수정이력'
                     AND CONSTRAINT_TYPE = 'FOREIGN KEY'""",
                (cfg.DB_NAME,),
            )
            for row in cur.fetchall():
                fk명 = row["CONSTRAINT_NAME"]
                cur.execute(f"ALTER TABLE 거래명세서_수정이력 DROP FOREIGN KEY {fk명}")
                print(f"  마이그레이션: 거래명세서_수정이력 FK({fk명}) 제거 완료")

            # ②거래처명·업무명을 등록 시점 값 그대로 비정규화 저장(거래명세서가 나중에 지워져도
            # 로그 자체에 "어느 거래처·업무였는지"가 남도록).
            이후컬럼 = "거래명세서번호"
            for 컬럼, 정의 in (("거래처명", "VARCHAR(100)"), ("업무명", "VARCHAR(300)")):
                if not _컬럼_존재(cur, "거래명세서_수정이력", 컬럼):
                    cur.execute(f"ALTER TABLE 거래명세서_수정이력 ADD COLUMN {컬럼} {정의} NULL AFTER {이후컬럼}")
                    print(f"  마이그레이션: 거래명세서_수정이력.{컬럼} 컬럼 추가 완료")
                else:
                    print(f"  마이그레이션: 거래명세서_수정이력.{컬럼} 컬럼 이미 존재 (건너뜀)")
                이후컬럼 = 컬럼

            # ③FK 제거로 자동 생성 인덱스도 함께 사라지므로 조회 성능 유지용으로 명시 추가.
            cur.execute(
                """SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
                   WHERE TABLE_SCHEMA = %s AND TABLE_NAME = '거래명세서_수정이력'
                     AND INDEX_NAME = 'idx_거래명세서번호'""",
                (cfg.DB_NAME,),
            )
            if cur.fetchone()["cnt"] == 0:
                cur.execute("ALTER TABLE 거래명세서_수정이력 ADD INDEX idx_거래명세서번호 (거래명세서번호)")
                print("  마이그레이션: 거래명세서_수정이력.idx_거래명세서번호 인덱스 추가 완료")
            else:
                print("  마이그레이션: 거래명세서_수정이력.idx_거래명세서번호 인덱스 이미 존재 (건너뜀)")

            # 2026-08-15 — 단가마스터 자재명 단위 정규화(Phase 1). 자재사용현황에 자재코드
            # (작업내역서자재)·자재명 컬럼을 추가해 지금까지 groupby 단계에서 뭉개지던 자재
            # 식별 정보를 원본 그대로 보존한다(merge_자재() 변경은 Phase 2에서 진행). UNIQUE
            # 제약(uk_자재)에 자재코드를 포함시켜야 같은 자재종류 안에서도 자재코드가 다른 여러
            # 행(예: 95903 사례의 자재코드 2016·99)이 하나로 뭉개지지 않고 각각 저장된다 —
            # 이 제약을 안 넓히면 Phase 2에서 groupby 키를 확장하는 순간 INSERT가 충돌한다.
            if not _컬럼_존재(cur, "자재사용현황", "자재코드"):
                cur.execute("ALTER TABLE 자재사용현황 DROP INDEX uk_자재")
                cur.execute("ALTER TABLE 자재사용현황 ADD COLUMN 자재코드 INT NULL AFTER 자재형태")
                cur.execute(
                    "ALTER TABLE 자재사용현황 ADD UNIQUE KEY uk_자재 "
                    "(업무의뢰서번호, 작업내역서번호, 작업명, 작업일자, 자재종류, 자재형태, 자재코드)"
                )
                print("  마이그레이션: 자재사용현황.자재코드 컬럼 추가 완료(UNIQUE 제약도 함께 확장)")
            else:
                print("  마이그레이션: 자재사용현황.자재코드 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "자재사용현황", "자재명"):
                cur.execute("ALTER TABLE 자재사용현황 ADD COLUMN 자재명 VARCHAR(200) NULL AFTER 자재코드")
                print("  마이그레이션: 자재사용현황.자재명 컬럼 추가 완료")
            else:
                print("  마이그레이션: 자재사용현황.자재명 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "단가마스터", "인쇄면"):
                cur.execute(
                    "ALTER TABLE 단가마스터 ADD COLUMN 인쇄면 ENUM('단면','양면') DEFAULT '양면' "
                    "AFTER 부가세구분"
                )
                # 청구페이지 원본이 없어 출력비를 용지 자재사용량으로 대체 계산하는 케이스에서 몇
                # 배로 환산할지 결정하는 값(2026-08-17). 실사용 데이터의 절대다수(장수 대비 확정
                # 청구페이지 비율)가 양면(2배)이라 DEFAULT '양면'으로 기존 행을 전부 채운다.
                print("  마이그레이션: 단가마스터.인쇄면 컬럼 추가 완료(기존 행 전부 '양면'으로 채워짐)")
            else:
                print("  마이그레이션: 단가마스터.인쇄면 컬럼 이미 존재 (건너뜀)")

            # 2026-08-22 — "인쇄면 자재별 관리 + 장수기준/페이지기준 청구단위" 통합 개선
            # (`.claude/plans/plan_출력비_장수페이지기준_인쇄면자재별.md`). 인쇄면(단면/양면)은 이제
            # 거래처+업무명 단위 값(위 컬럼, 그대로 유지 — 자재별 미설정 시 폴백용)뿐 아니라 자재
            # 단위로도 설정 가능해야 해서 단가마스터_자재단가에도 같은 이름의 컬럼을 추가한다.
            # 청구단위는 거래처+업무명(+작업명)의 계약 조건이라 단가마스터에만 둔다 — 기본값을
            # 지금까지의 유일한 동작이었던 '페이지기준'으로 채워 기존 거래처는 회귀 없음.
            if not _컬럼_존재(cur, "단가마스터", "청구단위"):
                cur.execute(
                    "ALTER TABLE 단가마스터 ADD COLUMN 청구단위 ENUM('페이지기준','장수기준') "
                    "DEFAULT '페이지기준' AFTER 인쇄면"
                )
                print("  마이그레이션: 단가마스터.청구단위 컬럼 추가 완료(기존 행 전부 '페이지기준'으로 채워짐)")
            else:
                print("  마이그레이션: 단가마스터.청구단위 컬럼 이미 존재 (건너뜀)")

            if not _컬럼_존재(cur, "단가마스터_자재단가", "인쇄면"):
                cur.execute(
                    "ALTER TABLE 단가마스터_자재단가 ADD COLUMN 인쇄면 ENUM('단면','양면') NULL "
                    "AFTER 표시명"
                )
                print("  마이그레이션: 단가마스터_자재단가.인쇄면 컬럼 추가 완료(NULL=자재별 미설정, "
                      "상위 단가마스터.인쇄면 값으로 폴백)")
            else:
                print("  마이그레이션: 단가마스터_자재단가.인쇄면 컬럼 이미 존재 (건너뜀)")

            # 2026-08-18 — "원본 vs 최종 비교" 팝업 왼쪽 "원본"이 조건식 적용 전 원자재 단위
            # 품명(구분='원본')과 조건식 적용 후 합계(감사이력 기준선)를 섞어 보여주던 불일치 수정.
            # 확정 시점에 "조건식 적용 후·사람이 손대기 전" 스냅샷(기준목록)을 구분='기준'으로
            # 별도 저장해, 품명도 이 기준으로 표시할 수 있게 한다.
            cur.execute(
                "SELECT COLUMN_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='거래명세서_품목' AND COLUMN_NAME='구분'"
            )
            if "'기준'" not in cur.fetchone()["t"]:
                cur.execute("ALTER TABLE 거래명세서_품목 MODIFY 구분 ENUM('원본','최종','기준') NOT NULL")
                print("  마이그레이션: 거래명세서_품목.구분 ENUM에 '기준' 값 추가 완료")
            else:
                print("  마이그레이션: 거래명세서_품목.구분 ENUM에 '기준' 값 이미 존재 (건너뜀)")

            # 2026-08-21 — 당사 생산공정관리시스템이 5월분부터 운영통계자료에 공정 세분화 컬럼
            # 10개를 추가로 내려주기 시작함(압착/봉입/수작업/중철/제본은 "그 공정을 거친 물량이
            # 건수와 동일한 값으로 반복 표시"되는 방식, 나머지 5개는 공정상 수량). 고객사별로
            # 압착비·봉입비·수작업비·중철비·제본비 등을 각각 별도 항목으로 청구하기 위해 신설
            # (`.claude/plans/plan_공정별단가청구.md`). 5월 이전 데이터는 이 컬럼들이 전부 0으로
            # 남아 기존 계산(봉입건수 기준 폴백)과 동일하게 동작 — 회귀 없음.
            for 컬럼 in ["압착", "주소출력", "봉입", "수작업", "중철", "제본",
                        "무광코팅", "유광코팅", "에폭시", "날개접지"]:
                if not _컬럼_존재(cur, "운영통계자료", 컬럼):
                    cur.execute(f"ALTER TABLE 운영통계자료 ADD COLUMN {컬럼} INT DEFAULT 0")
                    print(f"  마이그레이션: 운영통계자료.{컬럼} 컬럼 추가 완료")
                else:
                    print(f"  마이그레이션: 운영통계자료.{컬럼} 컬럼 이미 존재 (건너뜀)")


def main():
    print(f"[MariaDB 초기화] {cfg.DB_NAME}@{cfg.DB_HOST}:{cfg.DB_PORT}")
    with get_db() as conn:
        with conn.cursor() as cur:
            for i, (이름, sql) in enumerate(테이블_SQL.items(), 1):
                cur.execute(sql)
                print(f"  ({i}/{len(테이블_SQL)}) {이름} 테이블 생성 완료")
    migrate()
    print("완료")


if __name__ == "__main__":
    main()
