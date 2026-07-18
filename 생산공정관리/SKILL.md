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
| SKILL-07 | Excel 거래명세서 자동 생성 (zipfile+regex) | ✅ 2026-06-22 |
| SKILL-08 | st.form Enter 키 포커스 관리 + 클릭 시 전체 선택 | ✅ 2026-06-23 |
| SKILL-09 | 탭 간 변수명 충돌 방지 (전역 변수 공유 주의) | ✅ 2026-07-17 |
| SKILL-10 | key_prefix 파라미터로 탭 렌더링 함수 재사용 | ✅ 2026-07-17 |
| SKILL-11 | Excel 행 복제 시 "정상" 원본 행 검증 (스타일 균일성) | ✅ 2026-07-17 |

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

## SKILL-07. Excel 거래명세서 자동 생성 (zipfile+regex 방식)

**목적:** 원본 xlsx 파일을 훼손 없이 복사하고 가변 데이터만 채워 새 파일로 저장

**검증 상태:** ✅ 완료 (2026-06-21 zipfile 방식으로 교체)

**방식 선택 이력:**
- `openpyxl`: drawing, 명명된 범위 손실
- `Excel COM`: 오류 없으나 Excel 설치 필요, ~10초 소요
- **zipfile + regex**: Excel 불필요, 1~2초, 오류 없음 → 최종 채택
  - 핵심: sharedStrings.xml 수정 없이 inlineStr 방식으로 텍스트 주입

**의존 패키지:**
```
pip install num2words
```

**템플릿 준비 (1회만):**
- `data/거래명세서_템플릿_base.xlsx`: 가변 셀 초기화 + D16:D25 ShrinkToFit 적용된 클린 템플릿
- 가변 셀: B10(날짜)·B11(거래처명)·B12(업무명)·D14(금액한글)·K14·K30·J31(총합계)·A/B/D/I/J/K 16~25행

**핵심 로직:**
```python
import zipfile, re, os, tempfile
from num2words import num2words

def _esc(text):
    return str(text).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def _set_num(xml, ref, value):
    s_m = re.search(rf'<c r="{ref}"([^>]*?)/?>', xml)
    s_attr = re.search(r's="(\d+)"', s_m.group(1)).group(0) if s_m else ''
    new = f'<c r="{ref}" {s_attr}><v>{value}</v></c>'
    return re.sub(rf'<c r="{ref}"[^>]*?(?:/>|>.*?</c>)', new, xml, count=1, flags=re.DOTALL)

def _set_str(xml, ref, text):
    s_m = re.search(rf'<c r="{ref}"([^>]*?)/?>', xml)
    s_attr = re.search(r's="(\d+)"', s_m.group(1)).group(0) if s_m else ''
    new = f'<c r="{ref}" {s_attr} t="inlineStr"><is><t>{_esc(text)}</t></is></c>'
    return re.sub(rf'<c r="{ref}"[^>]*?(?:/>|>.*?</c>)', new, xml, count=1, flags=re.DOTALL)

# 템플릿 읽기
with zipfile.ZipFile(src_path, 'r') as zin:
    file_map = {name: zin.read(name) for name in zin.namelist()}

xml = file_map["xl/worksheets/sheet2.xml"].decode("utf-8")

# 헤더 셀 주입
xml = _set_str(xml, "B10", 발행일.strftime("%Y-%m-%d"))
xml = _set_str(xml, "B11", 거래처명)
xml = _set_str(xml, "B12", 업무명)
xml = _set_str(xml, "D14", f"금 {num2words(round(총합계), lang='ko')}")
xml = _set_num(xml, "K14", round(총합계))
xml = _set_num(xml, "K30", round(총합계))
xml = _set_num(xml, "J31", round(총합계))

# 품목 행 주입 (16~25행)
첫행 = True
for i, ((품목, 작업명_key, 단가), v) in enumerate(정렬행):
    if i >= 10: break
    r = 16 + i
    xml = _set_str(xml, f"A{r}", 코드맵.get(품목, "M"))
    if 첫행:
        xml = _set_str(xml, f"B{r}", 구분날짜)
        첫행 = False
    xml = _set_str(xml, f"D{r}", f"{품목}({작업명_key})" if 작업명_key else 품목)
    xml = _set_num(xml, f"I{r}", int(v["수량"]))
    xml = _set_num(xml, f"J{r}", 단가)
    xml = _set_num(xml, f"K{r}", round(v["금액"]))

file_map["xl/worksheets/sheet2.xml"] = xml.encode("utf-8")

tmp_path = os.path.join(tempfile.gettempdir(), "거래명세서_tmp.xlsx")
with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name, data in file_map.items():
        zout.writestr(name, data)

with open(tmp_path, "rb") as f:
    excel_bytes = f.read()
```

**주의사항:**
- sharedStrings.xml 수정 금지 → inlineStr(`t="inlineStr"`) 방식으로 텍스트 주입
- 템플릿의 calcChain.xml 제거 필수 (없으면 Excel이 재계산 — 문제 없음)
- ShrinkToFit은 템플릿 styles.xml에 이미 포함 — 코드로 추가 불필요
- `_set_str` / `_set_num` 헬퍼는 셀의 s(style) 속성을 보존하므로 서식 유지

---

## SKILL-08. st.form Enter 키 포커스 관리 + 클릭 시 전체 선택

**목적:** `st.form` 안 입력 필드에서 ① Enter → 다음 필드 자동 이동, ② 클릭 시 기존 값 전체 선택

**검증 상태:** ✅ 완료 (2026-06-23)

**핵심 로직:**

**① st.form 파라미터 (Python)**
```python
with st.form("폼키", enter_to_submit=False):  # Enter로 폼 제출 방지 (Streamlit 1.37.0+)
    st.number_input(...)
    st.form_submit_button("저장")
```

**② JS: Enter→다음필드 + 클릭 시 전체선택**
```python
import streamlit.components.v1 as components

components.html("""<script>
(function(){
    try {
        var win = window.parent;
        var doc = win.document;

        function handleEnterKey(e){
            if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
            if (e.target.closest('[role="gridcell"]')) return;
            var container = e.target.closest('[data-testid="stForm"]')
                         || e.target.closest('form');
            if (!container) return;
            var inputs = Array.from(container.querySelectorAll(
                'input[type="number"]:not([disabled]),input[type="text"]:not([disabled])'
            )).filter(function(el){ return !el.closest('[role="gridcell"]'); });
            var idx = inputs.indexOf(e.target);
            if (idx > -1 && idx < inputs.length - 1){
                e.preventDefault();
                inputs[idx+1].focus();
            }
        }

        function handleClickSelect(e){
            if (e.target.tagName === 'INPUT' && e.target.type === 'number'){
                setTimeout(function(){ e.target.select(); }, 50);
            }
        }

        // 재진입 시에도 동작: 기존 리스너 제거 후 재등록
        if (win._단가keydown) win.removeEventListener('keydown', win._단가keydown, true);
        win._단가keydown = handleEnterKey;
        win.addEventListener('keydown', win._단가keydown, true);

        if (win._단가click) doc.removeEventListener('click', win._단가click, true);
        win._단가click = handleClickSelect;
        doc.addEventListener('click', win._단가click, true);

    } catch(err){}
})();
</script>""", height=0)
```

**주의사항:**
- `enter_to_submit=False` 필수 — 없으면 Enter로 폼이 제출됨
- `window.parent` 레벨 캡처(true)로 React 이벤트보다 먼저 실행
- `[data-testid="stForm"]` 기준 탐색 — `enter_to_submit=False` 시 `<div>` 렌더링되어 `closest('form')` 실패
- **플래그(`_단가포커스등록`) 방식은 탭 이동 후 재진입 시 리스너 무효화 문제 발생** → 함수 참조(`_단가keydown`, `_단가click`)를 `win`에 저장 후 제거+재등록 방식 사용
- `st.data_editor`는 `isTrusted=false` 이벤트를 AG Grid가 무시 → JS로 셀 편집 포커스 제어 불가. 대신 data_editor를 읽기 전용으로 두고 별도 st.form 편집 UI 사용
- 숫자 입력 클릭 시 전체 선택: `click` 이벤트 + `setTimeout 50ms` (즉시 호출 시 React 렌더링과 충돌)

---

## SKILL-09. 탭 간 변수명 충돌 방지 (전역 변수 공유 주의)

**목적:** 서로 다른 탭에서 같은 변수명을 재사용해 값이 덮어써지는 버그 방지

**검증 상태:** ✅ 완료 (2026-07-17, `TypeError: only list-like objects are allowed to be passed to isin()` 버그로 발견)

**문제 상황:**
- Streamlit은 `st.tabs()`로 만든 모든 탭의 코드를 **매 rerun마다 전부 실행**함 (화면에 안 보이는 비활성 탭도 예외 없음). 탭 전환은 CSS로 화면만 바꾸는 것이지, 코드 실행 자체를 건너뛰지 않음
- `with tab:` 블록은 별도의 파이썬 스코프를 만들지 않으므로, 그 안에서 만든 변수는 모두 **모듈 전역 변수**를 그대로 덮어씀
- 사이드바에서 `선택_업무명 = st.multiselect(...)` (리스트)로 만든 필터 변수를, 뒤에서 실행되는 다른 탭(`거래처 마스터` → 단가 관리)이 `선택_업무명 = st.selectbox(...)` (문자열)로 재사용 → 이후 실행되는 탭(발행요청목록)에서 `.isin(선택_업무명)` 호출 시 문자열이 전달되어 오류 발생

**핵심 규칙:**
```python
# 나쁜 예 — 사이드바 필터와 이름 충돌
with t4b:
    선택_업무명 = st.selectbox("업무명", 목록)   # 사이드바의 선택_업무명(list)을 덮어씀

# 좋은 예 — 용도별로 접미사를 붙여 구분
with t4b:
    선택_업무명_단가 = st.selectbox("업무명", 목록)
```

**주의사항:**
- 사이드바 필터 변수(`선택_사업부`, `선택_거래처`, `선택_담당자`, `선택_업무명` 등)와 같은 이름은 탭 내부 로컬 용도로 재사용하지 말 것
- 특히 뒤늦게 실행되는 탭(파일 하단에 위치한 `with` 블록)이 앞선 탭에서 쓰던 전역 변수를 의도치 않게 덮어쓸 수 있으므로, 새 탭·섹션 추가 시 기존 변수명과 겹치는지 먼저 확인
- 재사용 함수(SKILL-10)로 묶으면 함수 내부 지역변수는 스코프가 분리되어 이 문제가 발생하지 않음 — 가능하면 탭 내용을 함수로 감싸는 것을 권장

---

## SKILL-10. key_prefix 파라미터로 탭 렌더링 함수 재사용

**목적:** 구조가 동일한 여러 탭(예: 발행대기 목록 / 발행완료 목록)의 코드 중복 없이 공유

**검증 상태:** ✅ 완료 (2026-07-17, 발행요청목록/발행완료 탭 분리 시 적용)

**핵심 로직:**
```python
def _render_발행_섹션(발송여부_target, key_prefix, action_mode):
    # 위젯 key·session_state key는 전부 key_prefix로 구분
    _k_전체선택 = f"{key_prefix}_전체선택"
    if _k_전체선택 not in st.session_state:
        st.session_state[_k_전체선택] = False

    st.checkbox("선택 (전체)", value=st.session_state[_k_전체선택],
                key=f"{key_prefix}_전체선택_cb")

    st.data_editor(display_df, key=f"이력_선택_{key_prefix}_{st.session_state[_k_선택버전]}")

    # 버튼 등 동작도 action_mode로 분기
    if action_mode == "대기":
        ...
    else:
        ...

# 호출부
with t4c:
    _render_발행_섹션(0, "t4c", "대기")
with t4d:
    _render_발행_섹션(1, "t4d", "완료")
```

**주의사항:**
- `st.session_state.attr` 점(dot) 접근은 동적 키 이름을 쓸 수 없음 → `st.session_state[f"{key_prefix}_xxx"]` 대괄호 표기로 통일
- 함수로 감싸면 SKILL-09의 전역 변수 충돌 문제가 자동으로 해결됨 (함수 지역변수는 스코프 분리)
- `with 원래탭:` 블록을 그대로 `def 함수:` 로만 바꿔도 내부 코드의 들여쓰기는 건드릴 필요 없음 (파이썬은 상대 들여쓰기만 일관되면 됨 — 리팩터링 시 diff 최소화에 유용)

---

## SKILL-11. Excel 행 복제 시 "정상" 원본 행 검증 (스타일 균일성)

**목적:** OOXML `<row>` 요소를 복제해 표에 행을 늘릴 때, 복제 원본으로 아무 행이나 골랐다가 셀 누락·폰트 불일치가 나는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-17, 거래명세서 품목 행 동적 삽입 기능에서 실제 발견된 버그)

**문제 상황:**
- 표 형태 템플릿의 마지막 줄(경계 행)은 "정상 행"처럼 보여도 실제로는 스타일이 다른 경우가 많음 — 위/아래 경계선(`thickTop`/`thickBot`)을 만들기 위해 폰트·테두리가 바뀌어 있거나, 값이 항상 비어 있던 셀(예: 코드 열)이 아예 생략(sparse XML)되어 있을 수 있음
- 이런 행을 복제 원본으로 쓰면, 복제된 모든 행에 같은 결함(셀 누락 → 화면에 공란, 폰트 상이 → 시각적으로 다르게 보임)이 반복됨
- 자동화 테스트(openpyxl로 값·구조만 확인)로는 "폰트가 다르다"는 걸 못 잡음 — 사용자가 실제로 열어보고서야 발견됨

**핵심 규칙:**
```python
# 나쁜 예 — 표의 마지막 행(29행)을 복제 원본으로 사용
# 실제로는 A열 셀이 없고 K/L/M열 폰트도 다른 "특수 행"이었음
row29_m = re.search(r'<row r="29"[^>]*>.*?</row>', xml, re.DOTALL)

# 좋은 예 — 표 중간의, 인접 행들과 완전히 동일한 스타일 패턴을 가진 행을 원본으로 사용
# (여러 행을 나란히 diff 떠서 셀 개수·스타일 id가 반복되는 "전형적인" 행을 고름)
row20_m = re.search(r'<row r="20"[^>]*>(.*?)</row>', xml, re.DOTALL)
```

**검증 방법 (원본 행을 고르기 전에):**
1. 후보 행과 앞뒤 몇 개 행의 raw XML을 나란히 덤프해서 셀 개수·컬럼 목록이 동일한지 확인 (일부 행만 특정 컬럼 셀이 생략돼 있지 않은지)
2. `xl/styles.xml`의 `<cellXfs>`에서 각 셀의 `s="N"` 스타일 인덱스가 참조하는 `fontId`를 비교 — 후보 행이 인접 행들과 같은 `fontId`를 쓰는지 확인 (다르면 화면에서 폰트가 달라 보임)
3. 표의 **맨 처음도, 맨 끝(경계)도 아닌 "중간" 행**을 우선 고려 — 경계 행은 위/아래 표와 연결되는 특수 서식(굵은 테두리 등)을 갖기 쉬움

**주의사항:**
- `openpyxl`로 값·병합범위·dimension이 정상인지 자동 검증하는 것만으로는 폰트·스타일 불일치를 못 잡음 — 스타일 검증은 `styles.xml`의 `fontId`/`borderId`를 직접 비교하거나, 최종적으로 실제 Excel로 열어 육안 확인 필요
- 템플릿 자체에 이미 존재하던 "결함 있는 행"(이번 경우 25~29행)은 복제 여부와 무관하게 원래도 문제였을 수 있음 — 발견 시 템플릿 원본도 함께 정상 행 기준으로 재구성해두는 것이 안전 (`data/거래명세서_템플릿_base.xlsx` 25~29행을 20행 기준으로 재구성한 사례 참고)

---

*생성일: 2026. 5. 26. | 새 스킬 확립 시 이 파일에 추가*
