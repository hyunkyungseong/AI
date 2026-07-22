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
| SKILL-05 | MariaDB 연결 패턴 (pymysql) | ✅ 2026-07-19 (init_db_mariadb.py·api.py 등 실사용 검증) |
| SKILL-06 | 비개발자용 화면 검증 체크리스트 | ✅ 표준 템플릿 |
| SKILL-07 | Excel 거래명세서 자동 생성 (zipfile+regex) | ✅ 2026-06-22 |
| SKILL-08 | st.form Enter 키 포커스 관리 + 클릭 시 전체 선택 | ✅ 2026-06-23 |
| SKILL-09 | 탭 간 변수명 충돌 방지 (전역 변수 공유 주의) | ✅ 2026-07-17 |
| SKILL-10 | key_prefix 파라미터로 탭 렌더링 함수 재사용 | ✅ 2026-07-17 |
| SKILL-11 | Excel 행 복제 시 "정상" 원본 행 검증 (스타일 균일성) | ✅ 2026-07-17 |
| SKILL-12 | 배치→실시간 API 전환 시 pivot 컬럼 누락 방지 | ✅ 2026-07-19 |
| SKILL-13 | FastAPI 경로 파라미터명은 반드시 영문(ASCII) | ✅ 2026-07-19 |
| SKILL-14 | MariaDB DECIMAL(pymysql) 계산 시 float 변환 필수 | ✅ 2026-07-19 |
| SKILL-15 | Next.js Route Handler 폴더명도 반드시 영문(ASCII) | ✅ 2026-07-19 |
| SKILL-16 | Next.js 화면 제목 영역 sticky 고정 패턴 (제목 블록) + 표 헤더 전용 박스 스크롤 패턴 | ✅ 완료 (2026-07-19 표 헤더까지 해결) |
| SKILL-17 | Playwright로 이 프로젝트 화면 테스트 시 `:visible` 필수 (상시 마운트+hidden 탭 구조) | ✅ 2026-07-20 |
| SKILL-18 | Next.js에서 인증 필요한 바이너리 파일(Excel 등) 다운로드 프록시 패턴 | ✅ 2026-07-20 |
| SKILL-19 | FastAPI Pydantic 한글 클래스명 — Swagger 예시/표시 개선과 한계 | ✅ 2026-07-20 |
| SKILL-20 | 계산 로직 리팩터링 시 바이트 단위 회귀 검증 (git show + importlib) | ✅ 2026-07-20 |
| SKILL-21 | Windows에서 배포 대상 서버의 포트 충돌(WinError 10048) 대응 — 정체 모르는 서비스는 끄지 말고 포트 우회 | ✅ 2026-07-20 |
| SKILL-22 | 한글 포함 .bat 파일은 맨 앞에 `chcp 65001` 필수 (안 그러면 명령어 전체가 깨져서 엉뚱하게 실행됨) | ✅ 2026-07-21 |
| SKILL-23 | 레벨1(요약)·레벨2(상세) 표는 반드시 같은 필터링된 소스에서 파생시킬 것 + useState 초기값 고정 함정 | ✅ 2026-07-22 |

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

**검증 상태:** ✅ 완료 (2026-07-19 — `init_db_mariadb.py`·`migrate_sqlite_to_mariadb.py`·`preprocess.py`·`api.py`에서 실사용 검증)

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

## SKILL-12. 배치→실시간 API 전환 시 pivot 컬럼 누락 방지

**목적:** 엑셀 전체 배치 처리에서는 잘 동작하던 `pandas.pivot()` 기반 집계 코드가, 실시간 API로 소량 데이터만 받을 때 컬럼 누락 오류(`KeyError`)를 일으키는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-19, `data_transform.merge_자재()`에서 실제 발견)

**문제 상황:**
- `자재종류`(봉투/용지/삽지/미구분) 같은 카테고리 값을 `pivot()`으로 컬럼화하면, **그 배치에 실제로 등장한 카테고리의 컬럼만** 생성됨
- 엑셀 전체(36,804행)를 한 번에 처리할 때는 4종류가 항상 다 등장해서 문제가 드러나지 않았음
- 실시간 API로 업무의뢰서 1건씩(자재 종류가 1~2개만 등장하는 경우가 흔함) 받으면, 등장하지 않은 자재종류의 컬럼(`삽지_사용량` 등)이 아예 안 만들어져서 이후 코드가 그 컬럼을 참조할 때 `KeyError` 발생

**핵심 규칙:**
```python
# 나쁜 예 — 등장한 카테고리만큼만 컬럼이 생김
pivot = df.pivot(index=[...], columns="자재종류", values="사용량").fillna(0).reset_index()
자재컬럼 = [c for c in df.columns if c.endswith("_사용량")]  # 배치에 따라 개수가 다름!

# 좋은 예 — 카테고리 전체 목록을 코드에 고정해두고 항상 보장
for 자재종류 in ("봉투", "용지", "삽지", "미구분"):
    col = f"{자재종류}_사용량"
    if col not in df.columns:
        df[col] = 0
```

**주의사항:**
- 배치 크기가 큰(항상 모든 카테고리가 등장하는) 처리 경로만 테스트하면 이 버그가 절대 드러나지 않음 — 실시간/소량 처리 경로를 반드시 별도로 테스트할 것
- 카테고리 목록은 DB 스키마(예: `자재사용현황.자재종류`가 가질 수 있는 값)에 맞춰 코드에 명시적으로 고정해두는 것이 안전 — `pivot()` 결과에만 의존하지 말 것

---

## SKILL-13. FastAPI 경로 파라미터명은 반드시 영문(ASCII)

**목적:** `@app.get("/경로/{한글이름}")`처럼 중괄호 경로 파라미터명에 한글을 쓰면 라우팅이 항상 실패(404)하는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-19, `GET /거래명세서엑셀/{거래명세서번호}` 신규 추가 중 실제 발견)

**문제 상황:**
- 이 프로젝트는 함수명·변수명·URL 경로의 고정(static) 부분을 전부 한글로 쓰는 관례를 씀 (`/거래처마스터`, `/단가마스터/{id}` 등) — 고정 경로 부분에 한글을 쓰는 건 문제없이 잘 동작함
- 그런데 `{중괄호로 감싼 경로 파라미터}`의 **이름 자체**를 한글로 쓰면(`{거래명세서번호}`), Starlette가 내부적으로 파라미터명을 인식하는 정규식이 한글을 허용하지 않아 그 중괄호 부분을 파라미터가 아니라 **문자 그대로의 리터럴**로 처리해버림
- 결과: 라우트가 `app.routes`·`/openapi.json`에는 정상적으로 등록된 것처럼 보이고, 화면(Swagger `/docs`)에도 정상 표시되지만, **실제 어떤 값을 넣어 호출해도 항상 404**가 남 — 겉보기엔 멀쩡해 보여서 원인을 찾기 까다로움
- 이미 있던 `/단가마스터/{id}`처럼 파라미터명이 영문(`id`)인 라우트는 전혀 문제없이 동작하고 있었어서, "경로의 고정 부분(한글 OK) vs 파라미터명(영문만 가능)"이라는 구분을 놓치기 쉬움

**핵심 규칙:**
```python
# 나쁜 예 — 파라미터명이 한글 → 항상 404 (Match.NONE)
@app.get("/거래명세서엑셀/{거래명세서번호}")
def 거래명세서엑셀(거래명세서번호: str):
    ...

# 좋은 예 — 파라미터명만 영문으로, 함수 내부에서 원하는 한글 변수명으로 바로 옮겨받기
@app.get("/거래명세서엑셀/{no}")
def 거래명세서엑셀(no: str):
    거래명세서번호 = no
    ...
```

**진단 방법 (같은 증상 재현 시):**
```python
# 1. 라우트가 실제로 등록됐는지 확인
for route in app.routes:
    print(route.path)   # 정상적으로 보임 → 등록 자체는 됨

# 2. 실제 매칭 여부를 직접 테스트 (가장 확실한 진단)
from starlette.routing import Match
scope = {"type": "http", "method": "GET", "path": "/거래명세서엑셀/D-202607-00001"}
print(route.matches(scope))   # Match.NONE 이면 이 버그가 원인

# 3. 컴파일된 정규식을 직접 열어보면 확실히 보임
print(route.path_regex.pattern)
# 정상: ^/거래명세서엑셀/(?P<no>[^/]+)$
# 버그: ^/거래명세서엑셀/\{거래명세서번호\}$  ← 중괄호가 캡처그룹이 아니라 리터럴로 이스케이프됨
```

**주의사항:**
- 인증 없이도, 어떤 파라미터 값을 넣어도 항상 404가 나면(401/403이 아니라) 이 버그를 의심할 것 — 응답 바디가 `{"detail":"Not Found"}`(FastAPI 기본 404)라는 점이 힌트(직접 작성한 커스텀 404 메시지가 아님)
- 경로의 **고정된 부분**(세그먼트 자체)은 한글이어도 무방 — 문제는 오직 `{}` 안의 **파라미터 이름**
- 이 프로젝트의 기존 관례(`/단가마스터/{id}`)와 통일해서, 새 경로 파라미터는 항상 짧은 영문명(`id`, `no` 등)을 쓸 것

---

## SKILL-14. MariaDB DECIMAL(pymysql) 계산 시 float 변환 필수

**목적:** MariaDB `DECIMAL` 컬럼 값이 pymysql을 거치면 Python `Decimal` 타입으로 반환되는데, 이를 `float` 누산 변수와 섞어 연산하면 `TypeError`가 나는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-19, `scripts/billing.py`의 `GET /거래명세서엑셀/{no}` 신규 엔드포인트 테스트 중 실제 발견)

**문제 상황:**
- `단가마스터` 테이블의 단가 필드들은 `DECIMAL(10,2)` 타입 — pymysql이 이 값을 조회하면 Python `float`가 아니라 `decimal.Decimal`로 반환함
- `scripts/app.py`는 이 문제를 이미 겪지 않고 있었는데, SQLite에서 읽은 뒤 `load_단가마스터()`에서 `pd.to_numeric(...).fillna(0)`으로 미리 float 변환을 해두고 있었기 때문 (원래는 SQLite 자체가 DECIMAL 타입이 없어서 생긴 우연한 안전장치)
- `scripts/billing.py`의 `generate_거래명세서_excel()`은 `defaultdict(lambda: {"수량": 0.0, "금액": 0.0})`처럼 **float**로 누산 변수를 초기화한 뒤 `+= 수량 * 단가`로 더해가는데, 이 `단가`가 MariaDB에서 변환 없이 그대로 넘어온 `Decimal`이면 `float += Decimal` 연산에서 `TypeError: unsupported operand type(s) for +=: 'float' and 'decimal.Decimal'`가 발생
- 같은 파일의 `calc_공급가맵()`은 우연히 이 문제를 피해갔음 — 누산 변수를 `{"합계": 0, ...}`처럼 **int** `0`으로 초기화해서 `int + Decimal`은 파이썬이 허용하기 때문(`float + Decimal`만 금지). 함수마다 초기값의 타입이 달라 한쪽만 터지는 바람에 원인 파악이 헷갈릴 수 있었음

**핵심 규칙:**
```python
# 나쁜 예 — MariaDB DictCursor로 읽은 값을 그대로 dict에 담음 (Decimal 그대로 유입)
단가맵 = {키: {c: r[c] for c in 단가컬럼} for _, r in 단가df.iterrows()}

# 좋은 예 — dict에 담는 시점에 float으로 명시 변환 (SQLite 시절 pd.to_numeric과 동일한 효과)
단가맵 = {키: {c: float(r[c] or 0) for c in 단가컬럼} for _, r in 단가df.iterrows()}
```

**주의사항:**
- 증상은 코드 경로에 따라 다르게 나타남(`int` 누산이면 안 터지고 `float` 누산이면 터짐) — "같은 데이터인데 이 함수만 에러난다"고 성급히 로직 차이를 의심하기보다, 먼저 두 함수의 **누산 변수 초기값 타입**부터 비교해볼 것
- pymysql의 `DictCursor`는 컬럼 타입을 그대로 보존해서 반환함(`INT`→`int`, `DECIMAL`→`Decimal`, `DATE`→`datetime.date`) — SQLite(타입 느슨함)에서 MariaDB로 옮긴 코드가 있다면, 숫자 계산이 들어가는 지점마다 이 차이를 한 번씩 점검할 가치가 있음
- `float(x or 0)` 형태로 변환하면 `None`(NULL)도 함께 0으로 안전 처리됨 — `float(None)`은 `TypeError`가 나므로 반드시 `or 0`을 붙일 것

---

## SKILL-15. Next.js Route Handler 폴더명도 반드시 영문(ASCII)

**목적:** `frontend/app/api/{한글이름}/route.ts`처럼 App Router API 경로 폴더명을 한글로 쓰면 라우팅이 항상 실패(404)하는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-19, `app/api/거래명세서요청/route.ts` 신규 추가 중 실제 발견)

**문제 상황:**
- SKILL-13(FastAPI)에서는 "경로의 고정 부분은 한글이어도 되고, `{}` 안의 파라미터 이름만 영문이면 된다"는 규칙을 확인했었음 — 이번에도 같은 관례가 통할 거라 생각하고 Next.js Route Handler를 `app/api/거래명세서요청/route.ts`(고정 세그먼트, 파라미터 아님)로 만들었으나 **완전히 다른 결과**가 나옴
- Next.js(Turbopack, 16.2.10) App Router는 한글 폴더명 자체를 라우트로 아예 인식하지 못함 — 개발 서버를 완전히 재시작해도, URL을 UTF-8 percent-encoding(`%EA%B1%B0...`)해서 호출해도 항상 404
- `.next/dev/server/app/api/` 빌드 산출물을 확인해보면 영문 라우트(`login`)는 컴파일되어 있지만 한글 라우트는 아예 생성 시도조차 안 됨 — Turbopack의 파일시스템 라우트 탐색 단계에서부터 걸러짐
- 브라우저에서 호출한 `fetch()`는 이 404 HTML 페이지를 받아 `res.json()` 파싱에 실패하면서 catch 블록으로 빠져 "서버에 연결할 수 없습니다" 같은 애매한 오류 메시지로 표시됨 — 실제 원인(라우팅 실패)과 증상(네트워크 오류처럼 보임)이 동떨어져 있어 원인 파악이 까다로움

**핵심 규칙:**
```
# 나쁜 예 — Route Handler 폴더명이 한글 → 항상 404
frontend/app/api/거래명세서요청/route.ts

# 좋은 예 — 폴더명만 영문으로, 내부에서 호출하는 FastAPI 쪽 경로는 한글 그대로 둬도 무방
frontend/app/api/invoice-request/route.ts
  → 내부에서 fastapiFetch("/거래명세서요청", ...) 호출 (FastAPI 쪽은 SKILL-13 규칙대로 정상 동작)
```

**진단 방법 (같은 증상 재현 시):**
1. 브라우저/프론트 코드에서는 "서버에 연결할 수 없습니다" 류의 catch-all 오류만 보임 — 먼저 해당 Route Handler를 직접 `curl -i -X POST http://localhost:3000/api/{경로}`로 호출해 실제 상태 코드부터 확인 (404 HTML이면 이 문제, JSON 401/400/500이면 다른 원인)
2. `.next/dev/server/app/api/` (또는 프로덕션 빌드면 `.next/server/app/api/`) 아래에 해당 라우트 폴더가 실제로 생성됐는지 확인 — 없으면 라우트 자체가 인식되지 않은 것
3. URL을 percent-encoding해서 다시 호출해봐도 결과가 같다면 인코딩 문제가 아니라 라우터가 폴더명 자체를 못 읽는 것

**주의사항:**
- SKILL-13(FastAPI/Starlette)과 절대 같은 규칙으로 착각하지 말 것 — 프레임워크마다 한글 경로 지원 범위가 다르므로, 새 프레임워크에 처음 한글 경로를 쓸 때는 반드시 실제로 호출해서 검증할 것
- Next.js Route Handler(`app/api/**/route.ts`)뿐 아니라 일반 페이지 라우트(`app/**/page.tsx`)도 동일한 제약이 있을 가능성이 높음 — 아직 실측하지 않았으나 새로 한글 페이지 경로가 필요해지면 이 스킬부터 참고해서 먼저 검증할 것
- 이 프로젝트의 API 경로 자체(FastAPI, 예: `/거래명세서요청`)는 한글을 그대로 쓰는 게 기존 관례이므로, "Next.js Route Handler 폴더명만 영문, 그 안에서 프록시하는 FastAPI 경로 문자열은 한글 유지"로 역할을 분리해서 기억할 것

---

## SKILL-16. Next.js 화면 제목 영역 sticky 고정 패턴 + 표 헤더 전용 박스 스크롤

**목적:** 표가 길어 스크롤이 필요한 화면에서 제목·안내문구·액션 버튼(+선택 요약)이 스크롤을 따라 사라지지 않고 화면 위쪽에 계속 보이도록 고정 — 사용자 요청으로 향후 신규 화면에도 기본 적용하는 표준 패턴으로 채택 (2026-07-19, `Tab4Invoice.tsx`·`Tab4IssuedList.tsx`에 최초 적용)

**검증 상태:** ✅ 완료 (2026-07-19 제목 블록 sticky 완료, 표 헤더(thead)까지 이어붙이는 부분도 같은 날 최종 해결)

**핵심 규칙:**
```tsx
<main className="flex flex-1 flex-col">
  <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200 bg-background px-6 py-4 dark:border-gray-800">
    {/* 제목, 부제(조회 결과 N건 등), 배너, 액션 버튼 — 항상 보여야 할 것만 */}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1>...</h1>
        <p>...</p>
      </div>
      {/* 선택 요약처럼 우측에 붙일 인라인 정보가 있으면 여기 */}
    </div>
  </div>

  <div className="space-y-4 p-6">
    {/* 표·상세 등 스크롤되는 실제 콘텐츠 */}
  </div>
</main>
```

- **`bg-background` 필수**: `app/globals.css`의 `@theme inline { --color-background: var(--background); }`으로 등록된 Tailwind v4 토큰 — 라이트(`#ffffff`)/다크(`#0a0a0a`) 실제 페이지 배경과 항상 정확히 일치해서, sticky 블록이 스크롤되는 콘텐츠를 확실히 가려준다. `bg-white dark:bg-gray-900` 같은 카드용 배경색을 쓰면 미묘하게 색이 달라 보이거나 다크모드 대응을 따로 신경써야 함.
- **`overflow-y-auto`를 `<main>`에 걸지 말 것**: 이 프로젝트는 최상위 레이아웃이 `min-h-screen`(고정 높이 아님)이라 내부 요소에 `overflow-y-auto`를 걸어도 실제로는 스크롤이 발생하지 않음(높이가 애초에 제한 안 됨) — 죽은 코드가 됨. 스크롤은 항상 window(문서) 레벨에서 일어나므로 `position: sticky`도 window 기준으로 자연스럽게 동작한다.
- **탭 전환 시 스크롤 위치 공유 주의**: Dashboard.tsx/Tab4.tsx 둘 다 탭을 상시 마운트 + `hidden` 클래스로 숨기는 패턴(필터 상태 보존 목적)이라, 스크롤도 window 하나를 모든 탭이 공유한다. 탭을 바꿔도 스크롤 위치가 초기화되지 않는 건 sticky 도입 이전부터 있던 기존 동작이라 이번에 새로 생긴 문제 아님 — 알고 있을 것.
- **z-index**: 이번엔 sticky 블록이 화면당 1개뿐이라 `z-10`이면 충분. 나중에 sticky를 여러 단(예: 상위 탭 네비게이션까지 sticky)으로 쌓으면 위쪽일수록 큰 z-index를 줘야 함.

**주의사항:**
- 선택 요약처럼 내용量이 가변적인 컴포넌트를 제목 옆에 인라인으로 붙일 땐 부모에 `flex-wrap`을 줘서 좁은 화면에서 줄바꿈되게 해야 함(`justify-between`만 있으면 좁을 때 겹칠 수 있음).

### 확장 — 표 `<thead>`까지 이어붙여 고정하기 — ✅ 해결 (2026-07-19, Playwright로 실제 브라우저 실측 후 확정)

**이전 시도(ResizeObserver로 `stickyTop` 측정 후 `<thead style={{top: stickyTop}}>`, `overflow-y-clip` 추가) 둘 다 실패했던 진짜 원인이 실측으로 확정됨:**

CSS `position: sticky`는 **"가장 가까운, overflow가 visible이 아닌 조상"을 기준으로 계산되며, 그 조상이 실제로 스크롤되는지 여부와 무관하게 무조건 그 조상이 기준이 된다**(MDN에 명시된 동작). 표를 감싼 `overflow-x-auto` wrapper div가 정확히 이 조건에 해당해서, `<thead>`의 sticky가 **창(window) 스크롤이 아니라 이 wrapper div를 기준**으로 계산되고 있었다. 그런데 이 wrapper는 내부적으로 스크롤되는 일이 없으므로(스크롤은 항상 창 레벨), thead는 실제로 "붙는" 게 아니라 **wrapper 상단에서 `stickyTop`px 떨어진 자리에 고정된 채로 창 스크롤을 그대로 따라 흘러갔다.** Playwright로 스크롤 전/후 `getBoundingClientRect()`를 실측한 결과, 스크롤을 아무리 내려도 `thead.top - wrapper.top` 값이 정확히 `stickyTop`(88px)으로 고정돼 있음을 확인해 이 메커니즘을 확정함(부가로 `ResizeObserver`의 기본 `contentRect`가 padding·border를 제외한 값이라 `stickyTop` 자체도 33px 부족했던 것도 함께 발견).

**결론: 가로 스크롤이 필요한 표(`overflow-x-auto`)와 "창 스크롤에 붙는 thead"를 동시에 만족하는 순수 CSS 방법은 없다** — sticky는 항상 가장 가까운 오버플로 조상에 종속되기 때문. 대신, **표 자신을 높이 제한된 독립 스크롤 박스로 만들어(`max-height` + `overflow-auto`, 가로·세로 모두), thead가 그 박스 자기 자신을 기준으로 `top: 0`에 붙게 하는 방식**으로 전환해 해결했다 — 이 경우 박스 자신이 진짜로 스크롤되는 조상이므로 sticky가 스펙대로 정확히 동작한다. `ResizeObserver`/`stickyTop` 측정 코드 전체가 필요 없어져 코드도 더 단순해졌다.

**표 컴포넌트의 최종 형태 (`InvoiceSelectionTable.tsx` 등 4개 표 공통)**
```tsx
<div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
  <table className="whitespace-nowrap text-sm">
    <thead className="sticky top-0 z-[5] bg-gray-50 dark:bg-gray-900">
      {/* ... */}
    </thead>
    <tbody>{/* ... */}</tbody>
  </table>
</div>
```
- `stickyTop` prop, `useElementHeight` 훅(`frontend/lib/useElementHeight.ts`) 전부 제거 — 더 이상 제목 블록 높이를 측정해서 넘겨줄 필요가 없다(thead가 자기 박스 기준 `top:0`이라 항상 정확함)
- 제목 블록 자체의 sticky(`Tab4Invoice.tsx`/`Tab4IssuedList.tsx`의 `sticky top-0`, 창 스크롤 기준)는 그대로 유지 — 이건 애초에 overflow 조상이 없어서 원래도 정상 동작하고 있었음
- `max-h-[60vh]`는 화면 대비 적당한 값으로 고정 — 표 내용이 이보다 작으면 스크롤바 없이 그냥 내용 높이만큼만 박스가 줄어듦(정상)
- **트레이드오프(사용자 확인 후 채택):** 표 영역이 "페이지 전체와 하나로 이어지는 스크롤"이 아니라 **표마다 자체 스크롤바를 가진 독립 박스**가 됨. JS로 스크롤 위치를 직접 계산해 페이지 전체가 하나로 스크롤되는 느낌을 유지하는 대안도 있었으나(가로 스크롤 동기화까지 필요해 코드 복잡도·엣지케이스 부담이 커서), 이 프로젝트는 CSS만으로 안정적으로 해결되는 이 방식을 선택함
- **진단 방법(같은 부류의 sticky 버그를 다시 만나면):** 코드 추론만으로는 한계가 있음 — Playwright(또는 실제 브라우저 개발자도구)로 `getBoundingClientRect()`를 스크롤 전/후 비교해서, 문제의 sticky 요소가 실제로 창을 기준으로 붙는지, 아니면 특정 조상 요소를 기준으로 고정된 오프셋만큼 떨어진 채 그 조상과 함께 흘러가는지부터 확인할 것. 후자라면 그 조상 중 `overflow`가 `visible`이 아닌 것을 찾아 원인으로 의심.

---

## SKILL-17. Playwright로 이 프로젝트 화면 테스트 시 `:visible` 필수

**목적:** 이 프로젝트의 Next.js 탭 구조(상시 마운트 + `hidden` 클래스로 숨김, SKILL-16 관련 배경과 동일한 이유 — 필터 상태 보존)를 모른 채 Playwright locator를 짜면, 화면에 안 보이는 다른(숨겨진) 탭의 동일한 엘리먼트를 잘못 찾아 `waitFor({state:"visible"})`가 영원히 타임아웃되는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-20, 거래명세서 미리보기 기능 종단 검증 중 실제로 걸려서 발견)

**문제 상황:**
- `Dashboard.tsx`(탭1~4)·`Tab4.tsx`(미발행목록/발행요청목록/발행완료) 전부 "탭을 언마운트하지 않고 CSS로만 숨김" 패턴을 씀 — 그래서 로그인 직후에도 페이지 DOM에는 `<table>`·체크박스·"거래처" 필터 라벨 등이 **여러 벌** 동시에 존재함(현재 보이는 탭 것 + 숨겨진 나머지 탭 것들)
- `page.locator('table tbody tr').first()` 처럼 짜면 Playwright는 DOM 순서상 첫 번째 요소를 고르는데, 그게 숨겨진 탭 소속이면 `checked`가 아니라 `waitFor({state:"visible"})`에서 "element is not visible" 상태로 계속 재시도만 하다 타임아웃(기본 30초~)남 — 에러 메시지에 "not visible"이라고 나오지만 셀렉터 자체는 문법적으로 멀쩡해서 원인 파악이 헷갈림

**핵심 규칙:**
```js
// 나쁜 예 — 숨겨진 탭의 동일 구조를 먼저 찾을 수 있음
const checkbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');

// 좋은 예 — :visible 가상 클래스로 현재 보이는 탭만 한정
const checkbox = page.locator('table tbody tr:visible').first().locator('input[type="checkbox"]');

// 라벨 기반 검색도 동일하게 적용
const 거래처Label = page.locator('label:visible', { hasText: /^거래처$/ });
```

**주의사항:**
- `getByRole`/`getByText`도 기본적으로 visibility를 걸러주지 않음 — `.first()`가 숨겨진 요소를 고를 수 있다는 점은 동일하게 적용됨
- 버튼처럼 페이지에 정말 하나만 있는 요소(예: "로그인" 제출 버튼)는 이 문제가 없음 — 여러 탭에 걸쳐 반복되는 구조(표, 필터 사이드바)에서만 신경 쓰면 됨
- 클릭 액션이 "element intercepts pointer events" 에러로 실패하면(다른 원인) 이미 열린 모달이 그 요소를 가리고 있다는 신호 — 이 문제와는 별개이니 혼동하지 말 것(둘 다 겪었음, 거래명세서 미리보기 검증 과정 참고)

---

## SKILL-18. Next.js에서 인증 필요한 바이너리 파일(Excel 등) 다운로드 프록시 패턴

**목적:** FastAPI의 파일 다운로드 API가 JWT(Authorization 헤더)로 보호돼 있어 브라우저가 그 주소를 직접 열 수 없을 때(httpOnly 쿠키는 브라우저가 자동으로 FastAPI 헤더로 바꿔주지 않음), Next.js Route Handler로 우회하는 방법

**검증 상태:** ✅ 완료 (2026-07-20, `GET /거래명세서엑셀/{no}` 다운로드 버튼 추가 시 최초 적용)

**핵심 로직:**
```ts
// frontend/app/api/invoice-excel/[no]/route.ts
import { NextResponse } from "next/server";
import { fastapiFetch } from "@/lib/fastapi";  // httpOnly 쿠키 → Authorization 헤더 변환(서버 전용)

export async function GET(_request: Request, { params }: RouteContext<"/api/invoice-excel/[no]">) {
  const { no } = await params;
  const res = await fastapiFetch(`/거래명세서엑셀/${encodeURIComponent(no)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "다운로드 처리 중 오류가 발생했습니다" }));
    return NextResponse.json(data, { status: res.status });
  }

  const buf = await res.arrayBuffer();  // JSON 프록시(res.json())와 다르게 바이너리 그대로 전달
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="${no}.xlsx"`,
    },
  });
}
```
```tsx
{/* 화면에서는 그냥 일반 링크로 연결 — Next.js Route Handler는 같은 출처(same-origin)라 브라우저가
    직접 네비게이션할 때 httpOnly 쿠키를 자동으로 함께 보내므로 fetch()나 JS가 따로 필요 없음 */}
<a href={`/api/invoice-excel/${encodeURIComponent(no)}`} download>다운로드</a>
```

**주의사항:**
- 동적 라우트 폴더명(`[no]`)은 영문이어야 하는 SKILL-15와 무관하게 이미 영문이라 문제 없음 — 폴더명 자체를 한글로 쓰지 않도록 계속 주의
- 이 Next.js 버전(16.2.10)은 Route Handler의 `params`가 항상 Promise라 `await params`가 필요함(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` 참고) — 타입은 `RouteContext<'/api/경로/[param]'>` 헬퍼를 씀
- 검증: 임시 로그인 계정으로 Next.js 자체 `/api/login`에 로그인해 세션 쿠키를 받은 뒤, 같은 세션으로 이 프록시를 호출해 실제 xlsx 바이트가 정상 크기로 오는지 확인(FastAPI를 직접 호출하는 게 아니라 반드시 Next.js 경유로 테스트해야 쿠키→헤더 변환까지 검증됨)

---

## SKILL-19. FastAPI Pydantic 한글 클래스명 — Swagger 예시/표시 개선과 한계

**목적:** `/docs`(Swagger UI)에서 요청 스키마가 안 예쁘게 보이는 두 가지 서로 다른 문제(① 기본값 때문에 예시가 빈 배열로 보임 ② 한글 클래스명 때문에 내부 스키마 이름이 뭉개짐)를 각각 정확히 구분해서 고치는 방법과, 못 고치는 부분을 미리 알아두기

**검증 상태:** ✅ 완료 (2026-07-19~20, `POST /운영통계자료수신` 문서 다듬는 과정에서 실제 발견)

**문제 1 — 선택 필드에 기본값(`= []`)이 있으면 Swagger "Example Value"가 그 기본값을 그대로 보여줌:**
```python
# 나쁜 예 — Swagger가 "Example Value"에 자재사용현황: [] 를 그대로 표시(실제 필드가 있어도 안 보임)
class 운영통계수신요청(BaseModel):
    자재사용현황: List[자재행] = []

# 좋은 예 — model_config로 원하는 예시를 직접 지정
class 운영통계수신요청(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"자재사용현황": [{"자재형태": "일반봉투", ...}]}})
    자재사용현황: List[자재행] = []
```

**문제 2 — 클래스명이 한글이면 Swagger가 스키마를 서로 연결하는 내부 `$ref` 컴포넌트 이름이 밑줄로 뭉개짐(예: `api____________3`, `__main________________3`):**
```python
class 운영통계수신요청(BaseModel):
    model_config = ConfigDict(title="OperationDataSubmitRequest")  # 화면 표시용 별명 — 필드명은 한글 그대로
```
- **된 것:** 스키마의 `title` 속성이 영문으로 채워짐 — Swagger가 중첩 스키마를 펼칠 때 이 `title`을 라벨로 쓰는 위치는 영문으로 보임
- **안 된 것:** `title`은 `$ref` 컴포넌트 키 이름 자체를 바꾸지 못함(Pydantic이 이 키를 `모듈명.클래스명` 기준으로 따로 생성) — `/docs` 하단 "Schemas" 전체 목록·URL 앵커는 여전히 뭉개진 이름일 수 있음
- **완전히 고치려면:** 클래스명 자체를 영문으로 바꿔야 함(`class 운영통계수신요청` → `class OperationDataSubmitRequest`) — 코드 전체에서 그 클래스를 참조하는 타입힌트까지 다 같이 바꿔야 하는 더 큰 작업이라, 이 프로젝트는 아직 `title`만 추가한 상태로 남겨둠(사용자 확인 후 보류)

**주의사항:**
- 필드명(`업무의뢰서번호` 등 실제 JSON key)은 이 작업과 전혀 무관 — 절대 안 바뀜, 바꿀 필요도 없음. `title`은 순수하게 문서/화면 표시용 별명일 뿐
- 확인 방법: `app.openapi()`를 직접 호출해 `schema['components']['schemas']`의 키(뭉개짐 여부)와 각 값의 `'title'`(개선 여부)을 따로 찍어봐야 두 문제를 안 헷갈림

---

## SKILL-20. 계산 로직 리팩터링 시 바이트 단위 회귀 검증 (git show + importlib)

**목적:** `generate_거래명세서_excel()`처럼 결과물이 복잡한(zipfile/XML 조작) 함수 내부 계산 블록을 별도 함수로 분리하는 "순수 리팩터링"을 할 때, "로직이 한 글자도 안 바뀌었다"는 걸 코드 리뷰가 아니라 실제 실행 결과로 증명하는 방법

**검증 상태:** ✅ 완료 (2026-07-20, `billing.py`에서 `build_품목행()` 분리 시 적용)

**핵심 로직:**
```python
import importlib.util, hashlib

# 1. 커밋된(리팩터링 전) 버전을 별도 파일로 뽑아서 독립 모듈로 로드
# (git show HEAD:./scripts/billing.py > billing_old.py 로 미리 저장해둠)
spec = importlib.util.spec_from_file_location("billing_old", "billing_old.py")
billing_old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(billing_old)
billing_old.BASE_DIR = Path(r"d:\실제\프로젝트\경로")  # __file__ 기준 상대경로가 임시 파일 위치로 잘못 잡히므로 보정
billing_old.템플릿_PATH = billing_old.BASE_DIR / "data" / "거래명세서_템플릿_base.xlsx"

# 2. 실제 운영 데이터(예: 이미 발행된 거래명세서 1건)로 신·구 버전 둘 다 실행
bytes_old = billing_old.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일)
bytes_new = billing.generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일)  # 리팩터링 후(현재 import)

# 3. 바이트 자체를 비교(sha256이면 로그에 남기기도 편함)
assert bytes_old == bytes_new
```

**주의사항:**
- `importlib.util.spec_from_file_location`으로 로드한 모듈은 `__file__`이 실제 로드된 경로(스크래치 폴더 등)를 가리키므로, 그 모듈이 `Path(__file__).parent`처럼 상대경로로 참조하는 리소스(템플릿 xlsx 등)가 있으면 로드 직후 해당 경로 변수를 실제 프로젝트 경로로 직접 덮어써야 함 — 안 그러면 `FileNotFoundError`가 리팩터링과 무관하게 발생해서 헷갈림
- DB에서 읽어온 실제 데이터로 검증해야 의미가 있음(가짜 데이터는 특정 분기를 안 타서 회귀를 놓칠 수 있음) — 이 프로젝트는 이미 발행된 거래명세서 번호를 그대로 재사용(읽기 전용 SELECT만 하므로 DB 오염 없음)
- 이 기법은 Excel처럼 "출력 형식이 결과물 검증을 어렵게 만드는" 함수에 특히 유용 — JSON을 반환하는 함수는 그냥 값 비교(`==`)로 충분해서 이렇게까지 할 필요 없음

---

## SKILL-21. Windows에서 배포 대상 서버의 포트 충돌(WinError 10048) 대응 — 정체 모르는 서비스는 끄지 말고 포트 우회

**목적:** 새 서버(사무실 PC 등)에 이 프로젝트의 FastAPI를 처음 배포할 때, 표준 포트(8000)를 이미 다른 프로그램이 쓰고 있어 기동이 실패하는 상황을 안전하게 해결하는 방법

**검증 상태:** ✅ 완료 (2026-07-20, MariaDB+FastAPI를 사무실 PC로 이관하며 실제로 겪음 — `plan_1단계_MariaDB전환.md` [6단계])

**문제 상황:**
- `API서버_실행.bat`(포트 8000 고정)을 처음 보는 서버에서 실행했더니 아래 오류로 기동 실패:
  ```
  ERROR: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000): ...
  ```
- `netstat -ano | findstr :8000`으로 확인해보니 우리 프로젝트와 무관한 기존 서비스(`httpd.exe`, "ibx dashboard"라는 사내 다른 웹 서비스)가 이미 8000번을 쓰고 있었음

**핵심 판단 기준:**
- **그 프로세스가 뭔지 확실히 모르면 절대 `taskkill`로 끄지 않는다** — 사내에서 실제로 쓰이고 있는 다른 서비스일 수 있고, 함부로 끄면 다른 업무에 지장을 줄 수 있음(비가역적 피해 가능)
- 대신 **우리 쪽 서버를 다른 포트로 우회 실행**하는 것이 항상 더 안전한 선택 — 포트 번호는 임의로 골라도 되는 값이라 되돌리기 쉽지만, 남의 서비스를 끄는 건 되돌리기 어려울 수 있음

**진단 명령어:**
```
netstat -ano | findstr :8000        # LISTENING 상태의 PID 확인
tasklist | findstr "그_PID"          # 그 PID가 어떤 프로그램인지 확인
```

**우회 실행 (소스 코드 수정 없이, 표준 배치파일 대신 직접 실행):**
```
uvicorn scripts.api:app --host 0.0.0.0 --port 8001
```
`scripts/api.py`의 `uvicorn.run(app, host="0.0.0.0", port=8000)`는 `python scripts/api.py`로 실행할 때만 적용되는 하드코딩값이라, `uvicorn` 명령을 직접 쓰면 `--port`로 얼마든지 바꿔 실행할 수 있음(api.py 파일 docstring에 이미 이 대안 실행법이 문서화돼 있었음). 이 방식이 필요한 서버 전용으로 `API서버_실행_사무실PC.bat`처럼 포트만 다른 배치파일을 새로 만들어두면 재사용하기 편함.

**주의사항:**
- 포트를 바꾸면 그 서버를 호출하는 쪽(이 프로젝트는 `frontend/.env.local`의 `FASTAPI_URL`) 설정도 반드시 같이 바꿔야 함 — 안 바꾸면 "서버는 켜졌는데 화면에서는 연결 안 됨" 증상으로 헷갈릴 수 있음
- 방화벽 인바운드 규칙도 바뀐 포트 번호 기준으로 새로 추가해야 함(`netsh advfirewall firewall add rule ... localport=8001`)
- MariaDB(포트 3306)는 애초에 같은 서버 안에서만(`127.0.0.1`) 접속하도록 설계해뒀다면 이런 충돌·방화벽 이슈 자체가 안 생김 — 이번 이관에서도 DB는 3306을 그대로 쓰고 FastAPI만 포트를 옮겨서 해결함

---

## SKILL-22. 한글 포함 .bat 파일 — CRLF 줄바꿈 필수(진짜 원인), `chcp 65001`은 보조 조치

**목적:** Claude가 Write 도구로 만드는 `.bat` 파일에 한글(`echo` 문구 등)이 있을 때, 파일 전체의 명령어 해석이 뒤죽박죽 깨지는 문제 방지

**검증 상태:** ✅ 완료 (2026-07-21, `웹화면_실행.bat` 실제 실행 중 발견·수정 — 사용자가 "떴다가 사라짐"으로 제보, 1차 시도 실패 후 진짜 원인 확정)

**⚠️ 시행착오 기록 (같은 증상 다시 만나면 이 순서를 건너뛸 것):**
1차로 "CP949 콘솔이 UTF-8 파일을 잘못 해석하는 것"으로 진단하고 `chcp 65001 >nul`을 맨 앞에 추가했으나 **증상이 그대로 재현됨**(깨지는 글자 조각만 달라짐). 파일을 바이트 단위로 직접 비교(`xxd`)해서 진짜 원인을 찾음:
- 기존에 문제없이 잘 동작하던 `대시보드_실행.bat`(한글 포함, `chcp` 없음) → **CRLF**(`0d 0a`) 줄바꿈
- 문제가 생긴 새로 만든 `.bat` 파일들(Write 도구로 생성) → **LF만**(`0a`) 줄바꿈
- 즉 **진짜 원인은 코드페이지가 아니라 줄바꿈 방식**이었음 — `cmd.exe`의 배치 파서가 한글(멀티바이트 UTF-8) 텍스트를 LF만 있는 줄에서 정상적으로 못 끊어 읽어서, 뒤 내용과 뒤섞여 깨짐(`cd /d "%~dp0frontend"`처럼 한글이 전혀 없는 줄까지 같이 오작동해 엉뚱한 폴더에서 `npm run dev`가 실행되는 부작용도 발생)

**문제 상황:**
- `cd /d "%~dp0frontend"`처럼 한글이 전혀 없는 줄도 포함해서, 파일 전체가 잘못 토큰화됨
- 실제 증상: `echo` 문구가 `'댕뗀...'은(는) 내부 또는 외부 명령...`, `'ttp:'은(는)...`처럼 뜬금없는 조각으로 깨져서 각각 "실행할 수 없는 명령"으로 오인식됨
- 더 심각한 부작용: 인코딩이 깨지면서 `cd /d "%~dp0frontend"`까지 같이 오작동해 **엉뚱한 폴더**(예: `frontend` 하위가 아니라 프로젝트 루트)에서 `npm run dev`가 실행됨 → `npm error ... Could not read package.json`
- 창이 `pause`까지 못 가고 빨리 닫혀버려서(또는 중간에 오류만 스치듯 보이고) 원인 파악이 어려움 — "에러는 안 뜨고 떴다가 사라짐"이 전형적인 증상

**핵심 규칙 (해결책):**
```bash
# Write 도구로 .bat 파일을 만들거나 수정한 직후, 항상 CRLF로 변환한다
sed -i 's/\r$//' 파일명.bat   # 혹시 섞여있을 CR 먼저 제거(멱등성 확보)
sed -i 's/$/\r/' 파일명.bat   # 모든 줄 끝에 CR 추가 → CRLF 완성
```
```bat
REM 파일 내용 자체는 이렇게 유지(chcp는 필수는 아니지만 안전을 위해 함께 유지 권장)
@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"
echo 웹 화면을 시작합니다...
```
변환 후 `file 파일명.bat`로 `with CRLF line terminators`가 찍히는지 반드시 확인할 것(안 찍히면 아직 LF 상태).

**주의사항:**
- **Write 도구로 새로 만드는 `.bat` 파일은 기본적으로 LF로 저장되는 것으로 보임** — 한글이 들어가는 `.bat`를 만들 때마다 위 `sed` 변환을 빠짐없이 적용할 것(까먹기 쉬우므로 "배치파일 작성 = 마지막에 CRLF 변환까지가 한 세트"로 기억)
- `chcp 65001`만으로는 해결되지 않았다는 게 이번에 실측으로 확인된 사실 — 코드페이지 문제로 성급히 진단하지 말고, 의심되면 `xxd 파일.bat | head`로 줄바꿈이 `0d 0a`(CRLF)인지 `0a`만 있는지(LF) 먼저 확인할 것
- 증상: "명령어를 찾을 수 없다"는 오류가 파일 내용과 무관해 보이는 조각으로 뜨거나(예: 정상적인 `echo` 문구의 일부만 잘려서 명령어처럼 오인식), 한글이 없는 줄(`cd /d ...`)까지 같이 오작동하는 부작용이 함께 나타나면 이 문제부터 의심
- Claude Code의 Bash 도구로 `cmd.exe /c 파일.bat`를 실행해 배치파일을 검증하려는 시도는 이 프로젝트 환경에서 신뢰도가 낮았음(배경 프로세스가 실제로 파일 내용을 실행하지 않고 빈 프롬프트만 반환하는 현상 반복 관찰) — 배치파일의 실제 동작 검증은 사용자의 실제 더블클릭(또는 사용자가 직접 연 `cmd` 창 안에서 실행) 결과로 확인하는 것이 가장 확실함

---

## SKILL-23. 레벨1(요약)·레벨2(상세) 표는 반드시 같은 필터링된 소스에서 파생시킬 것 + `useState` 초기값 고정 함정

**목적:** "체크박스로 그룹(레벨1) 선택 → 그 안의 개별 항목(레벨2) 펼쳐보기" 구조에서, 레벨1 합계와 레벨2 상세가 서로 다른 데이터 집합을 참조해 숫자가 안 맞는 버그 방지

**검증 상태:** ✅ 완료 (2026-07-22, 발행완료 화면에서 실사용 데이터로 실제 발견·수정 — `plan_1단계_MariaDB전환.md` [6단계] 이관 완료 직후 사용자가 실사용하다 제보)

**문제 상황:**
- `Tab4IssuedList.tsx`에서 레벨1 요약(`groups`)은 필터가 적용된 `filters.base5`로 만드는데, 레벨2 상세(`level2Rows`)는 필터 미적용 `scoped`(발송여부만 걸러진 전체)에서 만들고 있었음
- 결과: 필터에 걸려 레벨1 합계에서 빠진 의뢰서가, 레벨2를 펼치면 아무 일 없다는 듯 다시 나타남 — 레벨1 "봉입건수 2,440"인데 펼치면 5건이 보이고 그 5건을 다 더하면 4,932인 상황이 발생, 사용자 입장에선 "합계 계산이 틀렸다"로 보임(실제로는 레벨1이 그 중 2건만 더한 것)
- 실사용 데이터(D-202607-00011)로 역산 검증: 레벨1에 표시된 숫자가 정확히 "필터를 통과한 일부 의뢰서만의 합"과 일치함을 확인해 원인 확정

**핵심 규칙:**
```ts
// 나쁜 예 — 레벨2가 필터 미적용 원본에서 파생됨
const groups = useMemo(() => build레벨1그룹(filters.base5), [filters.base5]);
const level2Rows = useMemo(
  () => scoped.filter((r) => selected1.has(`${r.거래명세서번호}::${r.업무명}`)),
  [scoped, selected1]
);

// 좋은 예 — 레벨1·레벨2가 항상 같은(필터링된) 소스를 씀
const groups = useMemo(() => build레벨1그룹(filters.base5), [filters.base5]);
const level2Rows = useMemo(
  () => filters.base5.filter((r) => selected1.has(`${r.거래명세서번호}::${r.업무명}`)),
  [filters.base5, selected1]
);
```

**부가로 함께 발견된 원인 — `useState` 초기값은 마운트 시점 "한 번만" 계산됨:**
```ts
// 나쁜 예 — rows가 나중에 늘어나도(예: 새로 발행 완료된 더 이른 날짜의 항목 추가) 재계산 안 됨
const 기본시작일 = useMemo(() => 최소작업일자(rows), [rows]);
const [시작일, set시작일] = useState(기본시작일);  // 최초 마운트 시점 값으로 영구 고정

// 좋은 예 — "똑똑한 기본값"을 계산하려 하지 말고 빈 값으로 시작, 사용자가 직접 지정
const [시작일, set시작일] = useState("");
```
`useState(초기값)`의 인자는 컴포넌트가 처음 마운트될 때 딱 한 번만 평가된다 — 그 이후 `rows`(원본 데이터)가 바뀌어도 `useState`가 자동으로 다시 계산해주지 않는다. "데이터의 최솟값/최댓값으로 필터 기본값을 똑똑하게 채워주기" 같은 패턴을 쓸 때마다 이 함정에 걸릴 수 있음 — 데이터가 실시간으로 계속 들어오는 이 프로젝트(생산공정관리시스템이 계속 새 의뢰서를 push함) 같은 경우 특히 취약함.

**주의사항:**
- 레벨1/레벨2(또는 레벨3) 드릴다운 구조를 새로 만들 때마다, 모든 레벨이 **정확히 같은 필터링 파이프라인의 결과물**에서 파생되는지 먼저 점검할 것 — 다른 레벨이 "필터 적용 전" 원본을 참조하고 있지 않은지 확인
- "똑똑한 기본값"(데이터 기반 자동 계산)이 필요할 것 같으면, `useState` 초기값 대신 `useMemo`로 매 렌더마다 최신값을 계산하고, 사용자가 아직 직접 건드리지 않았을 때만 그 값을 쓰는 방식(예: 별도의 "사용자가 수정했는지" 플래그)을 고려할 것 — 다만 이번엔 사용자가 "그냥 기본은 전체로, 필요하면 내가 직접 지정하겠다"를 선택해 아예 빈 값 기본으로 단순화함(더 견고하고 코드도 단순해짐)
- 이 버그는 화면 표시(집계) 로직에만 있었고, DB에 실제 저장된 값(예: 이미 발행된 거래명세서의 합계)에는 영향이 없었음 — 그래도 "표시 버그"가 사용자에게는 "계산이 잘못됐다"는 신뢰 문제로 보일 수 있으므로 심각도를 낮게 보지 말 것

---

*생성일: 2026. 5. 26. | 새 스킬 확립 시 이 파일에 추가*
