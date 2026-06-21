# 작업현황 대시보드 생성 — 검증된 스킬 목록 (SKILL)

> 구현 시 이 파일의 스킬을 재사용하세요.
> 각 스킬은 실제 실행·검증이 완료된 절차입니다.
> 새 스킬이 확립되면 이 파일에 추가하세요.

---

## 📋 스킬 인덱스

| 스킬 | 목적 | 검증 상태 |
|---|---|---|
| SKILL-01 | Streamlit 서브탭 자동 이동 | ✅ 2026-06-02 |
| SKILL-02 | 업무의뢰서번호 타입 통일 (float → int) | ✅ 2026-06-02 |
| SKILL-03 | st.cache_data 파일 변경 감지 | ✅ 2026-05-29 |
| SKILL-04 | st.data_editor 선택 상태 유지 | ✅ 2026-06-02 |
| SKILL-05 | MariaDB 연결 패턴 (pymysql) | ⏳ 미검증 초안 |
| SKILL-06 | 비개발자용 화면 검증 체크리스트 | ✅ 표준 템플릿 |
| SKILL-07 | Excel COM 거래명세서 자동 생성 | ✅ 2026-06-21 |

---

## SKILL-01. Streamlit 서브탭 자동 이동

**목적:** 버튼 클릭 후 특정 서브탭으로 자동 이동 (JS + session_state 카운터)

**검증 상태:** ✅ 완료 (2026-06-02)

**핵심 로직:**
```python
# 버튼 핸들러에서
st.session_state["t4_탭이동"] = 2   # 2회 rerun 동안 탭 이동 유지
st.rerun()

# with tab4: 블록 상단에서
if st.session_state.get("t4_탭이동", 0) > 0:
    st.session_state["t4_탭이동"] -= 1
    components.html("""
    <script>
    setTimeout(function() {
        const tabs = window.parent.document.querySelectorAll('[data-baseweb="tab"]');
        for (const tab of tabs) {
            if (tab.textContent.trim() === '이동할탭명') { tab.click(); break; }
        }
    }, 200);
    </script>
    """, height=0)
```

**주의사항:**
- JS 클릭은 시각적 DOM만 변경 → Streamlit 내부 탭 상태 미반영
- 카운터를 2 이상으로 설정해야 첫 번째 rerun 이후에도 탭이 유지됨
- `setTimeout` 딜레이는 200ms 이상 필요 (렌더링 완료 대기)

---

## SKILL-02. 업무의뢰서번호 타입 통일

**목적:** DB(문자열) ↔ pkl(float) 비교 시 타입 불일치로 필터링 실패하는 버그 방지

**검증 상태:** ✅ 완료 (2026-06-02)

**핵심 로직:**
```python
# DB에서 로드한 번호(문자열 "12345")를 int로 변환
발행요청_번호 = set()
for n in json.loads(row["업무의뢰서번호목록"]):
    발행요청_번호.add(int(float(n)))   # "12345" → 12345

# pkl의 float 컬럼도 int로 변환 후 비교
미발송 = summary[~summary["업무의뢰서번호"].apply(
    lambda x: int(float(x)) if pd.notna(x) else -1
).isin(발행요청_번호)]
```

**주의사항:**
- `int("12345.0")` 은 오류 → 반드시 `int(float(n))` 순서로 변환
- pkl의 업무의뢰서번호는 Excel 원본 기준 float64 타입

---

## SKILL-03. st.cache_data 파일 변경 감지

**목적:** pkl 파일이 교체됐을 때 캐시를 자동 무효화하여 최신 데이터 로드

**검증 상태:** ✅ 완료 (2026-05-29)

**핵심 로직:**
```python
@st.cache_data
def load_data(_mtime=None):          # _mtime이 캐시 키로 사용됨
    return pd.read_pickle(PKL_PATH)

# 모듈 레벨 — rerun 시마다 재평가됨
_pkl_mtime = PKL_PATH.stat().st_mtime if PKL_PATH.exists() else 0
df_all = load_data(_mtime=_pkl_mtime)  # mtime 변경 시 캐시 무효화
```

**주의사항:**
- `_mtime` 파라미터는 `_` 접두사 필요 (st.cache_data는 `_` 로 시작하는 인자를 해시하지 않음 → 직접 캐시 키로 활용)
- pkl 교체 후 브라우저 F5로 rerun 해야 새 mtime 반영

---

## SKILL-04. st.data_editor 선택 상태 유지

**목적:** 전체선택/취소 체크박스 변경 시 data_editor 선택 상태 초기화

**검증 상태:** ✅ 완료 (2026-06-02)

**핵심 로직:**
```python
# session_state 초기화
if "t4_전체선택" not in st.session_state:
    st.session_state.t4_전체선택 = False
if "t4_선택버전" not in st.session_state:
    st.session_state.t4_선택버전 = 0

# 전체선택 체크박스
새_전체선택 = st.checkbox("선택 (전체)", value=st.session_state.t4_전체선택)
if 새_전체선택 != st.session_state.t4_전체선택:
    st.session_state.t4_전체선택 = 새_전체선택
    st.session_state.t4_선택버전 += 1   # key 변경 → data_editor 리셋
    st.rerun()

# data_editor에 버전 key 적용
결과 = st.data_editor(
    display_df,
    key=f"목록_{st.session_state.t4_선택버전}",  # 버전 변경 시 위젯 재생성
)
```

**주의사항:**
- key가 바뀌면 data_editor 내부 편집 이력도 초기화됨 (의도된 동작)
- 전체선택 상태는 display_df 생성 시 `"선택": st.session_state.t4_전체선택` 으로 주입

---

## SKILL-05. MariaDB 연결 패턴 (pymysql)

**목적:** SQLite → MariaDB 전환 시 재사용할 연결 패턴

**검증 상태:** ⏳ 미검증 초안 (1단계 구현 후 ✅ 갱신 예정)

**구조:** 접속 정보를 `scripts/db_config.py`에 분리 → git 제외(.gitignore)

**① scripts/db_config.py (신규 생성 — git 제외)**
```python
# 이 파일은 .gitignore에 추가해 외부 유출 방지
DB_HOST     = "서버IP또는도메인"   # 예: "192.168.0.10"
DB_PORT     = 3306
DB_USER     = "dashboard_user"
DB_PASSWORD = "비밀번호"
DB_NAME     = "dashboard"
```

**② 연결 헬퍼 (app.py / preprocess.py 상단에 추가)**
```python
import pymysql
from contextlib import contextmanager
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg

@contextmanager
def get_db():
    conn = pymysql.connect(
        host=cfg.DB_HOST,
        port=cfg.DB_PORT,
        user=cfg.DB_USER,
        password=cfg.DB_PASSWORD,
        database=cfg.DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

**③ 사용 예시**
```python
# SELECT
with get_db() as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM 거래처마스터")
        rows = cur.fetchall()   # [{"거래처명": "...", ...}, ...]

# INSERT
with get_db() as conn:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO 거래명세서이력 (업무의뢰서번호, 거래처명) VALUES (%s, %s)",
            (번호, 거래처명)
        )
```

**SQLite → MariaDB 주요 문법 차이**
| 항목 | SQLite | MariaDB |
|---|---|---|
| 플레이스홀더 | `?` | `%s` |
| 자동증가 | `INTEGER PRIMARY KEY` | `INT AUTO_INCREMENT PRIMARY KEY` |
| 현재시각 | `datetime('now','localtime')` | `NOW()` |
| 테이블 존재확인 | `IF NOT EXISTS` | `IF NOT EXISTS` (동일) |

**주의사항:**
- `db_config.py`는 반드시 `.gitignore`에 추가 (`scripts/db_config.py`)
- `autocommit=False` 유지 → `get_db()` 컨텍스트 종료 시 자동 commit/rollback
- 연결 실패 시 `pymysql.err.OperationalError` 발생 → 서버 IP·방화벽 확인
- MariaDB는 MySQL과 호환 → pymysql 드라이버 그대로 사용 가능

---

## SKILL-06. 비개발자용 화면 검증 체크리스트 템플릿

**목적:** 코딩 완료 후 관리자가 눈으로 직접 확인할 수 있는 3단계 화면 테스트 표준 형식

**검증 상태:** ✅ 표준 템플릿 (모든 기능에 적용)

**템플릿 형식 (코딩 완료 시 매번 이 형식으로 제공):**
```
✅ 화면 테스트 체크리스트 — [기능명]

1. [첫 번째 동작]
   → 예상 결과: [무엇이 보여야 하는지 구체적으로]

2. [두 번째 동작]
   → 예상 결과: [무엇이 보여야 하는지 구체적으로]

3. [세 번째 동작]
   → 예상 결과: [무엇이 보여야 하는지 구체적으로]

❌ 오류 시: [해결 방법 또는 Claude에게 전달할 내용]
```

**작성 예시 (탭4 거래명세서 요청 기능):**
```
✅ 화면 테스트 체크리스트 — 거래명세서 요청

1. 대시보드_실행.bat 실행 → [탭4 거래명세서 관리] 클릭
   → 예상 결과: 미발행 목록 표가 보여야 함 (항목이 없으면 "미발행 없음" 표시)

2. 항목 1개 왼쪽 체크박스 선택 → [거래명세서 요청] 버튼 클릭
   → 예상 결과: "발행요청 완료" 초록색 메시지가 뜨고,
                해당 항목이 미발행 목록에서 사라져야 함

3. [발행요청목록] 탭 클릭
   → 예상 결과: 방금 요청한 항목이 목록에 추가되어 있어야 함

❌ 오류 시: 빨간색 오류 메시지를 캡처하거나 내용을 그대로 복사해서 알려주세요.
```

**주의사항:**
- 동작은 "클릭", "입력", "선택" 등 마우스·키보드 행동 단위로 작성
- 예상 결과는 색상·위치·문구까지 구체적으로 명시 (애매한 표현 금지)
- 오류 시 대응도 반드시 포함 (비개발자가 혼자 판단할 수 없는 상황 대비)

---

## SKILL-07. Excel COM 거래명세서 자동 생성

**목적:** 원본 xlsx 파일을 훼손 없이 복사하고 가변 데이터만 채워 새 파일로 저장

**검증 상태:** ✅ 완료 (2026-06-21)

**왜 COM 방식인가:**
- `zipfile + regex` XML 직접 수정: 빠르나 Excel "셀 정보" 복구 오류 지속 발생 (근본 원인 미해결)
- `openpyxl`: drawing, 명명된 범위 손실
- **Excel COM**: 느리지만(~10초) 원본 구조 100% 유지, 오류 없음 → 채택

**의존 패키지:**
```
pip install pywin32 num2words
```

**핵심 로직:**
```python
import win32com.client as win32
import os, tempfile
from num2words import num2words

src_path = os.path.abspath("data/20260507_KB국민카드(이용대금명세서)_발행요청.xlsx")
tmp_path = os.path.join(tempfile.gettempdir(), "거래명세서_tmp.xlsx")

excel = win32.Dispatch("Excel.Application")
excel.Visible = False
excel.DisplayAlerts = False
try:
    wb = excel.Workbooks.Open(src_path, ReadOnly=False)
    ws = wb.Worksheets(2)   # 두 번째 시트 = 거래명세서 양식

    # 헤더
    ws.Range("B10").Value = 발행일.strftime("%Y-%m-%d")   # 날짜
    ws.Range("B11").Value = 거래처명
    ws.Range("B12").Value = 업무명
    ws.Range("K14").Value = round(총합계)
    ws.Range("D14").Value = f"금 {num2words(round(총합계), lang='ko')}"  # 원정은 템플릿에 기존 표기

    # 데이터 행 초기화 (16~25행)
    for r in range(16, 26):
        for col in ["A", "B", "D", "I", "J", "K"]:
            ws.Range(f"{col}{r}").Value = None

    # 데이터 쓰기 (품목 순서: 출력비→봉입비→출력자재비→봉입자재비→추가봉입비→삽지비)
    첫행 = True
    for i, ((품목, 작업명_key, 단가), v) in enumerate(정렬행):
        if i >= 10: break
        r = 16 + i
        ws.Range(f"A{r}").Value = 코드맵.get(품목, "M")   # P/M/F/E
        if 첫행:
            ws.Range(f"B{r}").Value = f"{발행일.month:02d}월{발행일.day:02d}일"
        품명표시 = f"{품목}({작업명_key})" if 작업명_key else 품목
        ws.Range(f"D{r}").Value = 품명표시
        ws.Range(f"I{r}").Value = int(v["수량"])
        ws.Range(f"J{r}").Value = 단가
        ws.Range(f"K{r}").Value = round(v["금액"])
        첫행 = False

    ws.Range("J31").Value = round(총합계)

    # 품명 셀 ShrinkToFit — 범위 지정 시 병합 버그 발생 → 행별 개별 적용 필수
    for _r in range(16, 26):
        ws.Range(f"D{_r}").ShrinkToFit = True

    wb.SaveAs(tmp_path, 51)   # 51 = xlOpenXMLWorkbook (.xlsx)
    wb.Close(False)
finally:
    excel.Quit()

with open(tmp_path, "rb") as f:
    excel_bytes = f.read()   # Streamlit download_button에 전달
```

**Streamlit 다운로드 버튼 캐시 방지:**
```python
# 발행 시마다 key 변경 → 이전 파일 캐시 방지
st.session_state["t4c_dl_version"] = st.session_state.get("t4c_dl_version", 0) + 1

dl_key = f"t4c_dl_{st.session_state.get('t4c_dl_version', 0)}"
st.download_button(label="📥 거래명세서 다운로드", data=excel_bytes,
                   file_name=f"{발행시각}_{거래처명}_{업무명}.xlsx",
                   mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                   key=dl_key)
```

**주의사항:**
- `excel.Quit()` 를 `finally`에 넣어야 예외 발생 시에도 Excel 프로세스가 남지 않음
- `SaveAs` 두 번째 인자 `51` = `xlOpenXMLWorkbook` (.xlsx 포맷)
- COM 방식은 Excel 시작 시간으로 인해 ~10초 소요 — 정상 동작임
- `ShrinkToFit = True`를 범위(`D16:D25`)로 적용하면 셀 병합 발생 → 반드시 행별 개별 적용

---

*생성일: 2026. 5. 26. | 새 스킬 확립 시 이 파일에 추가*
