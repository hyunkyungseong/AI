# 근무표 OFF 배치 프로그램 — 구현 계획

> 매 세션 시작 시 이 파일을 읽고 현재 진행 상태를 파악합니다.
> 작업 완료 시 아래 진행 현황을 업데이트하세요.

---

## Context (배경)

전임 영양사 퇴사로 인수인계 없이 시간제 직원 근무표 생성 업무를 맡게 됨.
기존 엑셀 분석 결과, 주간조 6명 + 야간조 6명의 월별 OFF 배치가 핵심이며
규칙 기반 자동 배치 + 담당자 직접 입력(직원 신청 취합 후) 방식으로 프로그램 개발.

---

## 진행 현황

| 단계 | 항목 | 상태 |
|---|---|---|
| 0 | 엑셀 파일 분석 및 보고서 | ✅ 완료 |
| 1 | 전임자/팀장 확인 체크리스트 작성 | ✅ 완료 |
| 2 | 직원 명단 파일 생성 | ✅ 완료 |
| 3 | SQLite DB 초기화 스크립트 | ✅ 완료 |
| - | **전임자/팀장 확인 대기 중** | ⏸ 대기 |
| 4 | 자동 배치 알고리즘 (scheduler.py) | ⏳ 확인 후 진행 |
| 5 | Streamlit OFF 배치 UI | ⏳ 확인 후 진행 |
| 6 | app.py 네비게이션 연결 | ⏳ 확인 후 진행 |

---

## 직원 구성 (엑셀 분석 결과)

### 주간조
- 조리사(반장): 서기복
- 시간제: 신을순, 김지희, 문차경, 정미애, 한규진, 임미애

### 야간조
- 조리사(반장): 강도윤
- 시간제: 김성숙, 김시옥, 강선희, 유혜경, 동석미, 장진영

---

## 운영 규칙 (확인 필요 항목 포함)

| 규칙 | 내용 | 확인 여부 |
|---|---|---|
| 최소 인원 | 평일 5명, 일요일 4명 | ❓ 확인 필요 |
| 동시 OFF 제한 | 동일 조 동시 OFF 최대 인원 | ❓ 확인 필요 |
| 월 OFF 횟수 | 주 1회 (달력 주 수 기준 추정) | ❓ 확인 필요 |
| 파출 투입 | 최소 인원 미달 시 자동 투입 | ✅ 엑셀 확인 |
| 조리사 스케줄 | 별도 관리 여부 | ❓ 확인 필요 |

> 확인 항목은 `docs/확인_체크리스트.md` 참조

---

## 파일 구조

```
scripts/
  app.py                  ← 메인 진입점
  scheduler.py            ← 자동 배치 알고리즘
  db_init.py              ← DB 초기화 스크립트
  pages/
    01_off_배치.py        ← OFF 배치 Streamlit 페이지
data/
  employees.json          ← 직원 명단
  schedule.db             ← SQLite DB (off_requests, employees, schedule_rules)
docs/
  PLAN.md                 ← 이 파일
  KNOWLEDGE.md            ← 프로젝트 지식
  확인_체크리스트.md       ← 전임자/팀장 확인 항목
```

---

## 자동 배치 알고리즘 (scheduler.py)

```
입력: 직원 목록, 해당 월 달력, 직원별 OFF 신청일, 규칙 설정값
출력: 직원별 OFF 날짜 목록, 파출 필요일 목록

규칙 적용 순서:
1. 직원별 신청 OFF 우선 반영
2. 잔여 OFF 횟수 계산 (월 기준 주 수만큼)
3. 잔여 OFF를 신청 없는 날 중 분산 배치
4. 동시 OFF 제한 초과 시 날짜 조정
5. 최소 인원 미달 날짜 → 파출 표시
```

---

## DB 스키마

```sql
employees   (id, name, shift, active)
off_requests(id, employee_id, year, month, day, type)
  -- type: 'requested' | 'confirmed' | 'auto'
schedule_rules(key, value)
  -- max_simultaneous_off, min_weekday, min_sunday
```

---

## 실행 명령어

```bash
# 앱 실행
streamlit run scripts/app.py

# DB 초기화 (최초 1회)
python scripts/db_init.py

# 문법 검사
python -m py_compile scripts/scheduler.py
```

---

## 다음 작업

1. `docs/확인_체크리스트.md` 를 전임자 또는 팀장에게 전달하여 답변 수집
2. 답변 내용을 체크리스트 파일에 기록
3. 확인 완료 후 Claude에게 알리면 알고리즘(scheduler.py) 개발 재개
