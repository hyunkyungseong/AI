# 플랜: 1단계 — MariaDB 전환 및 원격 배포

> 설계 확정 (2026-06-04): 운영통계자료도 MariaDB 테이블로 포함 (pkl 방식 폐기)
> KNOWLEDGE.md "최종 배포 목표" 섹션 참고

---

## [1단계] 원격 PC 준비

- [ ] 1. MariaDB (Windows) + HeidiSQL 설치
- [ ] 2. DB·사용자 계정 생성, 방화벽 3306·8501 포트 개방

## [2단계] 코드 작성 (현재 PC)

- [ ] 3. `scripts/db_config.py` 신규 — DB 접속 정보 (host·user·password·db명)
- [ ] 4. `scripts/init_db_mariadb.py` 신규 — 3개 테이블 생성 (운영통계자료·거래처마스터·거래명세서이력)
- [ ] 5. `scripts/preprocess.py` 수정 — pkl 저장 → MariaDB INSERT 방식으로 변경
- [ ] 6. `scripts/migrate_sqlite_to_mariadb.py` 신규 — SQLite 거래처마스터·거래명세서이력 → MariaDB 이관
- [ ] 7. `scripts/app.py` 수정 — sqlite3·pkl → pymysql·SQL 쿼리로 교체

## [3단계] 원격 PC 배포

- [ ] 8. Python 3.12 + pip 패키지 설치 (streamlit, pymysql, pandas, plotly, openpyxl)
- [ ] 9. 프로젝트 전체 파일 원격 PC에 복사
- [ ] 10. `init_db_mariadb.py` 실행 → 테이블 생성 확인
- [ ] 11. `preprocess.py` 실행 → 운영통계자료 DB 적재·검증
- [ ] 12. `migrate_sqlite_to_mariadb.py` 실행 → 거래처마스터·거래명세서이력 이관·검증
- [ ] 13. Streamlit 서버 실행 + 팀원 접속 확인 (`http://[서버IP]:8501`)
