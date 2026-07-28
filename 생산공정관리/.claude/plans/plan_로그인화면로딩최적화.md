# 플랜: 로그인 직후 첫 화면 로딩(8초) 최적화 — 화면별 데이터 스트리밍

## Context (왜 필요한가)

실측 결과 "로그인 14초"·"거래명세서 관리 탭 40초" 중 40초는 Next.js 개발 모드(`npm run dev`)의 컴파일 지연이 원인이었고(운영 모드에서 1.4초로 확인), 사무실 PC 사양·DB는 문제가 없었음. 다만 **운영 모드에서도 로그인 직후 첫 화면이 뜨기까지 8초가 남아있었고**, 이건 개발/운영 모드와 무관하게 실제로 고쳐야 하는 부분 — 사용자 확정: "이 항목은 운영모드에서도 필요한 작업, 진행해달라. 운영모드 전환 자체는 개발 완료 후 별도로 진행."

**원인:** `frontend/app/page.tsx`가 로그인 성공 직후 `/summary`(운영통계자료 3.6만행) · `/미발행목록` · `/발행목록` · `/거래처마스터` · `/단가마스터` **5개 API를 `Promise.all`로 한 번에 다 받아온 뒤에야** 화면을 그림 — 사용자가 지금 보려는 탭(보통 첫 탭인 "작업 현황 요약")과 무관한 데이터(거래명세서 관리, 거래처 마스터용 데이터)까지 전부 기다려야 첫 화면이 뜸.

**실측 근거(2026-07-23):** 사무실 PC API 직접 호출 시 `/health` 0.1초, `/미발행목록`(4,613건) 약 2초, `/발행목록` 0.5초, `/summary`(36,804건) 약 3초 — DB·API 자체는 안 느림. 프로덕션 빌드로 재측정 시 "로그인 → 첫 화면" 8.2초, "거래명세서 관리 탭 클릭 → 표 렌더링" 1.4초(개발 모드 체감 40초 대비), "사업부 체크 → 담당자 옵션 반영" 0.09초(사실상 즉시) — 즉 필터링 자체는 문제 없고, 초기 데이터 로딩 구조만 문제.

## 해결 방향 — Next.js 공식 스트리밍 패턴 적용

이 프로젝트의 Next.js 버전(16.2.10, 번들 문서 `node_modules/next/dist/docs/01-app/02-guides/streaming.md`로 확인)이 공식 지원하는 패턴: **Server Component에서 fetch를 시작만 하고 await하지 않은 Promise를 Client Component에 그대로 넘긴 뒤, 그 Promise를 실제로 쓰는 컴포넌트를 `<Suspense>`로 감싸고 React `use()`로 풀어쓴다.** 이러면 정적 뼈대(헤더·탭 버튼)와 이미 준비된 데이터는 즉시 그려지고, 느린 데이터는 준비되는 대로 각자 스트리밍되어 채워짐 — 탭 전환 시 필터 상태를 보존하기 위한 기존 "탭 항상 마운트 + CSS로 숨김" 패턴과도 충돌 없음(Promise가 한 번 resolve되면 이후엔 항상 즉시 값을 반환하므로, 최초 로딩 이후 동작은 지금과 동일).

**핵심 설계:**
- 인증 확인(401 체크)용으로 가장 가볍고 빠른 호출(`/거래처마스터`, 단순 SELECT라 무거운 pandas 집계 없음) 하나만 `await`해서 여기서 실패하면 즉시 `/login`으로 리다이렉트
- 나머지 4개(`/summary`, `/미발행목록`, `/발행목록`, `/단가마스터`)는 fetch를 **시작만 하고 await하지 않은 Promise**로 `<Dashboard>`에 그대로 전달(기존의 raw→타입 매핑 로직은 그대로 유지하되 async 함수로 감싸서 그 함수의 반환 Promise를 넘김)
- `Dashboard.tsx`에서 각 탭을 `<Suspense fallback={...}>`으로 감싸고, 그 안에서 `use(promise)`로 데이터를 풀어 기존 Tab 컴포넌트에 그대로 넘기는 얇은 wrapper 함수를 둠 — **Tab1Summary·Tab2Clients·Tab3Staff·Tab4·ClientMasterSection 내부는 전혀 안 건드림**(지금처럼 다 받은 배열을 그대로 prop으로 받는 구조 유지, 리스크 최소화)
- 탭1·2·3은 전부 같은 `summaryPromise`를 `use()`함 — 같은 Promise를 여러 컴포넌트에서 `use()`해도 fetch가 중복 실행되지 않고, 한 번 resolve되면 다같이 즉시 반영됨(Next.js 문서의 "Sharing a promise across the tree" 패턴)

## 수정 파일

### `frontend/app/page.tsx`
- `fastapiFetch("/거래처마스터")`만 먼저 `await`해서 401 체크(리다이렉트) + `clientRows` 확보
- `loadSummary()`, `loadInvoice()`, `loadIssued()`, `loadPricing()` 같은 내부 async 함수로 각각의 fetch+매핑 로직을 감싸고, **await 없이 호출**해서 Promise만 확보(에러 시 함수 내부에서 `throw new Error(...)` — 기존과 동일하게 Next.js 기본 에러 처리로 감)
- `<Dashboard clientRows={clientRows} summaryPromise={...} invoicePromise={...} issuedPromise={...} pricingPromise={...} />`로 변경

### `frontend/components/Dashboard.tsx`
- Props 타입: `rows`→`summaryPromise: Promise<운영통계행[]>`, `invoiceRows`→`invoicePromise`, `issuedRows`→`issuedPromise`, `pricingRows`→`pricingPromise`(`clientRows`는 그대로 이미 resolved 배열)
- `import { Suspense, use } from "react"` 추가
- 탭1~5 렌더링 부분에 각각 `<Suspense fallback={<TabLoading />}>`으로 감싸고, 그 안에 얇은 wrapper(예: 탭1~3은 `summaryPromise`를 `use()`해서 각 Tab에 `rows`로 전달, 탭4는 `invoicePromise`·`issuedPromise`(+`summaryPromise`)를 `use()`, 거래처 마스터는 `pricingPromise`(+`summaryPromise`)를 `use()`)
- 간단한 `TabLoading` 컴포넌트(스피너/문구, 기존 `InvoiceHistoryDialog.tsx`의 "불러오는 중..." 스타일 재사용) 신규

## 검증 방법
1. `npx tsc --noEmit` · `npx eslint .`
2. 프로덕션 빌드로 재측정(지난번처럼 별도 포트에 격리 빌드) — 로그인 직후 "작업 현황 요약" 탭이 뜨는 시간이 8초보다 확실히 줄었는지, 다른 탭(거래명세서 관리 등)으로 이동했을 때 로딩 표시 후 정상적으로 데이터가 채워지는지 Playwright로 확인
3. 탭을 왔다갔다 전환해도 각 탭의 필터 선택 상태가 여전히 유지되는지 확인(기존 "탭 항상 마운트" 패턴이 안 깨졌는지)
4. 의도적으로 세션 쿠키 없이 접속 시 여전히 `/login`으로 정상 리다이렉트되는지 확인

## 비개발자용 확인 체크리스트
1. 로그아웃 후 다시 로그인 → 첫 화면(작업 현황 요약)이 이전보다 빨리 뜨는지 체감 확인
2. 거래명세서 관리 탭 클릭 → 잠깐 "불러오는 중" 표시 후 목록이 정상적으로 채워지는지 확인
3. 아무 탭에서나 필터(사업부·담당자 등) 선택 후 다른 탭 갔다가 다시 돌아와도 선택이 그대로 남아있는지 확인

## 진행 상태
- [x] 2026-07-23 구현 완료 — `frontend/app/page.tsx`(`/거래처마스터`만 await, 나머지 4개는 async 함수로 감싸 Promise만 확보) · `frontend/components/Dashboard.tsx`(`Suspense`+`use()` wrapper 5개, `TabLoading` 신규) 계획대로 수정. 기존 `Tab1Summary`~`ClientMasterSection` 내부는 무수정
- [x] `npx tsc --noEmit` · `npx eslint .` 클린, `npm run build` 성공
- [x] 검증: 로컬 격리 환경(로컬 FastAPI 8000 + 로컬 MariaDB, 프로덕션 서버는 건드리지 않음)에 임시 계정(`_perf_test_temp`) 생성 → 프로덕션 빌드(포트 3001, `FASTAPI_URL`만 로컬로 임시 오버라이드)로 실제 로그인→응답 스트림 확인 — 정적 뼈대(TTFB) 0.26s, 이전엔 5개 API를 `Promise.all`로 전부 기다려야 첫 바이트가 나갔던 구조였음. 서버 로그에 런타임/하이드레이션 오류 없음, 응답 본문에 "불러오는 중" 폴백과 실제 데이터가 정상 포함됨을 확인. 검증 후 임시 계정 삭제, 임시 서버(3001·8000) 전부 종료, `.env.local`은 애초에 수정하지 않아 원상복구 불필요
- [ ] 남은 항목: 실제 사무실 PC 프로덕션 환경(`192.168.30.201:8001`)에서 사용자가 직접 로그인해 체감 속도 확인(비개발자용 확인 체크리스트 1~3번) — 이번 세션은 로컬 검증까지만 진행
