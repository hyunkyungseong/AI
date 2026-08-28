# 재료비(용지·봉투·삽지) "무상(고객사 제공)" 체크박스 — 단가미등록 오탐 방지

> 상태: ✅ 완료(2026-08-29) — 로컬 PC 구현·검증 + 사무실 PC 배포까지 완료

## Context
2026-08-22 "단가미등록 감지" 기능이, 고객사가 자재를 직접 제공해 원래부터 무상인 항목(의뢰서
97531, 삼성화재해상보험(주)·모니터링안내장 봉입자재비)을 "단가 등록을 깜빡한 실수"로 오판해
경고를 띄우는 문제 발견. DB 컬럼(용지제작단가/봉투제작단가/삽지제작단가, DECIMAL DEFAULT 0)은
"아직 안 정한 0"과 "의도적으로 무상인 0"을 구분 못 하는 게 근본 원인.

단가마스터에 `용지제작무상`·`봉투제작무상`·`삽지제작무상`(TINYINT(1) DEFAULT 0, 대부분 유상이라
기본 미체크) 3개 컬럼 신규 — 체크된 항목만 단가미등록 감지에서 제외.

추가 요구사항(사용자): 기본단가가 무상이면 그 재료의 개별 자재단가(PricingMaterialSection)
등록도 양방향으로 막는다 — 무상 체크 시 해당 코드가 자재단가 "항목" 선택지에서 빠지고, 이미
자재단가가 등록된 코드는 무상 체크박스 자체가 비활성화.

## 구현 파일
- [x] `scripts/init_db_mariadb.py`: CREATE TABLE + 마이그레이션 블록에 컬럼 3개 추가
- [x] `scripts/billing.py`: `build_단가맵()`에 3개 필드 반영, `_자재별_처리()`에 `무상=False` 인자,
      `_작업별_품목누적()`의 관련 3개 호출에 전달
- [x] `scripts/api.py`: `단가마스터_신규`·`단가마스터_수정` Pydantic 모델 + INSERT/UPDATE SQL
- [x] `frontend/components/Dashboard.tsx`: `단가행` 타입
- [x] `frontend/lib/serverMappers.ts`: `mapPricingRow()`
- [x] `frontend/components/PricingFormDialog.tsx`: 체크박스 3개(정방향/역방향 차단 포함)
- [x] `frontend/components/PricingMaterialSection.tsx`: `무상차단코드` prop으로 "항목" 옵션 필터링

## 검증 (완료)
- `python -m py_compile scripts/api.py scripts/billing.py` 통과
- 로컬 MariaDB로 마이그레이션 실행 후 의뢰서 97531 재현 테스트(무상=1 세팅 → 단가미등록 목록에서
  빠짐 확인 → 원상복구) 완료
- `npx tsc --noEmit` · `npx eslint .` · `npm run build` 통과
- 사용자가 사무실 PC 브라우저에서 직접 확인 완료

## 배포 (완료)
`scripts/api.py`·`scripts/billing.py`·`scripts/init_db_mariadb.py` 사무실 PC 배포 + 마이그레이션 +
API 서버 재시작까지 사용자가 직접 완료(2026-08-29, 체크리스트:
`.claude/plans/plan_2026-08-29_사무실PC배포체크리스트.md`).
