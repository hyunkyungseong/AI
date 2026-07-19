# 플랜: 5단계 — Next.js 프론트엔드 (Vercel 배포 대비)

> 상태: ✅ [1단계] 완료 (탭1) → ✅ [2단계] 완료 (탭2) → ✅ [3단계] 코드 구현 완료 (탭3) → ✅ [4-A] 완료(백엔드: 자재형태 컬럼+계산·Excel FastAPI 이전) → ✅ [4-B] 완료(미발행목록 Next.js 화면, 브라우저 테스트까지 확인 완료) → ✅ [4-C] 완료(발행요청목록·발행완료 화면+부분취소 API, 브라우저 테스트까지 확인 완료) → ✅ **[4-C 부가] 표 헤더 sticky 고정 버그 해결 완료(2026-07-19, `SKILL.md` SKILL-16 참고 — 표 전용 박스 스크롤 방식으로 전환)** → ✅ **[4-D] 완료(거래처 마스터 화면, 2026-07-19)** → ✅ **[4-E] 완료(단가관리 화면, 2026-07-19 — "거래처 마스터" 탭 하위 메뉴로 배치, [4단계] 전체 완료)** → ✅ **[4-F] 완료(2026-07-19, Next.js 6개 탭 통합 검증 + Streamlit 당분간 병행 유지 결정)**
>
> ## 🎉 5단계(Next.js 프론트엔드) 전체 완료 (2026-07-19)
> 탭1~4·거래처 마스터(거래처관리/단가관리)까지 6개 최상위 탭 전부 완료·통합 검증까지 마침. Streamlit(`app.py`)은 당분간 계속 병행 사용(사용자 확정) — 데이터 이원화 주의사항은 아래 "⚠️ 데이터 이원화 주의사항" 절 그대로 유효. 이후 새 이슈는 이 플랜이 아니라 새 플랜/새 세션에서 진행.
> 선행: 1단계(MariaDB+FastAPI 백엔드) 완료 ✅ — `plan_1단계_MariaDB전환.md` 참고
> **진행 방식:** [1단계] 체크리스트를 번호 순서대로 하나씩 진행 — 각 항목 완료 후 화면 확인하고 다음 항목으로 넘어감 (한 번에 여러 항목 동시 진행 금지, CLAUDE.md "단계적으로 진행" 원칙)

---

## 배경 및 결정 사항 (2026-07-19)

- 원래 계획은 `plan_1단계_MariaDB전환.md`의 [4단계]에서 Streamlit(`app.py`)을 API 호출 방식으로 먼저 바꾼 뒤, Next.js를 별도로 진행하는 순서였음
- 그런데 [4단계](app.py를 API 호출 방식으로 뜯어고치는 작업)와 Next.js를 처음부터 새로 만드는 작업의 **규모가 비슷하다는 점**이 확인되어, [4단계]를 건너뛰고 **Next.js로 직행**하기로 결정
- **Streamlit(`app.py`)은 지금 상태(SQLite/pkl 직접 접근) 그대로 유지** — 손대지 않음. Next.js 탭이 하나씩 완성되면 그 영역만 대체하는 방식(점진적 전환)은 동일

## ⚠️ 데이터 이원화 주의사항

당사 생산공정관리시스템이 `POST /운영통계자료수신`으로 **MariaDB에만** 실시간 데이터를 보내는 반면, Streamlit(`app.py`)은 여전히 `data/운영통계자료.xlsx` 수동 업로드 → `work/processed.pkl`/SQLite만 봄. 두 화면(Next.js vs Streamlit)의 숫자가 시간이 지나며 서서히 달라질 수 있음 — 의도된 "당분간 병행" 상태 (`docs/작업현황-대시보드-생성-KNOWLEDGE.md` "당사 생산공정관리시스템 연동" 섹션 참고). Next.js 탭이 완성되는 영역은 MariaDB 기준으로 통일됨.

## 구조

```
scripts/app.py (Streamlit, Python)      ← 그대로 유지, 손대지 않음
frontend/ (Next.js, TypeScript, 신규)    ← 새 폴더, 새 프로그램
        │
        └─ 둘 다 같은 FastAPI(scripts/api.py, port 8000)를 호출 (같은 데이터 소스)
```

로컬 개발 시 동시 실행: **MariaDB + FastAPI(8000) + Next.js(보통 3000)**. Streamlit은 필요하면 계속 병행 실행 가능.

## 시작 화면

**탭1 — 작업현황요약**부터 시작 (결정 완료). 이유: 쓰기(POST/PUT/DELETE) 작업이 전혀 없고, `GET /summary` 하나만 호출하면 되는 가장 단순한 화면.

## [1단계] 준비 (다음 세션에서 진행)

- [x] 1. Node.js 설치 여부 확인 — 완료 (2026-07-18): Node.js v24.14.0, npm 11.9.0 설치 확인됨
- [x] 2. Next.js 프로젝트 생성 — 완료 (2026-07-18): `frontend/` 폴더, App Router, TypeScript, Tailwind CSS(사용자 선택) 적용. Next.js 16.2.10, React 19.2.4. `npm run dev`로 http://localhost:3000 기본 화면 정상 확인
- [x] 3. FastAPI 로그인(`POST /login`) 연동 방식 설계 — 완료 (2026-07-18): httpOnly 쿠키 방식(사용자 선택) 채택. BFF 패턴 구현 — Next.js Route Handler(`app/api/login`)가 FastAPI `/login`을 대신 호출하고 토큰을 Next.js 자체 도메인에 httpOnly 쿠키로 저장(`lib/fastapi.ts`가 서버에서 쿠키를 읽어 Authorization 헤더로 변환). FastAPI(`scripts/api.py`) 코드 수정 없음. `app/login/page.tsx` 로그인 화면 추가, 실제 계정(`seonghk`)으로 로그인 성공·오류 메시지·HttpOnly 보호 전부 화면 확인 완료
- [x] 4. 탭1(작업현황요약) 데이터 연동 — 완료 (2026-07-18): `GET /summary` 호출(서버 컴포넌트에서 `lib/fastapi.ts` 경유) → 4개 지표 카드(출력페이지·출력자재사용량·봉입건수·청구페이지, 전월대비 %), 사업부별 비교 막대차트 2개, 전월대비·전년동월대비 막대차트 2개 구현(Recharts, 사용자 선택). 차트 색상은 `dataviz` 스킬의 검증된 카테고리 팔레트(파랑/초록/주황) 고정 순서 적용
  - 필터 패널 추가(사용자 요청, 원래 계획엔 없었으나 Streamlit 사이드바와 동등한 기능 필요해 포함) — 2차 수정(사용자 피드백 반영): 상단 GET폼 방식 → **왼쪽 LNB + 즉시반응(버튼 없음)** 방식으로 전면 교체
    - `components/Dashboard.tsx`(클라이언트 컴포넌트)가 서버에서 받은 전체 데이터를 client state로 들고, 필터 변경 시 페이지 이동 없이 즉시 재계산(Streamlit rerun과 동일한 체감)
    - 필터 순서(사용자 지정): 사업부 → 조회기간(시작~종료) → 담당자 → 거래처 → 업무명. 상위 필터가 하위 필터의 선택지 목록을 좁히는 캐스케이딩 적용, 상위가 바뀌어 하위 선택값이 목록에서 사라지면 자동으로 선택 해제
    - 사업부·담당자·거래처·업무명은 `components/MultiSelectCombo.tsx`(신규, Streamlit st.multiselect처럼 선택 항목이 칩으로 표시되고 검색 가능한 콤보박스) 사용, 조회기간은 네이티브 날짜 입력 2개
    - `app/page.tsx`는 서버에서 `/summary` 호출 후 필요한 10개 필드만 추려 `Dashboard`에 props로 전달(26개 전체 컬럼 대신 축소 전송)
  - 기준월 규칙 확정(사용자 지정): 이번 달은 아직 종료되지 않았으므로 기준월은 항상 "가장 최근에 끝난 달"(오늘 기준 직전월) — Streamlit의 15일 기준 분기 로직(`_smart_end()`) 대신 단순 직전월 규칙 채택. 그래도 그 달 데이터가 없으면(드문 경우) 데이터가 있는 가장 최근 월로 2차 대체 — 화면에 "자동 대체됨" 안내 문구 표시
  - 필터 패널 접기/펼치기 토글 추가(사용자 요청): "◀"로 숨기면 본문이 넓어지고 작은 "▶" 버튼만 남음, 다시 클릭하면 기존 선택값 유지한 채 복원
  - 실 계정 로그인 후 curl로 렌더링 결과(HTML) 직접 검증 완료, `npx tsc --noEmit` 통과 확인, 브라우저 화면 테스트(필터 다중선택·캐스케이딩·숨기기) 사용자 확인 완료
- [x] 5. 로컬에서 Next.js(3000) + FastAPI(8000) 동시 실행 확인 — 완료 (2026-07-18): 이번 세션 전체가 두 서버를 동시 기동한 상태로 진행·검증됨 (MariaDB 로컬 + FastAPI `scripts/api.py` :8000 + Next.js `frontend` :3000)

## [2단계] 탭2 — 거래처별 현황 (착수 준비 완료, 2026-07-18 설계 확정)

> Streamlit `scripts/app.py`의 `tab2`(라인 396~437)를 Next.js로 이식

**필터 방침(확정, 탭1과 다름):** 탭마다 **독립적인 필터 상태**를 가짐(공유 안 함) — 탭1에서 거래처·담당자 등을 선택해도 탭2엔 영향 없고, 탭 전환 시 각 탭이 마지막으로 선택했던 필터값을 그대로 유지함. Streamlit(사이드바 필터를 모든 탭이 공유)과의 의도적인 차이.

- [x] 1. `lib/useFilters.ts` 완료 — 필터 상태·캐스케이딩 로직(사업부→조회기간→담당자→거래처→업무명, `base1~base5`, 옵션 목록, 필터초기화)을 `useFilters(rows)` 커스텀 훅으로 분리. `components/Dashboard.tsx`가 이 훅을 사용하도록 즉시 교체(동작 변화 없는 순수 리팩터링, 탭 분리는 3번에서 진행). `npx tsc --noEmit` 통과 확인
- [x] 2. `components/FilterSidebar.tsx` 완료 — LNB JSX(접기/펼치기 토글, `MultiSelectCombo` 5개, 필터초기화 버튼)를 `filters: ReturnType<typeof useFilters>` props로 받는 프리젠테이션 컴포넌트로 분리(접기/펼치기 상태는 순수 UI 상태라 컴포넌트 자체가 보유). `Dashboard.tsx`는 `<FilterSidebar filters={filters} />` 한 줄로 교체
  - **부수 수정:** 전체 `npx eslint .` 실행 중 `lib/useFilters.ts`(원래 `Dashboard.tsx`에서 그대로 옮겨온 코드)에서 `react-hooks/set-state-in-effect` 오류 3건 발견(Next.js 16 신규 린트 규칙 — "상위 필터 변경 시 하위 선택값 정리"를 `useEffect` 안에서 `setState`) → 렌더링 중 조정하는 React 공식 패턴(`usePrunedSelection` 헬퍼 훅)으로 교체, 동작 동일·`useEffect` 제거. `npx tsc --noEmit`·`npx eslint .` 전체 통과 확인
- [x] 3. `components/Dashboard.tsx` 리팩터링 완료 — 탭 전환 상태(`"summary" | "clients"`)와 공통 헤더(탭 버튼 2개 + 로그아웃)만 남김. `Tab1Summary`·`Tab2Clients`를 **항상 둘 다 마운트**한 채 비활성 탭은 CSS(`hidden`, `display:none`)로 숨김 처리(언마운트하면 필터 state가 날아가므로)
- [x] 4. `components/Tab1Summary.tsx` 완료 — 기존 탭1 내용(지표카드·사업부비교·전월/전년비교 차트) 전부 이동, 자체 `useFilters(rows)` 호출, 제목("작업 현황 요약 [사업부...]")도 이 컴포넌트로 이동
- [x] 5. `components/Tab2Clients.tsx` 완료 — Streamlit `tab2`(scripts/app.py 396~437행) 이식: 자체 `useFilters(rows).base5`를 (사업부,거래처명) 기준으로 그룹 집계(출력페이지·봉입건수·확정청구페이지 합산) → 상위 20 랭킹 차트 2개(`RankedBarChart`) + 거래처별 상세 표(전체 목록, 천단위 콤마, 헤더 클릭 시 오름/내림 토글 정렬, 기본 정렬은 출력페이지 내림차순으로 Streamlit과 동일)
- [x] 6. `components/RankedBarChart.tsx` 완료 — Recharts `BarChart layout="vertical"` 가로 랭킹 차트, `colorMap` prop으로 DM=`#2a78d6`/N=`#008300` 팔레트를 탭1(`DeptBarChart`)과 동일하게 재사용. Streamlit 원본은 탭2에 탭1과 다른 팔레트(`#4C72B0`/`#DD8452`)를 썼으나, "앱 전체에서 같은 사업부는 항상 같은 색"이라는 이번 설계 방침에 따라 탭1 색으로 통일(의도된 차이)
- [x] 7. `lib/format.ts` 완료 — `toMillionLabel()`(M단위 절삭 표기, `Math.floor(v/10_000)/100` 기존 Streamlit `int(v/10_000)/100` 공식과 동일) 분리, 랭킹 차트 막대 라벨에 적용
- [x] 8. 검증 완료 — `npx tsc --noEmit`·`npx eslint .` 전체 통과 확인. 브라우저 화면 테스트는 사용자 확인 대기 중

> 데이터 필드는 `app/page.tsx`가 이미 넘기는 10개 필드(연월·날짜·사업부·거래처명·마케팅담당자·업무명·출력페이지·장수·건수·확정청구페이지)로 충분 — `page.tsx` 수정 불필요

## [3단계] 탭3 — 담당자별 현황 (설계 확정)

> Streamlit `scripts/app.py`의 `tab3`(443~531행)를 Next.js로 이식. 상세 설계 근거는 `C:\Users\hyunkyung\.claude\plans\validated-marinating-stallman.md` 참고(색상 결정 근거·dataviz 스킬 적용 내역 등)

- [x] 1. 데이터 필드 확장 완료 — `app/page.tsx` raw 매핑에 `등록자`(string, 없으면 "")·`시간대`(number|null) 추가, `Dashboard.tsx`의 `운영통계행` 타입에도 반영
- [x] 2. `lib/colors.ts` 완료 — `사업부색상`(DM=`#2a78d6`/N=`#008300`) + `작업자색상`(`#e87ba4`) 상수 분리. `Tab1Summary.tsx`(2곳)·`Tab2Clients.tsx`(1곳)의 인라인 컬러맵을 이 상수로 교체
- [x] 3. `components/Heatmap.tsx` 완료 — 범용 시퀀셜 히트맵 그리드(rows/columns/values + `mixHex()` 단일 색조 보간 + 호버/포커스 커스텀 툴팁), CSS grid `gap-[2px]`로 셀 간 surface 갭 구현
- [x] 4. `components/Tab3Staff.tsx` 완료 — 자체 `useFilters(rows)`+`FilterSidebar`, 마케팅담당자+작업자 통합 집계(작업자→DM→N 그룹 순서·그룹 내 값 내림차순) → 기존 `RankedBarChart` 재사용(신규 컴포넌트 불필요) 2개 + `Heatmap` 2개(작업자 데이터 없으면 마케팅담당자 히트맵만 전체 폭)
- [x] 5. `Dashboard.tsx`에 3번째 탭("담당자별 현황") 추가 완료 — `TABS` 배열·상시 마운트(+hidden) 블록
- [x] 6. 검증 완료 — `npx tsc --noEmit`·`npx eslint .` 전체 통과. 브라우저 화면 테스트는 사용자 확인 대기 중

## [4단계] 탭4 — 거래명세서 관리 (로드맵 + 4-A 진행 중)

> Streamlit `scripts/app.py`의 `tab4`(623~2036행)를 이식. 상세 설계 근거는 `C:\Users\hyunkyung\.claude\plans\validated-marinating-stallman.md` 참고(자재형태 컬럼 신설 근거, calc_공급가맵/Excel 생성 FastAPI 이전 이유 등)
> 앞선 탭들과 달리 **쓰기 작업+금액계산+Excel 생성**이 핵심이라 규모가 훨씬 큼 — [4-A]만 이번에 상세 설계, [4-B] 이후는 매번 그 시점에 상세 설계

**화면 구조 결정:** 탭4("거래명세서 관리")에는 미발행목록·발행요청목록·발행완료만 남음. "거래처 마스터"·"단가 관리"는 애초 [4-A] 설계 당시 "단가는 추후 권한 관리 대상"이라는 이유로 각각 독립 최상위 메뉴로 분리하기로 했었으나, **[4-E] 진행 시 사용자가 재확정**: 같은 거래처를 다루는 밀접한 화면이라 "거래처 마스터" 최상위 탭 하나 아래에 "거래처관리"·"단가관리" 2개 하위 메뉴로 묶는 구조로 변경(권한 분리가 필요해지면 하위 메뉴 단위로도 숨김 가능하므로 최상위 분리가 필수는 아니라고 판단 — 거래명세서 관리 탭의 하위 메뉴 3개와 동일한 구조). `Dashboard.tsx`의 `TABS`는 최종 5개(작업 현황 요약·거래처별 현황·담당자별 현황·거래명세서 관리·거래처 마스터)로 유지.

| 단계 | 내용 | 상태 |
|---|---|---|
| **4-A** | 자재형태 컬럼 추가+데이터 채우기, 계산·Excel 생성 로직을 FastAPI로 이전 | ✅ 완료 |
| **4-B** | Next.js: 미발행 목록 화면(조회+요청, 탭4 서브탭) | ✅ 완료 |
| **4-C** | Next.js: 발행요청목록·발행완료 공통 드릴다운 화면(탭4 서브탭) + `POST /거래명세서부분취소` 신규 API | ✅ 완료 |
| 4-D | Next.js: 거래처 마스터 화면("거래처관리" 하위 메뉴, 기본정보 CRUD) | ✅ 완료 (2026-07-19) |
| 4-E | Next.js: 단가 관리 화면("단가관리" 하위 메뉴) | ✅ 완료 (2026-07-19) |
| 4-F | 통합 검증 + Streamlit과의 병행 운영 방식 결정 | 다음 착수 대상 |

### [4-A] 체크리스트

- [x] 1. MariaDB 스키마 완료 — `자재사용현황`에 `자재형태`(`VARCHAR(20) NULL`) 컬럼 추가. `scripts/init_db_mariadb.py`의 `CREATE TABLE` 문 갱신 + 이미 존재하는 테이블도 안전하게 보정하는 `migrate()` 함수 신규(컬럼 존재 여부 확인 후 `ALTER TABLE`, 재실행해도 안전) 추가·실행 확인
- [x] 2. `scripts/data_transform.py` 완료 — `_봉투종류(자재명)` 판별 로직 이식("각대"·"대봉투" 포함 시 각대대봉투, 아니면 일반봉투), `merge_자재()`가 `자재형태`까지 포함해 그룹핑(라인 상세 테이블용은 자재형태 포함 세분화, 운영통계자료 4개 사용량 컬럼용은 기존처럼 자재형태 무시하고 합산하는 2단계 집계로 분리)
- [x] 3. `scripts/preprocess.py` 완료 — INSERT문에 `자재형태` 컬럼 추가 후 재실행 → 자재사용현황 6,316행 반영 확인(기존 5,984행에서 증가 — 봉투가 일반/각대대로 나뉘며 일부 의뢰서가 2행이 됨). 실제 분포 확인: 봉투(일반 2,519건·각대대 450건), 용지 2,785건, 삽지 465건, 미구분 97건(전부 NULL, 정상)
- [x] 4. `scripts/api.py`의 `/운영통계자료수신` 완료 — 자재명이 없는 실시간 수신 건은 `merge_자재()`가 자동으로 "일반봉투"를 직접 채워 저장(NULL 대신 확정값 저장 — 계산 시 별도 NULL 처리 불필요, 더 단순한 방식으로 구현)
- [x] 5. `scripts/billing.py` 신규 완료 — `app.py`의 `calc_공급가맵()`·`generate_거래명세서_excel()`을 그대로 이동(코드 변경 없음, df_all·단가맵·자재map을 인자로 받도록만 파라미터화). `build_단가맵()`·`build_자재map()` 헬퍼 신규 추가. `scripts/app.py`는 이 모듈에서 import 후 얇은 래퍼로 교체(동작 동일, Streamlit AppTest로 무예외 확인)
- [x] 6. `scripts/api.py` 신규 엔드포인트 2개 완료 — `GET /예상공급가액`(사업부 선택 필터, `/summary` A안과 동일 패턴), `GET /거래명세서엑셀/{no}`(언제든 재호출 가능한 Excel 다운로드). **구현 중 실제 버그 2건 발견·수정:** ① Starlette가 `{한글이름}` 형식의 경로 파라미터를 인식 못 해 라우팅이 항상 404로 실패 → 파라미터명을 영문 `no`로 변경(다른 API의 `{id}`와 동일 관례로 통일), ② MariaDB `DECIMAL` 컬럼이 pymysql에서 `Decimal`로 반환되는데 `float(0.0)` 누산 변수와 섞이면 `TypeError` 발생 → `build_단가맵()`에서 float 변환 추가(app.py의 `load_단가마스터()`가 SQLite 조회 후 이미 하던 처리와 동일하게 통일)
- [x] 7. `docs/API규격서.md` 갱신 완료 — 신규 엔드포인트 2개 섹션 추가, 자재형태 필드 설명, "실시간 수신 경로에 자재명 필드가 추가되면 좋겠다"는 메모, 경로 파라미터명 관련 주의사항 반영
- [x] 8. 검증 완료 — 전체 `py_compile` 통과, `preprocess.py` 재실행 후 자재형태 분포 확인, Streamlit `AppTest`로 탭4 포함 전체 무예외 실행 확인, 임시 테스트 계정으로 로그인 후 `GET /예상공급가액`(652건 정상 반환) 및 실제 각대대봉투 보유 의뢰서(91997, BC카드)의 계산값 상세 대조(각대대봉투 56개가 봉입비 계산에 정상 반영, 봉투제작비는 BC카드 특성상 무상 제공이라 단가 0으로 정상), `GET /거래명세서엑셀/{no}`로 기존 발행 건(D-202607-00001) Excel 생성 후 openpyxl로 열어 헤더·품목·합계 정상 확인. 테스트 계정·임시 파일 전부 정리 완료

### [4-B] 체크리스트 — 완료 (2026-07-19)

- [x] 1. `scripts/billing.py`에 `build_의뢰서_summary()` 신규 추가 — app.py 동명 함수(124~143행)와 동일 로직, 자재 소스만 라인 단위 DataFrame을 받도록 파라미터화(SKILL-12 가드 포함)
- [x] 2. `scripts/api.py`에 `GET /미발행목록` 신규 — 미발행 판정(거래명세서_의뢰서와 문자열 차집합) + `build_의뢰서_summary()` 집계 + `calc_공급가맵()` 금액계산을 서버가 전담해서 의뢰서 단위로 반환(계산 위치를 FastAPI로 두는 결정, app.py의 A안과는 다른 설계)
- [x] 3. `POST /거래명세서요청`에 사업부 혼합 서버 검증 추가(기존엔 app.py 화면단에만 있었음) — `try/except` 블록 밖에서 먼저 검증해 400이 500으로 감싸이는 함정 회피
- [x] 4. Next.js 신규 파일: `lib/useInvoiceFilters.ts`(탭4 전용 필터 훅, `useFilters`는 헬퍼 2개만 export 추가해 재사용), `components/InvoiceFilterSidebar.tsx`·`InvoiceSelectionTable.tsx`(프로젝트 최초 체크박스 선택 그리드)·`InvoiceSelectionSummaryBar.tsx`·`Tab4Invoice.tsx`(오케스트레이터), `app/api/거래명세서요청/route.ts`(프로젝트 최초 쓰기 프록시, `app/api/login/route.ts`와 동일 패턴)
- [x] 5. `Dashboard.tsx`에 4번째 탭("거래명세서 관리") 추가, `app/page.tsx`에 `/미발행목록` 병렬 fetch 추가
- [x] 6. 검증 완료 — `python -m py_compile scripts/billing.py scripts/api.py`, `npx tsc --noEmit`·`npx eslint .` 전체 통과. `docs/API규격서.md`에 `GET /미발행목록` 섹션(4-3d) 및 `POST /거래명세서요청` 400 오류 케이스 반영
- [x] 7. 사용자 브라우저 테스트 중 버그 발견·수정 — "거래명세서 요청" 클릭 시 "서버에 연결할 수 없습니다" 오류 제보 → `app/api/거래명세서요청/route.ts`(한글 폴더명)를 Next.js App Router가 라우트로 인식 못 해 항상 404였던 것이 원인(SKILL-15 신규). `app/api/invoice-request/route.ts`로 개명해 해결, 재검증 완료
- [x] 8. 사용자 브라우저 테스트 중 성능 이슈 발견·수정 — 체크박스 하나 해제하는데도 느리다고 제보 → 미발행 건 전체(약 4,600여 행)를 토글할 때마다 다시 그리던 것이 원인. `InvoiceSelectionTable.tsx`의 행을 `React.memo` 서브컴포넌트로 분리(Set 전체 대신 checked boolean만 prop 전달), `Tab4Invoice.tsx`의 토글 함수도 `useCallback`으로 고정해 토글한 행 1개만 리렌더되도록 개선
- [x] 9. 사용자 요청으로 필터를 탭1~3과 동일한 5단(사업부→조회기간→담당자→거래처→업무명)으로 확장 — 백엔드 변경 없이 기존 `미발행행` 필드만으로 구현, 조회기간 기본값은 "전체 기간"으로 결정(탭1~3의 "최근 1개월" 기본값과 의도적으로 다름 — 밀린 건을 놓치지 않기 위함)
- [x] 10. 나머지 화면 시나리오(로그인 → 탭 진입 → 필터 → 체크박스 선택 → 요청 성공까지 전체 흐름) 사용자 확인 완료 — [4-B] 종료

### [4-C] 체크리스트 — 코드 구현 완료 (2026-07-19)

- [x] 1. 상태 소유권 리팩터링 — `Tab4Invoice.tsx`의 `useState(initialRows)` 비제어 상태를 controlled(`rows`/`setRows`/`onIssued` props)로 전환. 신규 `components/Tab4.tsx`가 `invoice`(미발행행[])·`issued`(발행행[]) state를 소유하고 3개 서브탭(미발행목록/발행요청목록/발행완료)에 내려줌 — 화면 간 새로고침 없는 정합성 확보
- [x] 2. `scripts/api.py`에 `GET /발행목록` 신규 — `/미발행목록`과 대칭(판정 방향 반대), 거래명세서번호·발송여부 필드 추가, 발송여부 파라미터 없이 전체 반환. 예상공급가액은 저장 헤더값이 아니라 항상 재계산(그룹 단위 표시 필요 + `/거래명세서엑셀/{no}`와 통일성)
- [x] 3. `scripts/api.py`에 `POST /거래명세서부분취소` 신규 — 0건 남으면 `거래명세서` DELETE(CASCADE), 1건 이상 남으면 취소분만 삭제 후 재계산 UPDATE, 이미 발행완료면 서버가 취소 차단
- [x] 4. Next.js 신규: `lib/useIssuedFilters.ts`(복제, SKILL-10), `lib/issuedGrouping.ts`(레벨1 그룹핑), `components/InvoiceIssuedLevel1Table.tsx`·`InvoiceIssuedLevel2Table.tsx`(React.memo Row 패턴 재사용), `components/ConfirmDialog.tsx`(프로젝트 첫 모달), `components/Tab4IssuedList.tsx`(Streamlit `_render_발행_섹션` 대응, mode 파라미터화), `components/Tab4.tsx`(서브탭 오케스트레이터). 레벨3·선택합계는 [4-B]의 `InvoiceDetailTable.tsx`·`InvoiceSelectionSummaryBar.tsx` 그대로 재사용(신규 컴포넌트 불필요)
- [x] 5. `app/api/invoice-publish`·`invoice-unpublish`·`invoice-cancel` Route Handler 3개 신규(영문 폴더명, SKILL-15), `app/page.tsx`에 `/발행목록` 3번째 병렬 fetch 추가
- [x] 6. 검증 완료 — `python -m py_compile`, `npx tsc --noEmit`·`npx eslint .`(경고 0건) 통과. `docs/API규격서.md`에 `GET /발행목록`(4-3e)·`POST /거래명세서부분취소` 섹션 반영
- [x] 7. 실제 이슈 발견·수정 — 코드 추가 후 기존 FastAPI 서버(`--reload` 미사용)가 신규 라우트를 인식 못 해 404 → 서버 재시작으로 해결(사용자 확인 후 진행). `curl`이 Windows Git Bash에서 한글 URL을 깨뜨려 정상 라우트를 404로 오인했던 것도 확인(`python requests`로 재검증) — 앞으로 이런 진단엔 curl보다 requests 우선
- [x] 8. 로컬 MariaDB로 전체 흐름 실측 검증 — 미발행 의뢰서 1건으로 요청→발행목록 반영→부분취소(전체취소, action=delete)→미발행목록 복귀→CASCADE로 관련 테이블 완전 삭제까지 원상복구 상태로 확인
- [x] 9. 브라우저 화면 테스트(로그인 → 탭4 진입 → 발행요청목록/발행완료 드릴다운 → 발행/되돌리기/부분취소 실제 클릭) 사용자 확인 완료 — [4-C] 종료
- [x] 10. 사용자 브라우저 테스트 중 버그 발견·수정 — 발행요청목록에서 취소한 항목이 미발행 목록 맨 마지막 행에 붙는다고 제보 → `Tab4.tsx`의 `handleIssued`/`handleReturnToUnissued`가 단순 append만 해서 서버가 내려준 작업일자 내림차순이 깨지던 것이 원인. 병합 후 재정렬하도록 수정, 재검증 완료

### [4-D] 체크리스트 — 완료 (2026-07-19)

- [x] 1. `scripts/api.py` 수정 — `POST /거래처마스터`를 전체교체→단건생성으로 교체(`POST /단가마스터`와 동일 패턴, 중복은 `IntegrityError`→409), `PUT /거래처마스터/{name}` 신규(사업자등록번호·수신이메일·비고만 수정 가능, 거래처명은 요청 바디에 필드 자체가 없어 API 레벨부터 변경 불가 — 다른 테이블들이 거래처명을 FK 없이 참조하는 데서 오는 위험 방지). `GET`·`DELETE`는 그대로 유지
- [x] 2. `docs/API규격서.md` §4-4 갱신 — POST/PUT 설명 교체, 오류 응답(400/409/404) 표 추가
- [x] 3. `frontend/components/ConfirmDialog.tsx`에 `dangerText?: string` prop 추가(기본값 유지, 하위 호환) — 거래처 삭제 시 "삭제 후 복구할 수 없습니다."로 오버라이드
- [x] 4. Next.js 신규 — `components/ClientMaster.tsx`(오케스트레이터, 로컬 state 단독 소유), `components/ClientMasterTable.tsx`(기존 표 패턴+SKILL-16 재사용), `components/ClientFormDialog.tsx`(프로젝트 첫 입력 폼 모달, 거래처명 수정모드 읽기전용), `app/api/client-create`·`client-update`·`client-delete` Route Handler 3개. `app/page.tsx`·`Dashboard.tsx`에 5번째 탭 배선
- [x] 5. 실제 버그 발견·수정 — `ClientFormDialog.tsx`의 다이얼로그 재사용 시 `useEffect` 안 `setState` 재동기화가 Next.js 16 린트 규칙 위반 → `formKey` 기반 리마운트(key 리셋 패턴)로 교체
- [x] 6. 검증 완료 — 로컬 MariaDB로 API 실측(생성/중복409/수정/404/삭제, 원상복구), `npx tsc --noEmit`·`npx eslint .` 통과, Playwright 임시 재설치로 브라우저 종단 검증(추가→중복오류→수정→삭제 전체 흐름 스크린샷+DB 직접 확인) 후 Playwright·임시 계정·임시 스크립트 전부 정리

### [4-E] 체크리스트 — 완료 (2026-07-19)

- [x] 1. 메뉴 구조 재확정 — "거래처 마스터" 탭 하위에 "거래처관리"·"단가관리" 2개 메뉴로 배치(최상위 탭 분리 계획 취소). `components/ClientMasterSection.tsx` 신규(하위 메뉴 허브, `Tab4.tsx`와 동일한 상시마운트+hidden 패턴)
- [x] 2. `scripts/api.py` 보완 — `POST /단가마스터` 응답에 `id` 추가(`cur.lastrowid`), 기본단가(작업명 NULL인 모든 경우) 중복 방지 신규 추가. 실제 버그 발견·수정: 처음엔 "업무명·작업명 둘 다 NULL"만 체크했으나 Playwright 실측 중 "업무명만 있고 작업명 NULL"도 같은 문제였음을 발견해 일반화
- [x] 3. `docs/API규격서.md` 갱신 — POST 응답 `id` 반영, 기존 "알려진 한계" 서술을 "해결됨"으로 교체
- [x] 4. Next.js 신규 — `components/PricingMaster.tsx`(오케스트레이터, 거래처 선택 드롭다운+로컬 state), `components/PricingMasterTable.tsx`(12컬럼, SKILL-16 박스 스크롤), `components/PricingFormDialog.tsx`(업무명·작업명 `<input list>`+`<datalist>` 자유입력+추천, 수정 모드 읽기전용), `app/api/pricing-create`·`pricing-update`·`pricing-delete` Route Handler 3개. `app/page.tsx`·`Dashboard.tsx`에 `/단가마스터` fetch·`단가행` 타입·`pricingRows` prop 배선, `운영통계행`에 `작업명` 필드 추가(백엔드는 이미 반환 중이었음)
- [x] 5. 사용자 확정 사항 반영 — 업무명·작업명을 기존 운영통계자료 값 선택뿐 아니라 자유 입력으로 신규 등록도 허용(Streamlit의 "선택만 가능" 제약보다 완화)
- [x] 6. 검증 완료 — `py_compile`, 로컬 MariaDB 실측(기본단가 생성/중복409/일반화 버그 재현 후 수정 확인/수정/404/삭제), `npx tsc --noEmit`·`npx eslint .` 통과, Playwright 임시 재설치로 브라우저 종단 검증(거래처관리↔단가관리 전환, 단가 추가/중복오류/수정/삭제, 거래처관리 회귀) 후 전부 정리

### [4-F] 체크리스트 — 완료 (2026-07-19)

- [x] 1. Next.js 6개 최상위 탭(작업 현황 요약·거래처별 현황·담당자별 현황·거래명세서 관리·거래처 마스터[거래처관리/단가관리]) 전체를 사용자가 직접 클릭하며 통합 확인
- [x] 2. Streamlit(`app.py`) 병행 운영 방식 결정(사용자 확정) — 당장 퇴역시키지 않고 당분간 계속 병행 사용. 기존 문서화된 데이터 이원화 주의사항(아래 절)은 그대로 유효

**[4단계] 전체 완료 — 5단계(Next.js 프론트엔드) 전체 완료.**

## 미정 사항 (다음 세션에서 확인·결정 필요)

- ~~⚠️ 최우선(사용자 지정): 표 헤더(thead) sticky 위치 버그 미해결~~ → ✅ 2026-07-19 해결 완료 (`SKILL.md` SKILL-16, `.claude/plans/bug_sticky_thead_위치오류.md` 참고)
- ~~Vercel 배포 시점~~ → ✅ 결정 완료(2026-07-19): 로컬에서 화면을 더 다듬은 뒤 배포하기로 함(초기부터 배포 연동하지 않음)
- 당사 생산공정관리시스템 쪽에 `/운영통계자료수신` 자재 행 규격에 자재명·작업명(또는 자재형태) 필드 추가를 요청할지 여부·시점(2026-07-19 자재사용현황 작업명 부풀림 버그 수정 시 작업명 요청 메모도 추가됨, `docs/API규격서.md` 참고)
- ~~거래명세서 화면 미리보기 기능~~ → ✅ 완료(2026-07-20): "요청 클릭 → 미리보기 팝업 → 확정" 흐름, 항목·합계만 보여주는 단순 표(직인 없음)로 확정·구현. `scripts/billing.py`에 `build_품목행()` 신규(계산 분리), `POST /거래명세서미리보기` 신규, `components/InvoicePreviewDialog.tsx` 신규. 상세: `docs/CHANGELOG.md` 2026-07-20 항목

---

*생성일: 2026-07-19*
