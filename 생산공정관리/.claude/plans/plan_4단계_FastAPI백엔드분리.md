# 플랜: 4단계 — FastAPI 백엔드 분리

> 상태: ⏳ 미착수 | 선행: 1단계 MariaDB 전환 완료 필수
> 목적: DB 직접 접근 로직을 FastAPI API 서버로 분리 → 다중 사용자 트랜잭션 안정성 확보
> UI: Streamlit 유지 (React 전환은 후순위)

---

## 구조 변경 요약

```
[현재]
Streamlit app.py → MariaDB 직접 접근

[변경 후]
Streamlit app.py → FastAPI (port 8000) → MariaDB
```

- Streamlit은 화면 렌더링만 담당
- 데이터 조회·저장은 FastAPI API 호출로 처리
- 비즈니스 로직(집계·단가 계산 등) FastAPI로 이전

---

## API 엔드포인트 설계

| 메서드 | 경로 | 용도 |
|---|---|---|
| GET | `/summary` | 탭1·2·3 집계 데이터 |
| GET | `/미발행목록` | 탭4 미발행 업무의뢰서 목록 |
| POST | `/거래명세서요청` | 발행대기 등록 |
| POST | `/거래명세서발행` | 발행완료 처리 + Excel 생성 |
| GET | `/발행요청목록` | 탭4 발행요청 이력 |
| GET | `/거래처마스터` | 거래처 목록 조회 |
| POST | `/거래처마스터` | 거래처 등록·수정 |
| DELETE | `/거래처마스터/{id}` | 거래처 삭제 |
| GET | `/단가마스터` | 단가 조회 |
| POST | `/단가마스터` | 단가 등록·수정·삭제 |

---

## [1단계] FastAPI 기본 구조 구축

- [ ] 1. `pip install fastapi uvicorn` 패키지 설치
- [ ] 2. `scripts/api.py` 신규 생성 — FastAPI 앱 기본 구조
- [ ] 3. MariaDB 연결 헬퍼 (`get_db()`) api.py에 적용 (SKILL-05 재사용)
- [ ] 4. `/health` 엔드포인트로 서버 기동 확인

## [2단계] 데이터 조회 API 구현

- [ ] 5. GET `/summary` — 탭1·2·3용 집계 (preprocess 로직 이전)
- [ ] 6. GET `/미발행목록` — 탭4 미발행 목록
- [ ] 7. GET `/발행요청목록` — 탭4 발행요청 이력
- [ ] 8. GET `/거래처마스터` · GET `/단가마스터`

## [3단계] 쓰기 API 구현 (트랜잭션 적용)

- [ ] 9. POST `/거래명세서요청` — 중복 요청 방지 트랜잭션 포함
- [ ] 10. POST `/거래명세서발행` — 발행완료 + Excel 생성 반환
- [ ] 11. POST·DELETE `/거래처마스터` · `/단가마스터`

## [4단계] Streamlit → API 호출 방식으로 교체

- [ ] 12. app.py 상단 `requests` import + API 베이스 URL 설정
- [ ] 13. DB 직접 접근 코드 → `requests.get/post` 호출로 교체 (탭별 순서대로)
- [ ] 14. 기존 `@st.cache_data` → API 응답 캐시로 전환
- [ ] 15. 문법 검사 + 탭별 화면 동작 확인

## [5단계] 배포 구성

- [ ] 16. `FastAPI_실행.bat` 신규 — `uvicorn scripts.api:app --host 0.0.0.0 --port 8000`
- [ ] 17. `대시보드_실행.bat` 수정 — FastAPI 먼저 기동 후 Streamlit 실행
- [ ] 18. 원격 PC에서 두 서버 동시 실행 확인
- [ ] 19. 다중 사용자 동시 접속 테스트 (동시 발행 요청 중복 방지 확인)

---

## 주의사항

- FastAPI 서버(8000)와 Streamlit 서버(8501) 두 개 동시 실행 필요
- 방화벽에 8000 포트 추가 개방 필요 (내부망 전용이면 생략 가능)
- Excel 생성(`generate_거래명세서_excel`) 로직은 FastAPI 쪽으로 이전
- `requests` 라이브러리 추가 설치 필요 (`pip install requests`)
