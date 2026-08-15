# 품목 수정 시 총액 변동 감사이력 기록 + "편집됨" 배지 증감 색상 + 총액 차이 표시

> 상태: ✅ 구현·검증·사무실 PC 배포 전부 완료(2026-08-14).
> 상세: `docs/CHANGELOG.md` 2026-08-14 항목("품목 수정으로 자동 변동된 총액도 감사이력에 기록...")
> 참고. 원본 계획서(대화 중 EnterPlanMode/ExitPlanMode로 승인)는
> `C:\Users\hyunkyung\.claude\plans\twinkly-foraging-gosling.md`에 있음 — 이 파일은 프로젝트
> 관례(`.claude/plans/plan_기능명.md`)에 맞춘 요약 포인터.

## 요청 배경
공급가액·부가세를 화면에서 직접 입력(override)했을 때만 감사이력이 남던 것을, 오른쪽 표에서
품목 수량·단가·금액을 고쳐 총액이 자동으로 바뀌는 경우까지 확장 요청(사용자 3건 요청):
1. 공급가액·부가세·합계 수동 수정 → 이력에 남음(기존, 재확인)
2. 품목 수정으로 자동 변동된 공급가액·부가세·합계도 이력에 남기기 (신규)
3. "편집됨" 배지 색상을 합계 증가=빨강/감소=파랑으로 구분 + 수정이력에 합계 차이 표기

## 구현 요약
- `scripts/api.py` `거래명세서요청()`: 총액 변경 감지 기준을 "기준목록(조건식 적용 후, 사람이
  손대기 전) 대비 실제 저장값"으로 통일(override 여부와 무관) — 공급가액·세액 로그 + 신규
  "합계" 필드명 로그 추가(DB 스키마 변경 없음, 기존 컬럼 재사용). 응답에 부호 있는 `합계증감`
  필드 신규.
- `발행목록()`: `거래명세서_수정이력`(필드명='합계')에서 합계증감을 계산해 각 행에 포함.
- 프론트: `InvoiceIssuedLevel1Table.tsx`(배지 색상 분기), `lib/auditLog.ts`(`차이표시()`·
  `차이색상()` 신규, 공급가액·세액·합계 3종에만 적용), `InvoiceHistoryDialog.tsx`·
  `Tab4EditHistory.tsx`(차이 표기 적용), `합계증감` 필드를 `Dashboard.tsx`·`app/page.tsx`·
  `Tab4Invoice.tsx`·`lib/issuedGrouping.ts`에 전파.

## 검증
`python -m py_compile`·`npx tsc --noEmit`·`npx eslint .`·`npm run build` 전부 통과. 로컬
MariaDB 종단 테스트 4개 시나리오(품목 증가→합계증감 양수+3종 로그, 품목 감소→음수, override만
사용해도 회귀 없음, `GET /발행목록` 값이 확정 응답과 일치) 전부 통과 후 테스트 데이터 정리 확인.

## 남은 일
없음 — `scripts/api.py`·`scripts/init_db_mariadb.py` 사무실 PC 배포 및 마이그레이션까지
2026-08-14에 사용자가 직접 완료(8/13 override+감사이력 기능과 함께 일괄 배포).