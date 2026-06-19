---
status: ✅ 완료
completed: 2026-06-13
---

# Phase 1 — 핵심 게임플레이 강화

## 구현 항목

### 1. 줄 제거 이펙트 ✅
- 200ms 흰색 플래시 애니메이션 (`clearAnimating`, `clearingLines`)
- 점수 팝업 텍스트 (Canvas `fillText`, 위로 떠오름)
- 4줄(테트리스) 시 화면 흔들림 (`canvas.style.transform`)

### 2. 콤보 시스템 ✅
- `combo` 카운터, 연속 클리어 시 `50 × combo × level` 보너스
- "COMBO ×N" 팝업, 콤보 수에 따라 색상 변화 (cyan→yellow→red)

### 3. 사운드 (Web Audio API) ✅
- `SoundManager` IIFE — 외부 파일 없이 순수 JS 효과음
- move / rotate / hold / drop / clear1~4 / tspin / levelup / gameover
- Korobeiniki (테트리스 테마) BGM 루프

### 4. SRS 킥 테이블 + T-스핀 ✅
- `KICK_JLSTZ` / `KICK_I` 완전 SRS 구현
- `piece.rotation` 상태(0~3) 추적
- T 피스 4 모서리 3개 이상 → T-스핀 판정, `TSPIN_TABLE` 점수 보너스

## 수정된 파일
- `tetris.js` — 전체 재작성

## 검증
- 콘솔 에러 없음 확인 ✅
- 게임 시작 후 피스 낙하 정상 확인 ✅
- BGM 재생 (게임 시작 시 자동) ✅
