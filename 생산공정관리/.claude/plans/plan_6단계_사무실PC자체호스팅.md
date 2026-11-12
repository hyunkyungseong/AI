# 플랜: 6단계 — 사무실 PC 자체 호스팅 (직원 사내 접속 배포)

> 상태: ⏳ 승인 대기 (2026-11-12 작성) — **다음 세션 시작점:** 사용자에게 ① 사무실 PC 인터넷 연결 여부(맨 아래
> "확인 필요") 답을 받고 ② 계획 승인("진행해줘")을 받은 뒤 **[A] A1(로그인 쿠키 수정)부터** 시작
> 배경: 2026-09-02 결정 — Vercel 대신 Next.js도 사무실 PC(`192.168.30.201`)에서 `next build`+`next start`로
> 실행, 직원 약 20명은 사내 IP로 접속(`docs/작업현황-대시보드-생성-KNOWLEDGE.md` "최종 배포 목표").
> 목표 접속 주소: **`http://192.168.30.201:3000`**

## 지금 상태 (2026-11-12 점검)

| 항목 | 상태 | 근거 |
|---|---|---|
| 운영용 실행 명령 | ✅ 있음(`build`·`start`) | `frontend/package.json` |
| 사무실 PC API 서버 | ✅ 포트 8001 운영 중 | `API서버_실행_사무실PC.bat` |
| 사무실 PC Node.js | ❌ 미설치(사용자 확인 — `node -v` 실행 불가) | — |
| 로그인 쿠키 | ❌ 운영 모드에서 "https 전용"이 켜져 사내 http 주소로는 로그인 유지 불가 | `frontend/app/api/login/route.ts:26` |
| 사무실 PC용 화면 실행·업데이트 파일 | ❌ 없음(지금 `웹화면_실행.bat`은 개발용 `npm run dev`) | — |
| 방화벽(포트 3000) | ❓ 미확인 | — |

로컬 PC Node.js: v24.14.0 / npm 11.9.0 → 사무실 PC도 **Node.js 24 LTS** 설치(버전 맞춤).

## [A] 로컬 PC 준비 — Claude가 수정 (코드)

- [ ] A1. 로그인 쿠키 "https 전용" 설정을 환경설정값으로 제어
  - `secure: process.env.NODE_ENV === "production"` → `secure: process.env.COOKIE_SECURE === "true"`
  - 기본값 꺼짐(사내 http 접속 정상). 나중에 https(외부 접속)를 붙이면 `.env.local`에 `COOKIE_SECURE=true` 한 줄로 켬
  - 로그아웃(`app/api/logout/route.ts`)은 쿠키 삭제만 해서 수정 불필요
- [ ] A2. 사무실 PC용 bat 파일 2개 신규 (`%~dp0` 상대경로, CLAUDE.md 규칙)
  - `웹화면_실행_사무실PC.bat` — 운영 모드 실행(`next start`, 포트 3000, 사내망 접속 허용)
  - `웹화면_업데이트_사무실PC.bat` — 수정본 반영용: 포트 3000 종료 → 패키지 설치 → 조립(`build`) → 재실행 (더블클릭 한 번)
- [ ] A3. 로컬 PC에서 운영 모드 리허설 — 이 PC에서 `build`+`start`로 띄운 뒤 **`http://192.168.30.60:3000`(IP 주소)**로
      접속해 로그인 유지·탭 5개 동작 확인(localhost 예외 없이 실제 사내 접속과 같은 조건 재현). 확인 후 개발 모드로 원복
- [ ] A4. `npx tsc --noEmit`·`npx eslint .`·`npm run build` 통과

## [B] 사무실 PC 설치 — 사용자가 진행 (체크리스트로 단계별 안내)

- [ ] B1. Node.js 24 LTS 설치(nodejs.org 공식 무료 설치 파일, 기본 옵션) → `node -v` 확인
- [ ] B2. `frontend` 폴더 복사 — `node_modules`·`.next`·`.env.local`은 **제외**(용량 크고 PC마다 새로 만들어야 함)
- [ ] B3. 사무실 PC `frontend/.env.local` 새로 작성: `FASTAPI_URL=http://127.0.0.1:8001` (같은 PC 안 API 서버)
- [ ] B4. bat 파일 2개 복사 → `웹화면_업데이트_사무실PC.bat` 실행(처음엔 패키지 설치 포함 수 분 소요)
- [ ] B5. 포트 3000이 다른 프로그램과 겹치지 않는지 확인(8000번 "ibx dashboard" 전례)
- [ ] B6. Windows 방화벽에 포트 3000 허용 규칙 추가
- [ ] B7. **다른 직원 PC**에서 `http://192.168.30.201:3000` 접속 → 로그인 → 탭 5개 확인

## [C] 문서 정리 — Claude

- [ ] C1. `CLAUDE.md` 실행 명령어 표에 새 bat 2개 추가, `docs/작업현황-대시보드-생성-KNOWLEDGE.md` 아키텍처·배포 절차 갱신
- [ ] C2. "수정본 배포 방법"을 KNOWLEDGE에 정리(서버 쪽: 파일 복사+API 재시작 / 화면 쪽: 파일 복사+업데이트 bat)
- [ ] C3. `docs/CHANGELOG.md` 기록 + 커밋

## 이번 범위에서 제외 (필요해지면 별도)
- PC 재부팅 시 자동 실행(작업 스케줄러) — 지금 API 서버 실행 방식(수동 bat)에 맞춰 일단 수동 실행
- 외부/재택 접속(https·Cloudflare Tunnel·도메인) — `plan_Vercel배포.md` 보류 상태 유지

## 확인 필요
- 사무실 PC 인터넷 연결 가능 여부(Node.js 설치 파일 다운로드·패키지 설치에 필요 — 불가하면 로컬 PC에서 받아 USB로 옮기는 방식으로 변경)
