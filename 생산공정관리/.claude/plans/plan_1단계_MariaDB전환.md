# 플랜: 1단계 — 백엔드 구축 (MariaDB + FastAPI)

> 상태: 🔄 진행중 (2026-07-19 착수) | 선행: 2단계 완료 ✅
> **2026-07-19 방향 확정:** 최종 목표가 "Next.js + FastAPI + MariaDB + Vercel"로 커짐에 따라,
> 기존에 따로 있던 이 플랜(MariaDB 전환)과 `plan_4단계_FastAPI백엔드분리.md`(API 분리)를 하나로 합침.
> "Streamlit이 MariaDB에 직접 접속하는 중간 단계"는 생략하고, 처음부터 **FastAPI를 경유**하도록 설계.
> `plan_4단계_FastAPI백엔드분리.md`는 API 엔드포인트 설계 참고용으로 남겨두되, 실제 체크리스트는 이 파일 기준으로 진행.
> KNOWLEDGE.md "최종 배포 목표" 섹션 참고.

---

## 확정된 방향 (2026-07-19)

| 항목 | 결정 |
|---|---|
| FastAPI·MariaDB 서버 위치 | 사무실 PC 계속 사용 (최종) |
| 보안 | 사내 전용, 로그인 필요 |
| 전환 방식 | 점진적 (Streamlit 유지 + 탭 단위로 Next.js 교체는 별도 플랜에서 진행) |

> **2026-07-19 추가 결정 — 개발 순서:** 사무실 PC(원격서버) 접근이 현재 불가능한 상태라, 로컬 PC에 MariaDB를 먼저 설치해 개발·테스트를 진행하고, 완료 후 사무실 PC로 이관한다. `db_config.py`(SKILL-05)로 접속 정보를 분리해뒀기 때문에 이관 시 이 파일의 `DB_HOST` 값만 바꾸면 되고 나머지 코드는 그대로 유지된다.

## 구조 변경 요약

```
[현재]
Streamlit app.py → sqlite3·pkl 직접 접근

[변경 후]
Streamlit app.py → requests → FastAPI(api.py, port 8000) → MariaDB
                                     ↑
                        나중에 Next.js(Vercel)도 여기로 붙음
```

---

## [1단계] 준비물 설치

- [x] 1. MariaDB(Windows) 설치 완료 (2026-07-19): **로컬 PC**에 MariaDB Server **11.4.12** 설치 (이 프로젝트 전용 별개 인스턴스 — 사무실 PC의 기존 10.2 시스템과 무관). 사무실 PC(원격)에도 동일 버전(11.4) 설치 필요 ([6단계] 17번)
- [x] 2. HeidiSQL 설치 완료 (2026-07-19)
- [x] 3. Python 패키지 설치 완료 (2026-07-19): `pymysql`, `fastapi`, `python-jose[cryptography]`, `passlib[bcrypt]` (`uvicorn`·`requests`는 이미 설치돼 있었음)

## [2단계] DB 스키마 + 연결 코드

- [x] 4. `scripts/db_config.py` 작성 완료 (2026-07-19) — DB 접속 정보(host·user·password·db명) 템플릿, `.gitignore`에 이미 등록돼 있었음 확인. **DB_PASSWORD는 사용자가 직접 파일에서 실제 root 비밀번호로 교체 필요**
- [x] 5. `scripts/init_db_mariadb.py` 작성 완료 (2026-07-19) — **6개 테이블** 생성 (문법 검사 완료, 실제 DB 반영은 비밀번호 입력 후 실행 필요)
      - 운영통계자료 (26개 컬럼 + id — 기존 문서의 21개 컬럼에서 `반제품여부`·자재사용량 4종 누락 발견해 정정, KNOWLEDGE.md 참고)
      - 거래처마스터, 단가마스터 (기존 SQLite 구조 그대로, 각대대봉투 필드 포함)
      - 거래명세서 / 거래명세서_의뢰서 — **정규화**: 기존 거래명세서이력 1개 테이블(JSON-in-TEXT)을 그룹(집계·상태) 테이블 + 의뢰서번호 목록 테이블로 분리 (설계 상세는 KNOWLEDGE.md "거래명세서이력 MariaDB 정규화 설계" 참고)
      - 거래명세서번호_카운터 (기존 SQLite 구조 그대로 — 최초 계획에 누락됐던 테이블)
- [ ] 6. `scripts/migrate_sqlite_to_mariadb.py` 신규 — 기존 SQLite 거래처마스터·단가마스터·거래명세서이력(JSON 목록 파싱해 `거래명세서`/`거래명세서_의뢰서`로 분리 이관) → MariaDB 이관

## [3단계] FastAPI 서버 구축

- [ ] 7. `scripts/api.py` 신규 — FastAPI 앱 기본 구조 + `get_db()`(SKILL-05 재사용) + `/health`
- [ ] 8. 조회 API: `GET /summary`(탭1·2·3 집계), `GET /미발행목록`, `GET /발행요청목록`, `GET /거래처마스터`, `GET /단가마스터`
- [ ] 9. 쓰기 API: `POST /거래명세서요청`, `POST /거래명세서발행`(Excel 생성 포함), `POST·DELETE /거래처마스터`, `/단가마스터`
- [ ] 10. 로그인(인증) API 추가 — 사내 전용 접근 제어 (계정 관리 방식은 사용자 확인 후 결정)

## [4단계] Streamlit → API 호출 방식으로 교체

- [ ] 11. app.py 상단 `requests` import + API 베이스 URL 설정
- [ ] 12. DB 직접 접근 코드 → `requests.get/post` 호출로 교체 (탭별 순서대로)
- [ ] 13. 기존 `@st.cache_data` → API 응답 캐시로 전환
- [ ] 14. 문법 검사 + 탭별 화면 동작 확인
- [ ] 15. `FastAPI_실행.bat` 신규, `대시보드_실행.bat` 수정 (FastAPI 먼저 기동 후 Streamlit)

## [5단계] 외부 접속 통로 준비 (Vercel 대비)

- [ ] 16. Cloudflare Tunnel 설치·구성 (무료, 공인 IP·포트포워딩 노출 없이 HTTPS 주소 확보) — 사용자 동의 필요

## [6단계] 로컬 PC → 사무실 PC(원격서버) 이관

> 사무실 PC 접근이 가능해지면 진행. 코드는 거의 그대로 두고 접속 정보·데이터만 옮기는 작업.

- [ ] 17. 사무실 PC에 로컬과 동일 버전의 MariaDB 설치 (버전 차이 시 복원 오류 가능)
- [ ] 18. 로컬 DB 백업 (`mysqldump` 또는 HeidiSQL "내보내기") → 사무실 PC에서 복원 ("가져오기")
      - 문자셋 `utf8mb4` 일치 확인 (한글 깨짐 방지)
      - 로컬 개발 중 쌓인 테스트 데이터는 이관 전 정리(삭제) 후 실사용 데이터만 이관
- [ ] 19. `scripts/db_config.py`의 `DB_HOST`(및 필요 시 계정 정보)를 사무실 PC 기준으로 변경 — 이 외 코드 수정 불필요
- [ ] 20. 사무실 PC에서 FastAPI(`api.py`) 기동 후 `/health` 및 주요 API 정상 응답 확인

---

## 확인 필요 (진행하면서 사용자에게 물어볼 것)

- 로그인 계정 관리 방식: 담당자별 개별 계정 vs 팀 공용 계정 1~2개
- Cloudflare Tunnel 설치 동의 여부

## 다음 플랜

- Next.js 프론트엔드 제작 + Vercel 배포는 이 플랜(백엔드) 완료 후 별도 플랜으로 진행 (탭 단위 점진적 전환)
