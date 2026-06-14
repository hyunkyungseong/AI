# 공정관리 API 서버 — 인수인계 메모

## 프로젝트 목적
공정관리시스템(PUSH 방식) → 이 API 서버 → MariaDB(dspm_db) INSERT

## 기술 스택
- Python 3.12.5 + FastAPI + uvicorn
- MariaDB 10.11 (로컬 PC)
- SQLAlchemy + pymysql

## 서버 실행 방법
```
# 1. .env 파일 잠금 해제 확인 (서버 비정상 종료 후 필요할 수 있음)
python -c "import stat; from pathlib import Path; Path('.env').chmod(stat.S_IREAD | stat.S_IWRITE)"

# 2. 서버 실행
uvicorn main:app

# 3. API 문서 확인
브라우저에서 http://localhost:8000/docs
```

## API 목록
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | / | 서버 상태 확인 | 불필요 |
| POST | /process | 공정 실적 단건 등록 | X-API-Key 필요 |
| POST | /process/batch | 공정 실적 일괄 등록 | X-API-Key 필요 |
| GET | /process | 전체 목록 조회 | X-API-Key 필요 |
| GET | /process/{id} | 단건 조회 | X-API-Key 필요 |

## 보안
- `.env` — DB 접속정보(암호화됨) + API Key 보관
- `secret.key` — 복호화 마스터 키 (USB 등 별도 보관 권장)
- 서버 실행 시 `.env` 자동 잠금(읽기전용), 종료 시 자동 해제

## 현재 DB
- 테스트: `temp_db.process_log`
- 운영 예정: `dspm_db` (실제 필드 확인 후 테이블 설계 예정)

## 다음 작업 (개발팀·담당자 확인 후)
- DB 장애 대비 로컬 파일 백업 + 자동 재시도 스케줄러
- process_fail_log 테이블 + 재처리 API
- 운영 테이블 설계 및 전환
