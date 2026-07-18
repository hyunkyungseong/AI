# 플랜: 5단계 — Next.js 프론트엔드 (Vercel 배포 대비)

> 상태: ✅ [1단계] 완료 (탭1) → ✅ [2단계] 완료 (탭2) → ✅ [3단계] 코드 구현 완료 (탭3) → ✅ [4-A] 완료(백엔드: 자재형태 컬럼+계산·Excel FastAPI 이전) → ⏳ [4-B](미발행목록 Next.js 화면) 다음 세션에서 착수
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

**화면 구조 결정:** 탭4("거래명세서 관리")에는 미발행목록·발행요청목록·발행완료만 남고, "거래처 마스터"(기본정보)와 "단가 관리"는 각각 **독립된 최상위 메뉴**로 분리(단가는 추후 권한 관리 대상이라 애초에 화면 분리, 거래처 마스터도 함께 최상위로 이동 — 사용자 확정). `Dashboard.tsx`의 `TABS`가 최종적으로 6개(작업 현황 요약·거래처별 현황·담당자별 현황·거래명세서 관리·거래처 마스터·단가 관리)가 됨.

| 단계 | 내용 | 상태 |
|---|---|---|
| **4-A** | 자재형태 컬럼 추가+데이터 채우기, 계산·Excel 생성 로직을 FastAPI로 이전 | ✅ 완료 |
| 4-B | Next.js: 미발행 목록 화면(조회+요청, 탭4 서브탭) | 다음 세션에서 상세 설계 |
| 4-C | Next.js: 발행요청목록·발행완료 공통 드릴다운 화면(탭4 서브탭) + `POST /거래명세서부분취소` 신규 API | 다음 세션에서 상세 설계 |
| 4-D | Next.js: 거래처 마스터 화면(독립 최상위 탭, 기본정보 CRUD) | 다음 세션에서 상세 설계 |
| 4-E | Next.js: 단가 관리 화면(독립 최상위 탭, 화면 구조만 — 권한 체크는 이후) | 다음 세션에서 상세 설계 |
| 4-F | 통합 검증 + Streamlit과의 병행 운영 방식 결정 | 4-B~E 이후 |

### [4-A] 체크리스트

- [x] 1. MariaDB 스키마 완료 — `자재사용현황`에 `자재형태`(`VARCHAR(20) NULL`) 컬럼 추가. `scripts/init_db_mariadb.py`의 `CREATE TABLE` 문 갱신 + 이미 존재하는 테이블도 안전하게 보정하는 `migrate()` 함수 신규(컬럼 존재 여부 확인 후 `ALTER TABLE`, 재실행해도 안전) 추가·실행 확인
- [x] 2. `scripts/data_transform.py` 완료 — `_봉투종류(자재명)` 판별 로직 이식("각대"·"대봉투" 포함 시 각대대봉투, 아니면 일반봉투), `merge_자재()`가 `자재형태`까지 포함해 그룹핑(라인 상세 테이블용은 자재형태 포함 세분화, 운영통계자료 4개 사용량 컬럼용은 기존처럼 자재형태 무시하고 합산하는 2단계 집계로 분리)
- [x] 3. `scripts/preprocess.py` 완료 — INSERT문에 `자재형태` 컬럼 추가 후 재실행 → 자재사용현황 6,316행 반영 확인(기존 5,984행에서 증가 — 봉투가 일반/각대대로 나뉘며 일부 의뢰서가 2행이 됨). 실제 분포 확인: 봉투(일반 2,519건·각대대 450건), 용지 2,785건, 삽지 465건, 미구분 97건(전부 NULL, 정상)
- [x] 4. `scripts/api.py`의 `/운영통계자료수신` 완료 — 자재명이 없는 실시간 수신 건은 `merge_자재()`가 자동으로 "일반봉투"를 직접 채워 저장(NULL 대신 확정값 저장 — 계산 시 별도 NULL 처리 불필요, 더 단순한 방식으로 구현)
- [x] 5. `scripts/billing.py` 신규 완료 — `app.py`의 `calc_공급가맵()`·`generate_거래명세서_excel()`을 그대로 이동(코드 변경 없음, df_all·단가맵·자재map을 인자로 받도록만 파라미터화). `build_단가맵()`·`build_자재map()` 헬퍼 신규 추가. `scripts/app.py`는 이 모듈에서 import 후 얇은 래퍼로 교체(동작 동일, Streamlit AppTest로 무예외 확인)
- [x] 6. `scripts/api.py` 신규 엔드포인트 2개 완료 — `GET /예상공급가액`(사업부 선택 필터, `/summary` A안과 동일 패턴), `GET /거래명세서엑셀/{no}`(언제든 재호출 가능한 Excel 다운로드). **구현 중 실제 버그 2건 발견·수정:** ① Starlette가 `{한글이름}` 형식의 경로 파라미터를 인식 못 해 라우팅이 항상 404로 실패 → 파라미터명을 영문 `no`로 변경(다른 API의 `{id}`와 동일 관례로 통일), ② MariaDB `DECIMAL` 컬럼이 pymysql에서 `Decimal`로 반환되는데 `float(0.0)` 누산 변수와 섞이면 `TypeError` 발생 → `build_단가맵()`에서 float 변환 추가(app.py의 `load_단가마스터()`가 SQLite 조회 후 이미 하던 처리와 동일하게 통일)
- [x] 7. `docs/API규격서.md` 갱신 완료 — 신규 엔드포인트 2개 섹션 추가, 자재형태 필드 설명, "실시간 수신 경로에 자재명 필드가 추가되면 좋겠다"는 메모, 경로 파라미터명 관련 주의사항 반영
- [x] 8. 검증 완료 — 전체 `py_compile` 통과, `preprocess.py` 재실행 후 자재형태 분포 확인, Streamlit `AppTest`로 탭4 포함 전체 무예외 실행 확인, 임시 테스트 계정으로 로그인 후 `GET /예상공급가액`(652건 정상 반환) 및 실제 각대대봉투 보유 의뢰서(91997, BC카드)의 계산값 상세 대조(각대대봉투 56개가 봉입비 계산에 정상 반영, 봉투제작비는 BC카드 특성상 무상 제공이라 단가 0으로 정상), `GET /거래명세서엑셀/{no}`로 기존 발행 건(D-202607-00001) Excel 생성 후 openpyxl로 열어 헤더·품목·합계 정상 확인. 테스트 계정·임시 파일 전부 정리 완료

> 4-B 이후(Next.js 화면 구현)는 다음 세션에서 상세 설계.

## 미정 사항 (다음 세션에서 확인·결정 필요)

- Vercel 배포 시점 (로컬 개발 먼저 끝내고 배포할지, 초기부터 배포 연동할지)
- 당사 생산공정관리시스템 쪽에 `/운영통계자료수신` 자재 행 규격에 자재명(또는 자재형태) 필드 추가를 요청할지 여부·시점

---

*생성일: 2026-07-19*
