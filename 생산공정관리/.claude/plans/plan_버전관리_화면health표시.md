# 플랜: 버전 관리 도입 + 화면·/health 버전 표시

> 작성: 2026-11-22 | 상태: ✅ 전체 완료 — 사무실 PC 배포·git 태그 v0.9.0 (2026-11-22)

## 배경
- 지금까지 사무실 PC 배포는 날짜 이름 백업(`api.py.bak_20261115_비교창`)으로만 관리 → "지금 깔린 게 무엇인지" 알 방법이 없음
- 화면(frontend)과 서버(api.py)는 사무실 PC에 **따로 복사**되므로 한쪽만 반영되는 실수 가능
- 현재 코드의 버전 표기: `scripts/api.py:83` `FastAPI(version="0.1.0")`, `frontend/package.json` `"version": "0.1.0"` — 둘 다 생성 당시 기본값이라 의미 없음

## 사용자 확정 사항 (2026-11-22)
1. 형식: **v주.부.수** 3자리 (예: v1.2.3)
   - 주(첫째): 큰 변화(화면 구성 개편, DB 구조 큰 변경, 실시간 연동 시작 등)
   - 부(둘째): 기능 추가
   - 수(셋째): 버그·문구 등 작은 수정
2. 시작 번호: **v0.9.0** (직원 실사용 시작일에 v1.0.0)
3. 화면에 **화면 버전·서버 버전 둘 다** 표시

## 변경 내용
| 구분 | 파일 | 내용 |
|---|---|---|
| 서버 | `scripts/version.py` (신규) | `APP_VERSION = "0.9.0"` 한 줄 — 서버 버전의 유일한 기준 |
| 서버 | `scripts/api.py` | `FastAPI(version=APP_VERSION)`, `/health` 응답에 `"version"` 추가(정상·DB 실패 503 둘 다 — 기존 필드는 그대로 두고 추가만) |
| 화면 | `frontend/package.json` | `"version": "0.9.0"` — 화면 버전 기준 |
| 화면 | `frontend/next.config.ts` | 빌드 시 package.json 버전을 화면 코드에 주입 |
| 화면 | `frontend/app/api/version/route.ts` (신규) | FastAPI `/health`의 버전을 중계(폴더명 영문, SKILL-15) |
| 화면 | `frontend/components/VersionBadge.tsx` (신규) | `화면 v0.9.0 · 서버 v0.9.0` 회색 작은 글씨. 서버 응답 없으면 `서버 ?`, 두 숫자가 다르면 주황색 + 마우스 올리면 "화면·서버 버전이 다릅니다" |
| 화면 | `frontend/components/Dashboard.tsx` | 상단 오른쪽, 사용자 메뉴 왼쪽에 배지 배치 |
| 문서 | `docs/작업현황-대시보드-생성-KNOWLEDGE.md` | 버전 규칙(자리 뜻·올리는 시점·백업 이름 `bak_v0.9.0`·git 태그) |
| 문서 | `docs/API규격서.md`, `docs/API규격서_생산공정관리시스템전달용.md` | `/health` 응답 예시에 `version` 한 줄 추가(추가만이라 상대 시스템 영향 없음) |

- `/health`는 인증이 필요 없는 API라 로그인 여부와 무관하게 읽힘
- 로그인 화면에는 표시하지 않음(외부인에게 버전 노출 최소화) — 필요하면 추후 추가

## 단계
### 1단계 — 서버 (로컬)
- [x] `version.py` 신규 + `api.py` 수정 → `py_compile` (2026-11-22, 함수 직접 호출로 정상·DB실패 503 둘 다 `version` 포함 확인)
- [x] `API서버_재시작.bat` 후 브라우저 `http://localhost:8000/health` → `"version":"0.9.0"` 확인 (2026-11-22 curl 확인)

### 2단계 — 화면 (로컬)
- [x] package.json(+package-lock 루트 2곳)·next.config·route·VersionBadge·Dashboard 수정 (2026-11-22)
- [x] `npx tsc --noEmit`·`npx eslint .` 통과, `curl /api/version` → `{"서버버전":"0.9.0"}` 확인
- [x] 화면 상단 표시 확인 + 버전 불일치(서버 임시 0.9.1) 주황 표시 사용자 확인 후 0.9.0 원복 (2026-11-22)

### 3단계 — 문서·커밋·태그
- [x] KNOWLEDGE 버전 규칙, API 규격서 2종 갱신, CHANGELOG 기록 (2026-11-22)
- [x] 커밋 (2026-11-22)
- [x] 사무실 PC 배포 완료 후 git 태그 `v0.9.0` (2026-11-22)
- [x] 전달용 웹페이지(Artifact)에도 반영 — Version 5 재발행 (2026-11-22, 사용자 요청)

### 4단계 — 사무실 PC 배포 (사용자 진행)
- [x] 배포 묶음 `output/배포_v0.9.0` (`api.py`·`version.py`·`data_transform.py`(11-19 Paffy 정리분)·`frontend`, DB 변경 없음)
- [x] 백업 이름: 이번 1회만 `api.py.bak_버전도입전`·`frontend_old_버전도입전`(이전 상태엔 버전 번호가 없으므로). 다음 배포부터는 "덮어쓰기 직전 버전"으로 `api.py.bak_v0.9.0` 식으로 이름 붙임
- [x] 배포 체크리스트 플랜 별도 작성

## 관리자 화면 확인 (완료 후)
1. 브라우저에서 `http://localhost:8001/health`(사무실 PC) 접속 → `"version": "0.9.0"` 글자 확인
2. 웹 화면 로그인 → 상단 오른쪽 이름 왼쪽에 `화면 v0.9.0 · 서버 v0.9.0` 확인
3. 두 숫자가 같고 회색인지 확인(주황색이면 한쪽 배포 누락)

## 되돌리기
- 기능 추가만이라 기존 동작 영향 없음. 문제 시 git으로 이전 버전 복원, 사무실 PC는 백업 파일·폴더로 원복
