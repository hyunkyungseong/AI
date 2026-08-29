# "요청내용"(표지) 시트 실데이터 채우기

> 상태: ✅ 완료(2026-08-30) — 로컬 PC 구현·검증 + 사무실 PC 배포·검증까지 전부 완료
> (배포 체크리스트: `.claude/plans/plan_2026-08-29_사무실PC배포체크리스트_요청내용표지.md`)

## Context
`data/거래명세서_템플릿_base.xlsx`의 첫 번째 시트("요청내용")는 신용카드 이용대금명세서 템플릿의 잔재로, 다른 시트의 빈 셀을 참조하는 죽은 수식이라 항상 빈칸으로 보인다. 이번 작업으로 실제 발행된 거래명세서 값(사업자등록증·법인명·발행일자·품목·공급가액·세액·합계·담당자이메일·비고·거래명세서번호)으로 채우고, 여러 "조"가 합쳐지는 다중시트 케이스에도 표지를 포함시킨다. 상세 설계: `C:\Users\hyunkyung\.claude\plans\data-base-xlsx-stateful-bunny.md`(승인된 플랜 원본).

## 체크리스트

- [x] `scripts/billing.py`: `_esc`/`_set_num`/`_set_str` 모듈 레벨 승격
- [x] `scripts/billing.py`: 신규 함수 `_요청내용_채우기(file_map, 표지정보)` 추가
- [x] `scripts/billing.py`: `_rename_single_sheet()` → `(file_map, 안전이름)` 반환하도록 변경
- [x] `scripts/billing.py`: `combine_거래명세서_시트들(시트_목록, 표지정보=None)` 수정 (len<=1 분기, len>1 분기 — localSheetId 오프셋 포함)
- [x] `scripts/api.py`: `_거래명세서_엑셀_시트목록()` — 사업자등록번호 조회 + 표지정보 조립 + return 시그니처 변경
- [x] `scripts/api.py`: `GET /거래명세서엑셀/{no}` 호출부 갱신
- [x] `python -m py_compile scripts/billing.py scripts/api.py` — 통과
- [x] 로컬 MariaDB 종단 테스트 — 케이스 A(실데이터 D-202608-00088, 단일 시트) 통과
- [x] 합성 데이터 종단 테스트 — 케이스 B(다중 조 3개+통합시트, 로컬 DB에 실제 다중시트 사례가 없어 합성 데이터로 검증) 통과
- [x] 인쇄영역(Print_Area) localSheetId 회귀 스캔 — 케이스 B·레거시 다중시트 모두 전부 일치 확인
- [x] 레거시 묶음번호 경로(표지정보=None) 회귀 없음 확인 — 다중/단일 시트 양쪽 시뮬레이션으로 표지 동작 기존과 동일함 확인
- [x] 전체 zip 파트 well-formed XML 검증(minidom) — 문제 0건
- [x] `docs/CHANGELOG.md` 항목 작성
- [x] 사무실 PC 배포 체크리스트 작성 및 실제 배포(`scripts/api.py`·`scripts/billing.py` 복사 + API 재시작, DB 마이그레이션 불필요) — 사용자가 직접 배포·화면 확인까지 완료(2026-08-30)
- [x] "담당자이메일" 필드 수정 — 내부 계정 담당자 이메일이 아니라 거래처마스터.수신이메일을 쓰도록 수정(2026-08-29, 사용자가 실사용 화면에서 발견·확인)
- [x] 부수 발견 버그 수정 — 미리보기 화면 경고 배너가 많을 때 확정·취소 버튼에 접근 못 하던 문제(`InvoicePreviewDialog.tsx`, 프론트엔드 전용)
- [x] `data/거래명세서_템플릿_base.xlsx` 사무실 PC 반영 — 사용자가 로컬에서 정리한 파일을 사무실 PC 같은 경로로 직접 복사

## 사용자 직접 수행 항목 (Claude는 손대지 않음 — data 폴더 원본 수정 금지 원칙)
- [x] `data/거래명세서_템플릿_base.xlsx` `sheet1`("요청내용") C2~C10을 빈 칸으로 정리 — 로컬·사무실 PC 모두 완료
- [x] 같은 파일 `sheet2`(거래명세서 본문) B31을 빈 칸으로 정리(담당자 미등록 시 "노재민팀장" 기본 표시 제거) — 로컬·사무실 PC 모두 완료
