---
status: ⏳ 대기
depends_on: 001_phase1.md
---

# Phase 2 — UX & 게임 모드

## 구현 항목

### 1. 게임 모드 선택
- **마라톤** — 무한 (현재와 동일)
- **스프린트** — 40줄 달성 시간 측정, 완료 시 타이머 정지 + 결과 표시
- **울트라** — 2분 제한, 제한 시간 내 최고 점수

구현 위치:
- `index.html` — 시작 오버레이에 모드 선택 탭/버튼 추가
- `style.css` — 모드 버튼 스타일
- `tetris.js` — `gameMode`, `modeTimer`, `targetLines` 상태 변수 추가
  - `loop()` 에서 울트라 카운트다운 처리
  - `clearLines()` 에서 스프린트 목표 달성 감지

### 2. 게임 종료 통계
오버레이 하단에 통계 표시:
- 플레이 시간 (mm:ss)
- 분당 줄 수 (LPM = lines / minutes)
- 최대 콤보
- T-스핀 횟수

구현 위치:
- `tetris.js` — `stats` 객체 (`{ startTime, maxCombo, tspinCount }`)
  - `finishClear()` 에서 maxCombo, tspinCount 갱신
  - `endGame()` 에서 LPM 계산 후 오버레이에 주입
- `index.html` — 오버레이에 `<div id="stats-panel">` 추가

### 3. 모바일 반응형 + 터치 제어
- CSS `clamp()` 로 보드·패널 크기 뷰포트 기준 자동 조정
- 온스크린 버튼 (← → ↑ ↓ DROP) HTML 추가 (모바일에서만 표시)
- 터치 제스처:
  - 좌우 스와이프 → 이동
  - 아래 스와이프 → 소프트드롭
  - 탭 → 회전
  - 롱프레스 → 홀드

## 수정 대상 파일
- `tetris.js` — 모드 로직, 통계, 터치 이벤트
- `index.html` — 모드 선택 UI, 온스크린 버튼, stats-panel
- `style.css` — 반응형 레이아웃 (`@media`, `clamp()`)

## 검증 방법
- 스프린트: 40줄 달성 → 타이머 멈춤 + "클리어!" 화면
- 울트라: 2분 후 자동 종료 + 점수 표시
- 통계: 게임오버 후 LPM·최대콤보·T-스핀 수치 확인
- 모바일: DevTools 320px 뷰포트에서 레이아웃 깨짐 없음
- 터치: 스와이프/탭 동작 확인
