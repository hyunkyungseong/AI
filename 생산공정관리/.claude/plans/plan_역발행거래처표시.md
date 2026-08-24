# 역발행 거래처 표시 기능 (거래처마스터 + 발행요청목록/발행완료)

> 상태: ✅ 완료(2026-08-24) — 로컬 PC 구현·검증 + 사무실 PC 배포까지 전부 완료
> (배포 체크리스트: `.claude/plans/plan_2026-08-24_사무실PC배포체크리스트.md`)

## Context
고객사가 거래명세서를 우리 쪽으로 역으로 발행하는("역발행") 거래처가 일부 있는데, 지금 화면에는 이 구분이 전혀 없어 발행요청목록·발행완료에서 어느 건이 역발행 대상인지 알 수 없다. 거래처마스터에 "역발행" 여부를 등록해두고(신규 등록 시 기본값은 비워둠=일반), 발행요청목록·발행완료 화면에 그 거래처 건이면 표시되도록 한다.

추가로, 역발행 거래처의 거래명세서가 생성되면(POST /거래명세서요청) 자동으로 "발행가능"을 꺼서(0) 바로 발행되지 못하고 "승인대기" 상태로 발행요청목록에 들어가야 한다(사용자 확정) — 역발행 건은 고객사가 자체적으로 명세서를 만들기 때문에, 우리 쪽에서 별도 확인 없이 그냥 발행 처리하면 안 된다는 업무 의미. 이 게이트(`거래명세서.발행가능`)는 2026-08-12에 "거래처 승인 대기"용으로 이미 만들어져 있는 컬럼을 그대로 재사용한다.

## 구현 방식 — 기존 boolean 플래그 패턴 재사용
이 프로젝트에 이미 있는 `거래명세서.발행가능`(TINYINT DEFAULT 1) 컬럼 추가 패턴을 그대로 따른다 — 별도 이력 테이블이나 새로운 설계 없이 boolean 컬럼 하나로 충분하다.

### 1) DB — `scripts/init_db_mariadb.py`
- `거래처마스터` CREATE TABLE 정의에 `역발행 TINYINT(1) DEFAULT 0` 추가 (신규 설치용)
- 마이그레이션 블록(`_컬럼_존재` 패턴, 기존 `발행가능` 마이그레이션 바로 아래)에 동일 패턴으로 추가 — 기존 거래처는 전부 0(일반)으로 채워짐, 회귀 없음

### 2) 백엔드 — `scripts/api.py`
- `거래처행`(POST 바디)·`거래처행_수정`(PUT 바디) Pydantic 모델에 `역발행: bool = False` 추가
- `POST /거래처마스터`·`PUT /거래처마스터/{name}`의 INSERT/UPDATE 문에 역발행 컬럼 추가
- `GET /거래처마스터`는 이미 `SELECT *`라 코드 변경 불필요
- `GET /발행목록`: `거래처마스터`에서 `{거래처명: 역발행}` 맵을 한 번 조회해두고, 응답 조립부에 `"역발행": 역발행맵.get(r["거래처명"], False)` 추가
- `POST /거래명세서요청` — 거래명세서 INSERT 직전에 `SELECT 역발행 FROM 거래처마스터 WHERE 거래처명=%s`로 조회해, 역발행이면 `발행가능=0`, 아니면 기존처럼 1. 이후 흐름(발행요청목록 "승인대기" 라벨·`PUT /거래명세서/{no}/발행가능`으로 담당자가 직접 켜기·`POST /거래명세서발행`이 발행가능=0이면 409 거부)은 기존 게이트 코드를 그대로 재사용

### 3) 프론트 타입 — `frontend/components/Dashboard.tsx`
- `거래처행`·`발행행`에 `역발행: boolean` 추가

### 4) `frontend/lib/serverMappers.ts`
- `mapClientRow()`·`mapIssuedRow()`에 `역발행: Boolean(r.역발행)` 추가

### 5) 거래처마스터 등록/수정 폼 — `frontend/components/ClientFormDialog.tsx`
- `역발행` state 추가(신규 등록 시 기본값 false), 체크박스 UI, POST/PUT 바디 포함

### 6) `frontend/components/ClientMaster.tsx`
- `handleUpdated()`의 `Pick<거래처행, ...>` 타입에 `"역발행"` 추가

### 7) 거래처마스터 목록 표 — `frontend/components/ClientMasterTable.tsx`
- "역발행" 컬럼 추가(뱃지 표시)

### 8) 레벨1 그룹 집계 — `frontend/lib/issuedGrouping.ts`
- `레벨1그룹` 타입·`build레벨1그룹()`에 `역발행` 추가(거래명세서번호 단위 값, 대표값 패턴)

### 9) 발행요청목록·발행완료 표시 — `InvoiceIssuedLevel1Table.tsx`, `InvoiceIssuedLevel2Table.tsx`
- 거래처명 셀 옆에 "역발행" 뱃지 표시

## 검증 (완료)
- `python -m py_compile scripts/api.py scripts/init_db_mariadb.py` 통과
- `npx tsc --noEmit` · `npx eslint .` · `npm run build` 통과
- 로컬 MariaDB 마이그레이션 실행 확인(컬럼 추가 로그)
- 로컬 MariaDB 임시 테스트 거래처로 종단 검증: 역발행=1 → 발행가능_초기값 0, 역발행=0 → 1, 발행목록 조회 매핑 정상 확인 후 즉시 삭제
- 사무실 PC 배포 완료(2026-08-24) — `scripts/api.py`·`init_db_mariadb.py` 반영 + 마이그레이션 + FastAPI 재시작까지 사용자 직접 완료
