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
| SKILL-24 | React useEffect 안에서 prop 바뀔 때 setState로 되돌리기 — 린트가 막음, key 재마운트로 대체 | ✅ 2026-07-22 |
| SKILL-25 | Playwright로 모달/다이얼로그 내부 검증 시 컨테이너로 스코프 필수 + input 값은 inputValue()로 | ✅ 2026-07-22 |
| SKILL-26 | 수천 행 표는 가상 스크롤(윈도잉) 필수 — 필터 재계산이 아니라 DOM 렌더링 자체가 병목 | ✅ 2026-07-23 |
| SKILL-27 | 단가마스터에 필드 추가 시 하드코딩된 컬럼 리스트가 5곳에 흩어져 있어 전부 찾아 고쳐야 함 | ✅ 2026-07-24 |
| SKILL-28 | git repo root가 작업 폴더 한 단계 위 + HEAD가 여러 세션치 미커밋 변경으로 낡음 — `git show HEAD`로 회귀 검증 시 함정 | ✅ 2026-07-24 |
| SKILL-29 | 완성된 여러 개의 단일시트 xlsx를 표지/코멘트 없이 하나의 다중시트 워크북으로 합치기 (zipfile, 스타일 재넘버링 불필요 전제) | ✅ 2026-07-29 |
| SKILL-30 | 같은 원본 행이 여러 그룹에 중복 표시될 수 있으면 선택 Set·React key를 반드시 복합키로 | ✅ 2026-07-29 |
| SKILL-31 | flex-col 안에서 `overflow-auto` 표 컨테이너에 `flex-1`이 없으면, 옆의 동적 길이 목록이 길어질 때 표가 화면 밖으로 밀려 안 보일 수 있음 | ✅ 2026-07-29 |
| SKILL-32 | 1:N 관계가 된 엔티티를 낙관적 업데이트로 "되돌리기"할 때, 사업키 단독이 아니라 다른 쪽에 아직 남아있는지 확인 후 되돌릴 것 | ✅ 2026-07-29 |
| SKILL-33 | 거래처 단위 설정값을 "대표 행 하나"만 조회해서 판정하면, 그 대표 행이 없는 케이스에서 조용히 기본값으로 새는 버그가 생김 — 실제 사용된 모든 행을 모아 일관성 검사할 것 | ✅ 2026-08-04 |
| SKILL-34 | 여러 PC가 동시에 쓰는 화면은 `useRef`로 "비활성→활성 전환" 시점만 잡아 탭 클릭 시 백그라운드 재조회 | ✅ 2026-08-09 |
| SKILL-35 | 신규 컬럼 추가 시 다른 테이블의 기존 컬럼과 이름이 겹치지 않는지 먼저 확인(예: ENUM 상태값 컬럼과 표시용 텍스트 컬럼) | ✅ 2026-08-11 |
| SKILL-36 | React effect에서 호출하는 함수는 반드시 그 effect보다 먼저 선언할 것 — JS 호이스팅은 되지만 이 프로젝트 린트가 "사용 전 선언"을 강제함 | ✅ 2026-08-12 |
| SKILL-37 | upsert 이력 테이블에서 "가장 최근 배치"만 골라내기 — 별도 배치ID 컬럼 없이 `등록일 = (SELECT MAX(등록일) ...)` 서브쿼리로 같은 확정에 갱신된 행끼리 묶기 | ✅ 2026-08-12 |
| SKILL-38 | 세로 스크롤(`overflow-y-auto`) 컨테이너 안의 검색 드롭다운은 `absolute`만으론 잘림 — `createPortal`+`getBoundingClientRect()`로 뷰포트 기준 `position: fixed` 좌표를 계산하고, 화면 하단 공간이 부족하면 위쪽으로 자동 반전 | ✅ 2026-08-16 |
| SKILL-39 | 신규 컬럼 추가 시 "실시간 수신 전용" 서버(사무실 PC)는 과거 이력이 자동으로 안 채워짐 — 배치 재적재(로컬 PC의 엑셀 원본 재실행)로 백필 필요하나, 사내망은 pip 설치 사이트가 막혀있을 수 있어 배포 전 관련 패키지(예: openpyxl) 설치 가능 여부 확인 | ✅ 2026-08-16 (IT 담당자 예외 처리로 openpyxl 설치 성공 + 백필 완료) |
| SKILL-40 | 여러 항목을 순회하며 집계할 때, 스칼라 합계는 반복문 안에서 누적하면서 세부 딕셔너리는 반복문 밖에서 마지막 값만 재사용하면 나머지 항목이 조용히 누락됨 — 단일 항목 테스트로는 드러나지 않음 | ✅ 2026-08-17 |
| SKILL-41 | "총량 유지 + 비율로만 배분" 헬퍼는 자재단가 미등록(미매칭) 항목도 라벨을 붙이면, 실제 금액은 같아도 원본 표 행이 자재 종류 수만큼 쪼개지는 회귀가 생김 — 미매칭은 기존 _자재별_처리()처럼 라벨 없는 기본단가 한 줄로 합칠 것 | ✅ 2026-08-17 |
| SKILL-42 | 같은 금액 계산 로직을 "요약용"과 "확정용" 두 함수가 각자 따로 구현하고 있으면, 계산 규칙이 바뀔 때 한쪽만 갱신되고 다른 쪽은 옛 로직으로 남아 화면 간 금액이 어긋남 — 공유 헬퍼 함수로 추출해 두 곳이 항상 같은 코드를 타게 할 것 | ✅ 2026-08-20 |
| SKILL-43 | 신규 데이터 컬럼 여러 개가 "합산"인지 "같은 값이 반복 표시"(OR-flag)인지는 반드시 실사례로 먼저 검증할 것 — 한 물건이 여러 공정을 동시에 거치면 관련 컬럼 각각에 같은 건수가 반복되는 경우, 그대로 합치면 물량이 배로 부풀거나 이중 청구됨 | ✅ 2026-08-21 |
| SKILL-44 | "총량 - 기준값" 형태의 차감식 폴백 계산은, 기준값이 반제품 처리 등으로 강제 0이 될 수 있는 경우 반드시 "기준값이 0이면 결과도 0" 가드를 넣을 것 — 안 넣으면 봉투 삽입 자체가 없는 작업(반제품·제본단독 발송)에서 총량 전체가 그대로 "초과분"으로 계산돼 대규모 과다청구로 이어짐(billing.py에 2026-07-19부터 있던 결함, 로컬 3개월치 회귀 스캔에서 2,406개 그룹 영향 확인) | ✅ 2026-08-22 |

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

## SKILL-24. React `useEffect` 안에서 prop 바뀔 때 `setState`로 되돌리기 — 린트가 막음, `key` 재마운트로 대체

**목적:** "부모가 준 데이터(prop)가 바뀌면 로컬 state를 그 값으로 리셋한다" 패턴을 `useEffect(() => { setXxx(...) }, [prop])`로 짜면 `react-hooks/set-state-in-effect` 린트 규칙이 에러로 막는다(캐스케이딩 리렌더 방지 목적) — 거래명세서 편집 화면(`InvoicePreviewDialog.tsx`·`ConditionRuleModal.tsx`)에서 실제로 걸림(2026-07-22)

**검증 상태:** ✅ 완료 (`npx eslint .` 클린 확인)

**문제 상황:**
```tsx
// 나쁜 예 — data가 바뀔 때마다 rightRows를 되돌리려고 함, 린트 에러
useEffect(() => {
  if (!open || !data) return;
  setRightRows(data.규칙적용결과.map(...));
}, [open, data]);
```

**해결 패턴 — 부모가 `key`로 통째로 재마운트시키고, 자식은 `useState` 초기화 함수에서 한 번만 계산:**
```tsx
// 자식(InvoicePreviewDialog.tsx) — 초기값을 함수로 계산, effect 없음
const [rightRows, setRightRows] = useState<편집행[]>(() => 초기_rightRows(data));

// 부모(Tab4Invoice.tsx) — 새 미리보기를 받을 때마다 seq를 올려서 key로 전달
const [previewSeq, setPreviewSeq] = useState(0);
// ... setPreviewData(data); setPreviewSeq((s) => s + 1); setPreviewOpen(true);
<InvoicePreviewDialog key={previewSeq} data={previewData} ... />
```
모달처럼 "열림/닫힘"이 있는 컴포넌트는 조건부 렌더링(`{modalOpen && <Modal .../>}`)만으로도 충분함 — 언마운트→마운트가 매번 일어나므로 별도 `key` 없이도 `useState` 초기화 함수가 항상 최신 `initial` prop으로 다시 계산됨(`ConditionRuleModal.tsx`가 이 방식).

**주의사항:**
- 이 패턴이 필요한지 먼저 의심할 것 — 진짜로 "완전히 새로운 세션으로 리셋"이 맞는 경우에만 쓰고, "부분적으로만 업데이트"하고 싶다면 애초에 `useEffect`+`setState` 자체가 필요 없는 경우가 많음(파생값은 렌더 중 직접 계산하거나 `useMemo`)
- ESC 키 리스너처럼 "구독만 하고 이벤트 콜백 안에서 setState"하는 effect는 이 규칙에 안 걸림 — 규칙은 **effect 본문에서 곧바로(동기적으로)** `setState`를 호출하는 경우만 막음
- **데이터 fetch effect에도 적용됨(2026-07-22 추가 확인):** "네트워크 호출은 외부 시스템과의 동기화라 괜찮겠지"라고 생각하고 `useEffect(() => { setLoading(true); fetch(...).then(...) }, [id])`처럼 맨 앞에 `setLoading(true)`를 동기 호출했더니 `InvoiceHistoryDialog.tsx`에서 똑같이 걸림 — fetch 자체(비동기 콜백 안의 setState)는 문제 없지만, effect 본문 맨 앞의 **동기적** `setLoading(true)`/`setError(null)`만 따로 걸러서 잡아냄. 이 컴포넌트도 SKILL-24 패턴대로 부모가 매번 새로 마운트해준다면, `useState(true)`/`useState(null)`처럼 애초에 그 값으로 초기화해두고 effect에서는 그 두 줄을 아예 지우면 됨(부모가 매번 재마운트하므로 "리셋"이 필요 없어짐)

---

## SKILL-25. Playwright로 모달/다이얼로그 내부 검증 시 컨테이너로 스코프 필수 + `input` 값은 `inputValue()`로

**목적:** 이 프로젝트는 오버레이 모달(`fixed inset-0`)을 띄워도 뒤의 페이지(다른 탭 포함, SKILL-17의 상시 마운트 구조)가 DOM에서 사라지지 않아 `:visible`만으로는 부족한 경우가 있음 — 거래명세서 편집 화면의 좌우 2단 표를 Playwright로 검증하다 실제로 걸림(2026-07-22)

**검증 상태:** ✅ 완료

**문제 상황:**
- `page.locator("table:visible").nth(1)`처럼 짜면, 모달 뒤에 깔린 5000행짜리 미발행목록 표까지 `:visible`(뒤에 있어도 화면에 그려지고는 있으므로) 후보에 포함돼 엉뚱한 표를 짚음
- `<input type="number" value={...}>`의 값은 `element.innerText()`/`textContent`에 절대 안 잡힘(폼 컨트롤 값은 DOM 텍스트가 아니라 별도 `value` 프로퍼티) — `innerText()`로 셀 내용을 검증하면 숫자 칸은 항상 빈 문자열로 보여서 "계산이 안 됐다"는 오탐이 남

**해결 패턴:**
```js
// 모달 자체를 먼저 찾아 그 안에서만 검색 (텍스트로 컨테이너 특정)
const dialog = page.locator("div.fixed.z-50", { hasText: "거래명세서 미리보기 · 편집" });
const rightTable = dialog.locator("table").nth(1);

// 표 안의 문자(라벨 등)는 innerText(), 숫자 입력칸은 반드시 inputValue()
const 라벨 = await rightTable.locator("tbody tr").first().innerText();
const 수량 = await rightTable.locator("tbody tr").first().locator('input[type="number"]').nth(0).inputValue();
```

**주의사항:**
- 로그인 화면을 매번 실제 비밀번호로 거치기 어려우면(비개발자 프로젝트라 테스트 계정 비밀번호를 안 외워도 됨), `scripts/auth.py`의 `토큰_발급()`으로 JWT를 직접 만들어 `context.addCookies([{name:"session_token", value: token, httpOnly:true, sameSite:"Lax", path:"/", domain:"localhost"}])`로 주입하면 실제 로그인 폼 없이 인증된 세션으로 바로 테스트 가능(SKILL-17과 동일 계정 발급 방식)
- 검증용으로 만든/저장한 규칙·의뢰서 선택 등은 실제 DB에 쓰지 않는 액션(모달 "취소"로 닫기 등)까지만 자동화하고, 실제 저장(확정)까지 필요하면 반드시 테스트 데이터 정리(취소/삭제)까지 스크립트에 포함할 것(SKILL-20 회귀 검증과 동일 원칙)

---

## SKILL-26. 수천 행 표는 가상 스크롤(윈도잉) 필수 — 필터 재계산이 아니라 DOM 렌더링 자체가 병목

**목적:** 필터링 로직(`useMemo`·`filter`)은 가볍다고 확인됐는데도 화면이 몇 초~몇십 초씩 멈추는 원인이, 사실은 "필터링된 결과 전체를 실제 `<tr>` DOM으로 한꺼번에 그리는 렌더링" 쪽이었던 사례. 미발행 목록 표(수천 행)에서 실제로 발견·해결됨(2026-07-23, 사용자 제보: 사업부→담당자 필터 연속 선택 시 43초 멈춤)

**검증 상태:** ✅ 완료

**문제 상황:**
- 코드 리뷰만으로는 "필터는 배열 `filter` 몇 번뿐이라 안 느릴 것"이라고 오판하기 쉬움 — 실제로 Playwright로 운영 모드(빌드) 기준 재현해보니 필터 선택 자체는 0.3~0.6초로 빨랐고, **탭을 처음 열어 4,600여 건을 한 번에 그리는 최초 렌더링이 9초** 걸리고 있었음(개발 모드였다면 더 오래 걸림 — 사용자가 겪은 43초는 이 9초짜리 렌더링이 끝나기 전에 필터를 연달아 눌러 재렌더링이 겹쳐 쌓인 결과로 추정)
- "테이블 자체가 병목"이라는 가설은 코드만 봐서는 확신하기 어려움 — Playwright로 실제 DOM `<tr>` 개수(`page.locator("table:visible tbody tr").count()`)를 재기 전까지는 "필터 재계산"과 "DOM 렌더링" 중 무엇이 원인인지 구분이 안 됨

**해결 패턴 — 외부 라이브러리 없이 고정 행 높이 가상 스크롤 직접 구현(`frontend/lib/useVirtualRows.ts`):**
```ts
// scroll·resize에 반응해 지금 보여야 할 [start, end) 인덱스 범위만 계산 (overscan 여유분 포함)
// 행 높이는 하드코딩 대신 콜백 ref로 실제 첫 행을 실측해 보정 — useEffect(무조건 실행)로
// 만들면 "무한 갱신 가능성" eslint 경고(react-hooks/exhaustive-deps)가 뜨므로, 콜백 ref로
// "DOM에 새로 붙는 순간에만" 실행되게 만들어 경고 자체를 피함
const firstRowRef = useCallback((node: HTMLTableRowElement | null) => {
  if (!node) return;
  const h = node.getBoundingClientRect().height;
  if (h > 0) setRowHeight((prev) => (Math.abs(h - prev) > 0.5 ? h : prev));
}, []);
```
```tsx
// <tbody> — 전체 rows.map() 대신 슬라이스만 렌더링 + 스페이서 <tr> 2개로 스크롤바 크기 유지
{range.start > 0 && <tr style={{ height: range.start * rowHeight }}><td colSpan={COL_COUNT} /></tr>}
{rows.slice(range.start, range.end).map((r, i) => <Row key={r.id} ... />)}
{range.end < rows.length && <tr style={{ height: (rows.length - range.end) * rowHeight }}><td colSpan={COL_COUNT} /></tr>}
```

**주의사항:**
- 스페이서 `<tr>`은 반드시 `<td colSpan={전체컬럼수}>`를 넣을 것 — `<tr>`에 `<td>` 없이 `style={{height}}`만 주면 일부 브라우저에서 높이가 무시될 수 있음
- 필터가 바뀌어 `rowCount`가 줄어들면(예: 4,605→1,211건) 이전 스크롤 위치가 새 목록 길이보다 아래일 수 있어 빈 화면만 보임 — `rowCount` 변경 시 스크롤을 맨 위로 리셋해야 함
- 선택 상태(`Set<string>`)·"전체 선택" 로직은 항상 필터링된 **전체** `rows` 기준으로 유지하고, 가상 스크롤은 오직 "무엇을 화면에 그릴지"만 건드릴 것 — 어떤 행이 선택됐는지는 DOM 마운트 여부와 완전히 무관해야 함(Playwright로 스크롤 후에도 "선택 N건" 요약이 유지되는지 확인해 검증)
- `React.memo` 행 컴포넌트 최적화(SKILL 기존 패턴)와 가상 스크롤은 상호 보완적 — 가상 스크롤이 "몇 개를 그릴지"를 줄이고, `memo`가 "그중 몇 개를 다시 그릴지"를 줄임. 둘 다 필요하면 함께 적용

---

## SKILL-27. 단가마스터에 필드 추가 시 하드코딩된 컬럼 리스트가 5곳에 흩어져 있어 전부 찾아 고쳐야 함

**목적:** "동봉물삽입단가" 필드를 단가마스터에 추가하는 작업(2026-07-24) 중, DB 스키마·API·프론트엔드 각 계층에서 단가 컬럼 이름을 하드코딩한 리스트가 여러 곳에 독립적으로 존재해 하나라도 빠뜨리면 "화면·API는 정상으로 보이는데 실제 계산에는 항상 0으로 적용되는" 조용한 버그가 생기는 것을 발견

**검증 상태:** ✅ 완료

**문제 상황:**
- 새 단가 필드를 추가할 때 "DB 컬럼 추가 + API 모델 추가 + 프론트 타입 추가"만 하면 될 것 같지만, 이 프로젝트는 MariaDB(Next.js용)와 SQLite(Streamlit용) **두 개의 완전히 별도인 데이터 계층**을 가지고 있고, 각 계층 안에서도 "단가 컬럼 목록"을 하드코딩한 지점이 여러 개 독립적으로 존재함
- 실제로 놓쳐서 발견된 지점: `scripts/billing.py`의 `build_단가맵()`(MariaDB·SQLite 공용, DB에 컬럼이 있어도 이 하드코딩 리스트에 없으면 결과 dict에서 조용히 빠짐) — 여기서 빠지면 `rates.get(필드, 0)`이 항상 0을 반환해 **계산 결과가 소리 없이 틀어짐** (에러가 안 나서 발견이 늦어짐)
- SQLite 쪽은 `scripts/app.py`에 `billing.build_단가맵()`과는 별개인 자체 컬럼 리스트가 **2곳**(`load_단가마스터()`, 탭4 공용 단가맵 생성부) 더 있었음 — MariaDB 쪽만 고치고 배포 검증까지 마쳐도, 로컬에서 Streamlit을 실행하는 순간 바로 계산이 달라짐(별도 배포 없이 즉시 영향받음)

**전체 지점 목록(신규 단가 필드 추가 시 전부 확인):**
```
1. scripts/init_db_mariadb.py   — 단가마스터 CREATE TABLE DDL + migrate() 마이그레이션(ALTER TABLE)
2. scripts/init_db.py           — SQLite 단가마스터 CREATE TABLE + migrate_단가마스터_컬럼()
3. scripts/billing.py           — build_단가맵()의 하드코딩 컬럼 리스트 (MariaDB·SQLite 공용, 가장 놓치기 쉬움)
4. scripts/api.py               — 단가마스터_신규/수정 Pydantic 모델 + POST/PUT SQL문
5. scripts/app.py               — load_단가마스터() 컬럼 리스트, 탭4 공용 단가맵 생성부, 단가관리 화면(표시/수정폼/추가폼) + INSERT/UPDATE SQL문
6. frontend/components/Dashboard.tsx           — 단가행 타입
7. frontend/app/page.tsx                        — loadPricing() 매핑
8. frontend/components/PricingFormDialog.tsx    — 가격필드 타입·목록·초기 state·payload
9. frontend/components/PricingMaster.tsx        — handleUpdated의 Pick<단가행,...> 타입(별도로 또 있음)
10. frontend/components/PricingMasterTable.tsx  — 표 컬럼
```

**주의사항:**
- 새 필드 추가 후 **반드시 실제 데이터로 `billing.build_단가맵()`을 직접 호출**해 결과 dict에 새 필드가 포함되는지 확인할 것(Python REPL/스크립트로 몇 줄이면 됨) — 화면·API 응답만 보고 "정상"이라 판단하면 이런 종류의 버그는 못 잡음(값이 0인 것과 필드가 아예 없는 것이 화면상 똑같아 보이기 때문)
- 마이그레이션으로 기존 데이터에 기본값(0 또는 다른 필드 값으로 백필)을 넣을 때는, MariaDB(`init_db_mariadb.py`)와 SQLite(`init_db.py`) **양쪽 다** 빠짐없이 실행해서 두 DB의 값이 실제로 일치하는지 SQL로 직접 확인할 것

---

## SKILL-28. git repo root가 작업 폴더 한 단계 위 + HEAD가 여러 세션치 미커밋 변경으로 낡음

**목적:** SKILL-20(계산 로직 리팩터링 회귀 검증, `git show HEAD:...` 방식)을 그대로 적용했다가 엉뚱한 "회귀"를 진짜 버그로 오인할 뻔한 함정 기록

**검증 상태:** ✅ 완료

**문제 상황:**
- 이 프로젝트 폴더(`d:\AI\생산공정관리`)는 `git rev-parse --show-toplevel` 결과 `D:/AI`로 나옴 — **git repo root가 프로젝트 폴더 자체가 아니라 한 단계 위**임. 그래서 `git show HEAD:scripts/billing.py`처럼 프로젝트 폴더 기준 상대경로로 쓰면 `fatal: path '생산공정관리/scripts/billing.py' exists, but not 'scripts/billing.py'`로 실패함 — 반드시 `git show "HEAD:생산공정관리/scripts/billing.py"`처럼 상위 폴더를 포함해야 함
- 이 프로젝트는 **커밋을 자주 하지 않는 작업 방식**이라(사용자 확정 없이는 커밋하지 않는 지침과 별개로, 실제로 여러 세션에 걸친 작업이 계속 미커밋 상태로 쌓여있음) HEAD가 최근 며칠~몇 주 치 작업보다도 훨씬 이전 버전을 가리킴
- 2026-07-24 "추가봉입비/동봉물삽입비 분리" 작업의 회귀 검증(SKILL-20 방식)을 시도하다가, `git show HEAD`로 뽑은 "이전" 버전이 **2026-07-22의 각대대봉투 봉입비 버그 수정보다도 이전**이라, 그 수정으로 인한 차이(관련 없는 "봉투제작비" 150원 차이)까지 이번 변경의 회귀인 것처럼 섞여 나와 혼란을 겪음

**주의사항:**
- 이 프로젝트에서 `git show HEAD:...`로 회귀 검증할 때는 항상 `git rev-parse --show-toplevel`로 실제 repo root를 먼저 확인하고, HEAD가 "이번 세션 시작 시점"이 아니라 "마지막으로 커밋된 아주 오래전 시점"이라는 것을 감안할 것
- HEAD 비교로 예상 못 한 차이가 나오면, 그게 **이번에 직접 건드린 부분과 무관한 이전 세션의 미커밋 수정**일 가능성부터 의심하고(`git diff`로 전체 diff를 훑어 변경 구간이 이번 수정과 겹치는지 확인), 진짜 회귀 검증이 필요하면 "이번 세션 시작 직전 상태"를 별도로 백업해두거나 수정된 필드만 골라 수식적으로 보존 여부를 직접 확인하는 방식을 우선 고려할 것

---

## SKILL-29. 완성된 여러 개의 단일시트 xlsx를 하나의 다중시트 워크북으로 합치기

**목적:** 거래명세서 조별 분할발급 통합엑셀 기능(`billing.combine_거래명세서_시트들()`)에서, `write_거래명세서_excel()`이 만든 완성된 xlsx 여러 개를 재계산 없이 그대로 이어붙여 다중시트 워크북 하나로 만드는 패턴

**검증 상태:** ✅ 완료 (2026-07-29, 실제 3개 파일 병합 + openpyxl로 시트명·도장 이미지·Print_Area 확인)

**핵심 전제(반드시 사전 확인):** 합칠 파일들이 전부 **같은 템플릿에서 나오고, 생성 코드가 셀 값만 바꿀 뿐 스타일·공유문자열·이미지는 절대 건드리지 않는 경우**에만 이 패턴이 통한다 — 이 전제가 없으면 styles.xml의 스타일 인덱스(`s="N"`)가 파일마다 다른 의미를 가져 재넘버링이 필요해지고 훨씬 복잡해진다. 적용 전 `zipfile.namelist()`로 실제 내부 구조를 덤프해 전제를 확인할 것.

**핵심 로직:**
```python
# 1. 첫 파일을 컨테이너로 재사용 — styles.xml·theme·sharedStrings·이미지·printerSettings 그대로 공유
base = dict(file_maps[0])

# 2. 표지 시트·코멘트·vmlDrawing처럼 고객에게 안 보일 내부용 파트는 컨테이너에서 제거
#    (Content_Types Override·workbook.xml.rels Relationship·<sheets> 항목도 함께 제거해야
#    dangling reference로 Excel이 "복구" 프롬프트를 띄우지 않는다)

# 3. 각 시트의 legacyDrawing(VML 코멘트) 관계는 rId 번호를 하드코딩하지 말고
#    Type 문자열(".../vmlDrawing", ".../comments")로 찾아서 제거 — 파일마다 rId 숫자가
#    같다는 보장이 없어도 안전하게 동작

# 4. 두 번째 파일부터: sheetN.xml·drawingN.xml·각각의 rels 파일을 새 이름으로 복사
#    - drawing 내부의 이미지 관계(rId1→image1.png 등)는 그대로 유지 — 이미지 자체가
#      모든 파일에서 동일하므로 media 폴더 파일을 새로 복사할 필요 없이 공유
#    - printerSettings도 동일한 이유로 공유 재사용

# 5. workbook.xml 재구성 — <sheets> 블록을 통째로 새로 만들어 교체(개별 태그 수정보다
#    훨씬 단순), Print_Area definedName도 시트 수만큼 새로 만들어 localSheetId를
#    새 시트 인덱스(0-based)로 교정
sheets_block = "".join(f'<sheet name="{esc(name)}" sheetId="{1000+i}" r:id="{rid}"/>' for i, (name, rid) in enumerate(entries))
wb_xml = re.sub(r'<sheets>.*?</sheets>', f'<sheets>{sheets_block}</sheets>', wb_xml, flags=re.DOTALL)
```

**주의사항:**
- Content_Types의 Override 태그를 정규식으로 제거할 때 `[^/]*`로 "끝까지"를 잡으면 안 됨 — `ContentType` 값 자체에 `/`가 포함돼 있어(`application/vnd...`) 첫 `/`에서 멈춰버림. 반드시 `[^>]*`(태그의 `>`까지)를 사용할 것
- 시트명은 Excel 규칙(31자 제한, `[]:*?/\'` 등 금지문자, 중복 불가)에 맞게 정리 — 중복되면 "(2)" 같은 접미사로 자동 회피
- sheetId는 서로 다른 양의 정수이기만 하면 되고 원래 값(236, 237 등)을 유지할 필요 없음 — `1000+인덱스`처럼 단순하게 새로 부여해도 무방
- `openpyxl.load_workbook()`으로 열어 시트 목록·`ws.print_area`·이미지 개수(`ws._images`)를 확인하는 것만으로 1차 구조 검증이 충분히 가능 — 실제 Excel 없이도 자동화된 단위 테스트 작성 가능

---

## SKILL-30. 같은 원본 행이 여러 그룹에 중복 표시될 수 있으면 선택 Set·React key를 반드시 복합키로

**목적:** 거래명세서 조별 분할발급 기능 추가 중, "의뢰서 하나가 거래명세서 여러 개에 동시에 속할 수 있음"이라는 새 상태를 기존 화면(발행요청목록/발행완료)에 반영하다가 발견한 선택 상태·React key 충돌 문제

**검증 상태:** ✅ 완료 (2026-07-29)

**문제 상황:**
- `GET /발행목록`이 원래 "의뢰서번호 1개 = 거래명세서 1개"를 전제로 `{업무의뢰서번호: (거래명세서번호,...)}` 형태의 dict로 매핑하고 있었음 — 조별 분할발급이 도입되면서 의뢰서 하나가 거래명세서 여러 개(1조·2조 등)에 동시에 속하게 되자, 이 dict가 마지막 값만 남기고 나머지를 조용히 덮어써서 화면에서 사라지는 버그가 됨(사용자 확인 후 "의뢰서를 거래명세서별로 각각 중복 표시"로 해결 — API가 의뢰서번호별 튜플을 리스트로 반환하도록 변경)
- 화면에 같은 의뢰서번호가 2개 행(서로 다른 거래명세서번호)으로 나타나게 되자, 프론트엔드의 레벨2 선택 상태(`Set<string>`)와 React `key` prop이 전부 **의뢰서번호 단독**을 키로 쓰고 있던 것이 그대로 충돌로 이어짐 — 한 행을 체크하면 다른 행도 똑같이 체크된 것처럼 보이고(같은 Set 키), React가 두 `<tr>`을 같은 `key`로 취급해 렌더링이 뒤섞일 위험이 있었음. 더 심각하게는 "선택한 의뢰서만 취소"(부분취소) 로직이 이 충돌된 Set으로 대상을 필터링해서, 사용자가 한 그룹의 의뢰서만 선택해도 다른 그룹의 동일 의뢰서까지 취소 대상에 함께 걸려버리는 **데이터 안전 문제**로 이어질 뻔했음

**핵심 규칙:**
```typescript
// 나쁜 예 — 의뢰서번호만으로 선택 Set·React key를 삼음
<tr key={r.의뢰서번호}>...
const checked = selected.has(r.의뢰서번호);

// 좋은 예 — "이 화면에서 실제로 구분돼야 하는 단위"(거래명세서번호+의뢰서번호)를 복합키로
function 레벨2키(r: { 거래명세서번호: string; 의뢰서번호: string }) {
  return `${r.거래명세서번호}::${r.의뢰서번호}`;
}
<tr key={레벨2키(r)}>...
const checked = selected.has(레벨2키(r));
```

**주의사항:**
- 다른 화면(예: `InvoiceDetailTable`)이 여전히 "순수 의뢰서번호 목록"을 필요로 하면, 복합키 Set을 그대로 넘기지 말고 그 자리에서 `.split("::")`(또는 `slice(indexOf("::")+2)`)로 원래 의뢰서번호만 추출해 넘길 것 — 복합키는 딱 "충돌 나는 화면" 안에서만 쓰고 그 경계를 넘기지 않는 것이 안전
- 이런 문제는 백엔드가 "1:1"이라고 가정하던 관계를 "1:N"으로 바꾸는 변경(이번 경우 의뢰서:거래명세서)을 할 때마다 잠재적으로 생김 — 새 1:N 관계를 도입하면, 그 관계의 "N" 쪽 값을 화면에 보여주는 모든 곳에서 선택 상태·리스트 key가 여전히 "1" 쪽 값(여기서는 의뢰서번호)만으로 유일성을 가정하고 있지 않은지 함께 점검할 것

---

## SKILL-31. flex-col 컨테이너 안의 `overflow-auto` 표는 반드시 `flex-1 min-h-0`을 줄 것

**목적:** 거래명세서 미리보기 화면에서 "조건 규칙을 추가했는데 표에 안 보인다"는 실사용 제보를 조사하다가 발견한 flex 레이아웃 함정 — 데이터는 정상이었고 원인은 순전히 CSS였음

**검증 상태:** ✅ 완료 (2026-07-29)

**문제 상황:**
- `InvoicePreviewDialog.tsx`의 오른쪽 컬럼이 `<div className="flex flex-col overflow-hidden">` 안에 "제목+버튼 줄 → 안내문구 → **표(overflow-auto)** → 미분류 경고 박스" 순서로 쌓여 있었는데, 표 컨테이너 자체에는 `flex-1`이 없어 기본값(`flex-shrink: 1, flex-grow: 0`)으로 동작하고 있었음
- 원본 항목이 53건, 그중 51건이 "어느 규칙에도 안 걸린 항목"으로 분류돼 그 목록 박스가 51줄짜리 세로로 긴 콘텐츠가 됨 → `flex-grow`가 없는 표는 남는 공간을 더 차지하러 들지 않고 자기 콘텐츠 크기(이 경우 규칙 1개 행)만큼만 차지 → 정작 새로 만든 규칙 행이 좁은 영역에 눌려(또는 실질적으로 화면에서 밀려) 사용자 눈에는 "규칙이 안 보인다"로 보임
- 데이터·계산 로직(조건 매칭, `rightRows` 상태)은 전혀 문제가 없었음 — 브라우저 콘솔 오류도 없었고, 순수하게 형제 요소(미분류 박스)가 길어지면서 표 영역의 실제 렌더링 공간이 밀려난 CSS 문제였음

**핵심 규칙:**
```jsx
// 나쁜 예 — flex-col 안의 표 컨테이너에 grow 지정이 없음
<div className="flex flex-col overflow-hidden">
  <h3>제목</h3>
  <div className="overflow-auto rounded-md border">...표...</div>
  <div>동적으로 길어질 수 있는 다른 콘텐츠(경고 목록 등)</div>
</div>

// 좋은 예 — 표 컨테이너가 항상 남는 공간을 우선 차지하도록 flex-1 + min-h-0
<div className="flex flex-col overflow-hidden">
  <h3>제목</h3>
  <div className="min-h-0 flex-1 overflow-auto rounded-md border">...표...</div>
  <div>동적으로 길어질 수 있는 다른 콘텐츠</div>
</div>
```

**주의사항:**
- `min-h-0`을 빼먹으면 `flex-1`을 줘도 flex item의 기본 `min-height: auto`(콘텐츠 크기만큼 최소 높이 보장) 때문에 여전히 컨테이너가 넘칠 수 있음 — `overflow-auto`로 내부 스크롤을 의도한 flex item에는 `flex-1`과 `min-h-0`을 항상 짝으로 줄 것
- 이런 버그는 평소 테스트 데이터가 적을 때(미분류 항목 몇 건)는 전혀 드러나지 않다가, 실사용 데이터(원본 53건처럼)로 형제 콘텐츠가 충분히 길어져야만 재현됨 — "표 영역이 비어 보인다"는 제보를 받으면 데이터/로직보다 먼저 **형제 요소가 유난히 길어진 상태인지**부터 의심해볼 것
- 같은 다이얼로그의 왼쪽(원본) 표 컨테이너도 동일한 문제를 안고 있었으므로 좌/우 둘 다 함께 고쳤음 — 비슷한 2단 레이아웃을 가진 다른 화면(있다면)도 같은 패턴인지 점검할 가치가 있음

---

## SKILL-32. 1:N 관계가 된 엔티티를 낙관적 업데이트로 "되돌리기"할 때, 다른 쪽에 남아있는지 확인 후 되돌릴 것

**목적:** 거래명세서 조별 분할발급 배포 후, "발행요청목록에서 분할발급된 의뢰서를 전부 취소했더니 미발행목록에 중복으로 나타난다"는 실사용 제보로 발견한 낙관적 UI 업데이트 버그

**검증 상태:** ✅ 완료 (2026-07-29)

**문제 상황:**
- SKILL-30에서 이미 "의뢰서:거래명세서" 관계가 1:1에서 1:N으로 바뀌면서 **선택 상태·React key**를 복합키로 고쳤는데, 같은 화면의 **취소(되돌리기) 처리 로직**은 놓치고 있었음 — `Tab4IssuedList.tsx`의 `executeCancel()`이 "취소 성공한 항목"을 의뢰서번호만으로 추적해 `onReturnToUnissued()`에 넘기고 있었음
- 조별 분할발급으로 의뢰서 하나가 거래명세서 2건(1조·2조)에 동시에 걸린 상태에서, 사용자가 두 건을 각각 선택해 취소하면 `executeCancel()`이 같은 의뢰서를 "취소 성공"으로 **두 번** 기록 → 미발행 목록에 그 의뢰서를 두 번 추가(중복 표시). 반대로 **한 건만** 취소하면, 아직 안 지워진 다른 거래명세서의 같은 의뢰서까지 의뢰서번호 기준 필터링에 걸려 화면에서 함께 사라져버리는 문제도 있었음(서버 데이터는 멀쩡한데 화면만 틀어짐)
- 근본 원인: "이 사업키(의뢰서번호)가 이제 완전히 사라졌는가?"를 판단할 때 **방금 처리한 항목만** 보고 판단했을 뿐, **그 사업키를 가진 다른 살아있는 레코드가 여전히 있는지**는 확인하지 않았음

**핵심 규칙:**
```typescript
// 나쁜 예 — 의뢰서번호만으로 "취소됨" 여부를 판단
const 성공id = new Set(성공행.map((r) => r.의뢰서번호));
setRows((prev) => prev.filter((r) => !성공id.has(r.의뢰서번호)));      // 다른 거래명세서의 같은 의뢰서까지 삭제될 수 있음
onReturnToUnissued(성공행.map(...));                                    // 같은 의뢰서가 중복으로 추가될 수 있음

// 좋은 예 — ①실제로 처리한 (거래명세서번호,의뢰서번호) 조합만 정확히 제거
//         ②그 사업키가 "전체 목록" 안에 다른 조합으로 여전히 남아있는지 확인한 뒤에만 되돌림
const 취소된키 = new Set(성공행.map(레벨2키));                          // SKILL-30의 복합키 재사용
setRows((prev) => prev.filter((r) => !취소된키.has(레벨2키(r))));
const 남은의뢰서번호 = new Set(rows.filter((r) => !취소된키.has(레벨2키(r))).map((r) => r.의뢰서번호));
const 완전취소됨 = new Map<string, T>();
for (const r of 성공행) {
  if (!남은의뢰서번호.has(r.의뢰서번호) && !완전취소됨.has(r.의뢰서번호)) 완전취소됨.set(r.의뢰서번호, r);
}
onReturnToUnissued(Array.from(완전취소됨.values()).map(...));           // 중복 없이, 완전히 사라진 것만
```

**주의사항:**
- "확정"(생성) 쪽의 낙관적 업데이트도 대칭적으로 점검할 것 — `Tab4Invoice.tsx`의 확정 처리가 분할발급 시 서버가 돌려주는 `거래명세서번호_목록`(그룹 수만큼) 전부를 반영하지 않고 첫 번호 하나로만 태그하고 있어서, 새로고침 전후로 화면에 보이는 건수가 달라지는 불일치가 있었음 — 생성 쪽도 서버가 실제로 몇 건을 만들었는지(1건이 아닐 수 있음)를 그대로 반영해야 새로고침해도 화면이 똑같이 보인다
- SKILL-30(선택 Set·React key)과 이 스킬(낙관적 업데이트로 되돌리기)은 **같은 원인**(1:1 가정이 1:N으로 깨짐)에서 나온 **서로 다른 증상**이다 — 한쪽을 고쳤다고 다른 쪽도 저절로 고쳐지지 않으므로, 1:N 관계를 새로 도입하면 그 값을 다루는 모든 화면 로직(선택·필터·삭제·복구·집계)을 전부 훑어서 "혹시 1:1을 가정한 곳이 더 있는지" 점검할 것

---

## SKILL-33. 거래처 단위 설정값은 "대표 행 하나"가 아니라 실제 사용된 모든 행으로 판정

**목적:** 부가세 포함/별도 판정 버그(KB국민카드 — 실제론 전부 "포함"인데 항상 "별도"로 계산됨)로 발견한, "거래처마다 값이 하나여야 하는 설정"을 잘못된 방법으로 조회하던 문제

**검증 상태:** ✅ 완료 (2026-08-04)

**문제 상황:**
- `단가마스터.부가세구분`은 "이 거래처와의 계약이 포함/별도인가"라는 **거래처 단위** 설정인데, 코드(`billing.부가세_계산()`)는 이 값을 조회할 때 **업무명·작업명이 둘 다 빈 "기본단가" 행 하나만** 봤음(개념상 "거래처 전체에 적용되는 대표 행"이라 판단해서)
- 그런데 실제 거래처 중에는 기본단가 행 자체를 안 만들고 업무명별 예외 단가 행만 등록해둔 곳(KB국민카드)이 있었음 — 이 경우 조회가 항상 실패(`None`)해서 기본값("별도")으로 조용히 새어버림. 예외 행 6건 전부 "포함"으로 정확히 저장돼 있었는데도 실제 계산에는 전혀 반영되지 않음
- 이런 버그는 **테스트로 잡기 어렵다** — 기본단가 행이 있는 "정상적인" 거래처로 테스트하면 전혀 드러나지 않고, 기본단가 행을 등록 안 한 특정 거래처를 실제로 청구해봐야만 나타남

**핵심 규칙:**
```python
# 나쁜 예 — 대표 행 하나만 보고 판정, 그 행이 없으면 조용히 기본값으로 샘
rates = 단가맵.get((거래처명, None, None)) or {}
구분 = rates.get("부가세구분") or "별도"

# 좋은 예 — 실제로 이번에 청구되는 모든 작업명이 매칭되는 행을 전부 모아서 판정
# (build_품목행()의 기존 3단계 폴백 루프 안에서 매칭될 때마다 함께 수집)
부가세구분맵 = {}  # {작업명: "포함"/"별도"}
for 작업, rates in 매칭된_행들:
    부가세구분맵[작업] = rates.get("부가세구분") or "별도"

# 전부 같으면 그 값, 섞여 있으면(설정 실수) 발급 자체를 막고 안내
구분들 = set(부가세구분맵.values())
if len(구분들) > 1:
    raise ValueError(f"작업명별 부가세 처리 방식이 다릅니다({부가세구분맵}). 단가마스터를 통일해 주세요.")
```

**주의사항:**
- "거래처 단위로 값이 하나여야 한다"는 설계 의도와 "그 값을 어느 행에서 읽어올지"는 별개 문제 — 후자를 "대표 행 하나"로 단순화하면 그 대표 행의 존재를 암묵적으로 가정하게 되어, 데이터 입력 방식이 다른 케이스에서 조용히 틀린 기본값으로 샐 수 있음
- 조회 지점이 여러 곳(미리보기·발급·다운로드·부분취소)에 흩어져 있으면 판정 함수를 반드시 하나로 통일해 재사용할 것(SKILL-27과 같은 이유 — 흩어진 하드코딩은 한쪽만 고치고 다른 쪽을 놓치기 쉬움)
- "값이 섞여 있으면 조용히 기본값을 쓰지 말고 명시적으로 막고 안내"하는 편이, 잘못된 계산값으로 실제 청구서가 나가는 것보다 훨씬 안전함(이번 사례처럼 실제 매출 문서에 영향을 주는 계산은 특히)

---

## SKILL-34. 여러 PC가 동시에 쓰는 화면은 "비활성→활성 전환" 시점만 잡아 탭 클릭 시 백그라운드 재조회

**목적:** 여러 담당자가 각자 다른 PC에서 동시에 쓰는 화면(거래처 마스터·단가 마스터·미발행 목록)에서, 다른 PC가 등록한 데이터가 내 화면에 안 보이는 문제 해결

**검증 상태:** ✅ 완료 (2026-08-09, `Tab4.tsx`·`ClientMasterSection.tsx`에 동일 패턴 적용)

**문제 상황:**
- 같은 세션 안에서만 상태를 공유하는 React 패턴(SKILL-23의 부모 상태 공유 등)으로는 "다른 PC에서 등록한 것"까지는 못 잡음 — 최초 로드 시 서버에서 한 번만 가져온 뒤로는 그 PC 화면이 새로고침(F5)되기 전까지 계속 낡은 값을 보여줌
- 그렇다고 폴링(주기적 자동 재조회)을 걸면 불필요한 서버 호출이 계속 발생하고, 화면이 다른 탭에 가려져 있을 때도 재조회가 도는 낭비가 생김
- 탭을 "다시 클릭"하는 순간에만 재조회하면 충분하지만, 단순히 `active` prop이 바뀔 때마다 재조회하면 그 탭이 계속 켜져 있는 동안 리렌더링될 때마다도 잘못 걸릴 수 있음 — "꺼져 있다가 켜지는 전환" 그 순간만 정확히 잡아야 함

**핵심 패턴:**
```tsx
// Dashboard.tsx가 각 최상위 탭에 "지금 보이는 중인지" 전달
<ClientsMasterTab active={tab === "clients-master"} ... />

// 하위 컴포넌트 — useRef로 "방금까지 비활성이었는지"만 판정, 재조회 성공 여부와 무관하게 화면은 그대로 유지
const 이전active = useRef(active);
useEffect(() => {
  const 방금까지비활성 = !이전active.current;
  이전active.current = active;
  if (!active || !방금까지비활성) return;  // 켜져 있는 동안의 리렌더는 무시, 꺼짐→켜짐 전환만 통과
  (async () => {
    try {
      const [clientRes, pricingRes] = await Promise.all([fetch("/api/client-list"), fetch("/api/pricing-list")]);
      if (clientRes.ok) setClientRows(await clientRes.json());
    } catch {
      // 재조회 실패는 조용히 무시 — 기존 화면 그대로 유지(백그라운드 갱신이라 오류 표시 불필요)
    }
  })();
}, [active]);
```

**주의사항:**
- `useState(active)` 초기값이 아니라 `useRef(active)`를 쓰는 이유: state로 하면 값이 바뀔 때마다 리렌더가 한 번 더 돌아 불필요 — 이 값은 화면에 안 쓰이고 "이전 값 기억"용이라 ref가 적합
- 재조회 실패 시 에러를 사용자에게 보여주지 않는 것은 의도적 선택 — 백그라운드 새로고침 실패로 화면이 깨진 것처럼 보이면 오히려 혼란을 줌(기존 화면이 여전히 유효하므로)
- 상시 마운트+`hidden` 탭 구조(SKILL-17)와 궁합이 좋음 — 탭이 언마운트되지 않으므로 `active`만으로 전환 시점을 안정적으로 판정 가능
- 하위 컴포넌트가 내부적으로 필터·선택 등 얽힌 로컬 상태를 이미 갖고 있어 rows만 갈아끼우기 어려우면(`PricingMaster` 사례), `key`를 함께 증가시켜 통째로 재마운트하는 방법으로 우회 가능(SKILL-24와 같은 관례)

---

## SKILL-35. 신규 컬럼 추가 시 다른 테이블 기존 컬럼과 이름 충돌 확인

**목적:** 새 기능에 쓸 컬럼명을 정할 때, 프로젝트 전체(다른 테이블 포함)에서 같은 이름이 이미 다른 의미로 쓰이고 있지 않은지 미리 확인

**검증 상태:** ✅ 완료 (2026-08-11, 거래명세서 Excel "구분" 표시 기능 추가 중 실제 발견)

**문제 상황:**
- 거래명세서 Excel B열(날짜/구분 텍스트)을 사용자가 직접 입력하게 만들려고 새 컬럼을 추가하려 했는데, 하필 `거래명세서_품목` 테이블에 이미 `구분 ENUM('원본','최종')`(그 행이 자동계산 원본인지 확정된 최종본인지 구분하는 완전히 다른 용도)이라는 동명의 컬럼이 존재
- 같은 이름으로 추가했다면 컬럼 충돌(중복 정의 에러) 또는 더 나쁘게는 의미가 전혀 다른 두 개념이 같은 이름으로 뒤섞이는 버그가 됐을 것

**핵심 규칙:**
```python
# 나쁜 예 — 이미 다른 의미로 쓰이는 이름을 그대로 재사용
ALTER TABLE 거래명세서_품목 ADD COLUMN 구분 VARCHAR(50);  # 기존 구분(ENUM)과 충돌

# 좋은 예 — 이 신규 필드가 정확히 뭘 뜻하는지 드러내는 별도 이름
ALTER TABLE 거래명세서_품목 ADD COLUMN 구분표시 VARCHAR(50);  # Excel B열 "구분" 표시 텍스트
```

**주의사항:**
- DB 컬럼명뿐 아니라 그 값이 지나가는 전 구간(Pydantic 모델 필드명, TypeScript 타입 필드명, 백엔드 dict 키)에서 동일하게 새 이름을 써야 함 — 중간에 하나라도 옛 이름을 쓰면 값이 조용히 안 채워지는 버그가 생김
- 화면에 보여줄 라벨(사용자용 텍스트)은 원래 의도한 이름("구분")을 그대로 써도 무방 — 충돌은 "내부 식별자" 레벨에서만 피하면 됨

---

## SKILL-36. React effect에서 호출하는 함수는 effect보다 먼저 선언

**목적:** `useEffect` 콜백 안에서 컴포넌트 내부의 다른 함수를 호출할 때, 그 함수를 effect보다 코드상 나중에 선언하면 이 프로젝트 ESLint 설정에 걸림

**검증 상태:** ✅ 완료 (`npx eslint .` 클린 확인, 2026-08-12)

**문제 상황:**
```tsx
// 나쁜 예 — addRowsFromHistory가 useEffect보다 뒤에 선언돼 있음
useEffect(() => {
  fetch(...).then((json) => {
    addRowsFromHistory(json);  // ESLint 에러: accessed before it is declared
  });
}, []);

function addRowsFromHistory(names: string[]) { /* ... */ }
```
자바스크립트 자체는 `function` 선언을 호이스팅하므로 실행 시점에는 문제없이 동작하지만, 이 프로젝트 lint 규칙(`react-hooks` 계열)은 "effect가 참조하는 값은 effect 이전에 선언되어 있어야 값 변경을 추적할 수 있다"는 전제로 코드상 선언 순서를 강제함.

**핵심 규칙:**
```tsx
// 좋은 예 — 함수를 effect보다 먼저 선언
function addRowsFromHistory(names: string[]) { /* ... */ }

useEffect(() => {
  fetch(...).then((json) => {
    addRowsFromHistory(json);  // OK
  });
}, []);
```

**주의사항:**
- "동작은 하는데 린트만 걸린다"고 무시하지 말 것 — `npm run build`/`npx eslint .`가 CI 성격의 최종 검증이라 반드시 통과시켜야 함
- 컴포넌트 안에서 여러 effect·함수가 뒤섞여 있으면, "이 effect가 쓰는 함수들을 전부 그 위에 몰아서 선언" 하는 식으로 정리하는 게 가장 간단한 해결책

---

## SKILL-37. upsert 이력 테이블에서 "가장 최근 배치"만 골라내기 (MAX(등록일) 서브쿼리)

**목적:** 배치ID 같은 별도 그룹 컬럼 없이, "이번에 갱신된 행들"(=같은 확정 시점에 함께 upsert된 행들)만 정확히 골라내기

**검증 상태:** ✅ 완료 (2026-08-12, 거래명세서 "새 행 추가" 품명을 다음 확정 때 자동으로 다시 보여주는 기능에서 실사용)

**문제 상황:**
- `INSERT ... ON DUPLICATE KEY UPDATE 등록일=NOW()` 방식으로 이력을 쌓으면, 같은 이름이 여러 번 쓰이면 새 행이 안 생기고 기존 행의 `등록일`만 갱신됨 — 그래서 "이 확정에 정확히 어떤 이름들이 쓰였는지" 구분할 배치 식별자가 테이블에 따로 없음
- 그렇다고 확정마다 거래명세서번호 같은 배치 식별자 컬럼을 추가하면, 그 배치(거래명세서)가 나중에 취소·삭제될 때 이 이력까지 함께 끌려가지 않도록 FK를 안 걸어야 하는 등 설계가 번거로워짐

**핵심 규칙:**
```sql
-- 확정할 때마다(매번) 이번에 쓰인 이름들의 등록일을 전부 NOW()로 갱신
INSERT INTO 거래명세서품명이력 (거래처명, 품명) VALUES (%s,%s)
  ON DUPLICATE KEY UPDATE 등록일=NOW();

-- 조회 시: "가장 최근 등록일"과 정확히 같은 등록일을 가진 행들 = 가장 최근 확정에 쓰인 것들
SELECT 품명 FROM 거래명세서품명이력 WHERE 거래처명=%s
  AND 등록일 = (SELECT MAX(등록일) FROM 거래명세서품명이력 WHERE 거래처명=%s)
ORDER BY 품명;
```
같은 확정에서 함께 upsert된 행들은 항상 같은(초 단위) 타임스탬프를 공유하고, 그보다 오래된(=최신 확정에 다시 안 쓰인) 행은 자연히 제외됨 — 배치ID 컬럼도, FK도 필요 없이 딱 하나의 서브쿼리로 해결.

**주의사항:**
- 초 단위 타임스탬프 정밀도를 전제로 함 — 같은 초 안에 서로 다른(별개의) 확정이 연달아 일어나는 극단적 상황이면 두 배치가 하나로 섞여 보일 수 있으나, 이 기능(사람이 수동으로 거래명세서를 확정하는 속도)에서는 사실상 발생하지 않음
- 이 테이블은 다른 감사 기록 테이블(예: `거래명세서_품목`)과 생명주기를 분리해서 설계했기 때문에 가능한 패턴 — 원본 레코드가 취소·삭제돼도 이 이력 테이블은 별도로 남아있어야 "가장 최근"이 계속 의미를 가짐(SKILL-33과 같은 계열의 "생명주기 분리" 교훈)

---

## SKILL-38. 스크롤 컨테이너 안 드롭다운은 포털 + 좌표계산 + 위/아래 자동반전

**목적:** `overflow-y-auto`가 걸린 팝업/컨테이너 안에서 여는 검색 드롭다운이 스크롤 경계나 화면 하단
밖으로 잘려 안 보이는 문제 방지

**검증 상태:** ✅ 완료 (2026-08-16, 단가마스터 자재단가 등록창의 "매칭 자재" 검색 드롭다운에서 실제
발견·해결)

**문제 상황:**
- 입력칸 바로 아래 `absolute`로 드롭다운을 그리면, 그 조상 중 하나가 `overflow-y-auto`(세로 스크롤)면
  스크롤 위치와 무관하게 그 컨테이너의 시각적 경계에서 드롭다운이 잘림(clipping) — 컨테이너를 스크롤해도
  드롭다운이 같이 스크롤되지 않고 사라짐
- `position: fixed`로 바꿔 뷰포트 기준으로 그려도, 입력칸이 화면 하단 가까이 있으면 드롭다운이 브라우저
  창 밑으로 넘어가 여전히 안 보일 수 있음(이번엔 스크롤 컨테이너가 아니라 실제 화면 경계 문제)

**핵심 로직:**
```tsx
import { createPortal } from "react-dom";

// 1) 포털로 document.body에 그려서 어떤 스크롤 조상의 overflow에도 안 잘리게 함
// 2) position: fixed + getBoundingClientRect()로 뷰포트 기준 좌표 계산
// 3) 아래쪽 공간이 부족하면 위로 자동 반전, max-height도 남은 공간에 맞춰 축소
function 계산_드롭다운위치(el: HTMLInputElement) {
  const r = el.getBoundingClientRect();
  const 여백 = 8, 기본최대높이 = 192;
  const 아래공간 = window.innerHeight - r.bottom - 여백;
  const 위공간 = r.top - 여백;
  const 아래로 = 아래공간 >= 기본최대높이 || 아래공간 >= 위공간;
  const maxHeight = Math.max(80, Math.min(기본최대높이, 아래로 ? 아래공간 : 위공간));
  return 아래로
    ? { placement: "below" as const, top: r.bottom + 4, left: r.left, width: r.width, maxHeight }
    : { placement: "above" as const, bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, maxHeight };
}

// 열려있는 동안은 스크롤·리사이즈마다 좌표 재계산 — 스크롤 이벤트는 버블링되지 않으므로
// window에 capture=true로 걸어야 어떤 조상이 스크롤돼도 잡을 수 있음
useEffect(() => {
  if (!open) return;
  function update() { if (inputRef.current) setPos(계산_드롭다운위치(inputRef.current)); }
  update();
  window.addEventListener("scroll", update, true);
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
  };
}, [open]);

{open && pos && createPortal(
  <ul style={{ position: "fixed", left: pos.left, width: pos.width, maxHeight: pos.maxHeight,
               ...(pos.placement === "below" ? { top: pos.top } : { bottom: pos.bottom }) }}>
    {/* 후보 목록 */}
  </ul>,
  document.body
)}
```

**주의사항:**
- `scroll` 이벤트는 버블링하지 않으므로 `window.addEventListener("scroll", fn, true)`(캡처링 단계)로
  걸어야 팝업 내부 스크롤 컨테이너의 스크롤도 감지됨 — `false`(버블링)로 걸면 아무 것도 안 잡힘
- 클릭 바깥 감지(`mousedown` 리스너)는 입력칸 ref와 포털로 그려진 목록 ref 둘 다 `.contains()`로
  확인해야 함 — 목록이 DOM상 다른 위치(`document.body`)에 있어서 입력칸 ref만으로는 "목록 안 클릭"이
  "바깥 클릭"으로 오인됨
- 이 프로젝트의 기존 `EditableCombo.tsx`는 `absolute`만 쓰는데, 그동안 문제가 없었던 건 사용된 곳이
  전부 스크롤 없는 짧은 폼이었기 때문 — 스크롤이 있는 컨테이너에 새로 드롭다운을 추가할 때만 이 패턴
  필요(항상 포털로 바꿀 필요는 없음)

---

## SKILL-39. 실시간 수신 전용 서버는 신규 컬럼의 과거 이력이 자동으로 안 채워짐

**목적:** 배치(엑셀) 재적재가 가능한 로컬 PC와 실시간 API 수신만 하는 사무실 PC 사이에 데이터 이력
차이가 생기는 걸 배포 전에 예상하고 대응하기 위함

**검증 상태:** ✅ 완료 (2026-08-16 발견 및 해결 — IT 담당자에게 요청해 사내망 pip 사이트 차단 예외 처리 후 openpyxl 설치, `preprocess.py` 재적재로 사무실 PC 과거 이력 백필까지 완료. 상세: `.claude/plans/plan_단가마스터_자재명정규화.md` "[6]")

**문제 상황:**
- 테이블에 신규 컬럼을 추가하는 마이그레이션은 기존 행에 `NULL`(또는 기본값)만 채우고, 그 컬럼에
  들어갈 "진짜 값"을 어디선가 되살려주지는 않음
- 로컬 PC는 원본 엑셀(`data/*.xlsx`)이 그대로 있어서 `preprocess.py`로 **전체 재적재(TRUNCATE&INSERT)**
  하면 과거 이력까지 한 번에 새 컬럼이 채워짐
- 사무실 PC는 그런 원본 파일이 없고 생산공정관리시스템이 **건별로 실시간 전송**해주는 것만 누적되는
  구조라, 마이그레이션 이전에 이미 들어온 과거 행들은 그 신규 컬럼에 채워줄 데이터 원천 자체가 없음
  (실시간 payload에 그 필드가 있었어도, 컬럼이 없던 시절엔 저장 안 되고 버려졌으므로 사후 복구 불가)
- 결과: 마이그레이션 직후 "왜 사무실 PC에서는 검색이 안 되지?" 하고 당황하기 쉬움 — 코드 버그가
  아니라 "이후 신규 건부터만 채워지는" 구조적 특성

**핵심 규칙:**
- 신규 컬럼이 화면 기능(검색·자동완성 등)에 쓰인다면, 배포 계획에 "사무실 PC 과거 이력 백필" 단계를
  미리 넣을 것 — 로컬과 똑같이 원본 엑셀이 사무실 PC에도 있다면 `preprocess.py` 재실행으로 해결
- **사무실 PC는 사내망이라 pip 설치 사이트가 차단돼 있을 수 있음** — `preprocess.py`가 필요로 하는
  패키지(`openpyxl` 등)가 이미 설치돼 있는지 배포 전에 미리 확인. 안 돼 있으면 오프라인 설치(로컬에서
  wheel 파일을 내려받아 USB 등으로 옮기는 방법) 또는 IT 담당자 협조가 필요할 수 있음
- 백필이 당장 불가능하면 "이후 신규 건부터만 지원, 과거 건은 수동 입력으로 대체 가능"으로 범위를
  좁혀서 우선 배포하고, 백필은 별도 후속 작업으로 분리하는 것도 방법(기능 자체는 정상 동작함)

---

## SKILL-40. 여러 항목을 순회하며 일부 집계값만 반복문 밖에서 재사용하면 마지막 값만 남는 버그

**목적:** "여러 개를 합산"할 때, 합산 대상 중 일부만 빠뜨리고 마지막 것만 남는 조용한 버그를 미리
의심하고 검증하기 위함

**검증 상태:** ✅ 완료 (2026-08-17, `billing.build_품목행()`에서 실제 발견 — 8/15부터 있었던 기존 버그)

**문제 상황:**
- `build_품목행()`이 여러 업무의뢰서를 한 거래명세서로 묶어 계산할 때, "일반봉투·각대대봉투·용지·삽지
  합계 수량"은 `for 번호 in 의뢰서번호셋:` 반복문 안에서 매번 `+=`로 정확히 누적하고 있었음
- 그런데 같은 반복문 안에서 매번 새로 할당되는 `z = 자재map.get((번호, 작업), {})`의 "자재별"(자재코드
  단위 세부 내역)은 반복문 **밖에서** `z.get("자재별", {})...`로 재사용하고 있었음 — 파이썬은 for문이
  끝나도 마지막 반복의 지역변수 값이 그대로 남아있으므로, 이 부분만 **마지막으로 순회한 의뢰서
  것만** 쓰이고 나머지 의뢰서의 자재별 수량은 통째로 누락됨
- 의뢰서가 1건뿐인 경우(반복문이 1회만 도는 경우)는 완전히 정상 동작해서 문제가 안 드러남 — 실제로
  이 버그를 심었던 8/15 이관 작업 때도, 그 뒤 실사용 검증 때도 전부 단일 의뢰서 케이스만 테스트해서
  발견하지 못했고, 2026-08-17 여러 의뢰서(5건)를 묶은 실거래처(한국예탁결제원)로 회귀 검증하다가
  처음 발견됨(각대대봉투 자재 실사용량 14,204개 중 220개만 반영되고 있었음)

**핵심 규칙:**
```python
# 나쁜 예 — 반복문 안 스칼라 합계는 정확히 누적되지만, 반복문 밖에서 재사용하는 z는 마지막 값만 남음
일반봉투 = 각대대봉투 = 0
for 번호 in 의뢰서번호셋:
    z = 자재map.get((번호, 작업), {})
    일반봉투 += z.get("일반봉투_수량", 0)   # 정확히 누적됨
    각대대봉투 += z.get("각대대봉투_수량", 0)
...
용지자재별 = z.get("자재별", {}).get("용지", {})  # z가 마지막 번호 것만 남아있음!

# 좋은 예 — 세부 딕셔너리도 반복문 안에서 명시적으로 누적
자재별_누적 = {}
for 번호 in 의뢰서번호셋:
    z = 자재map.get((번호, 작업), {})
    일반봉투 += z.get("일반봉투_수량", 0)
    for 종류, 자재dict in z.get("자재별", {}).items():
        누적 = 자재별_누적.setdefault(종류, {})
        for 키, 수량 in 자재dict.items():
            누적[키] = 누적.get(키, 0) + 수량
```

**주의사항:**
- 반복문 안에서 매번 새로 할당되는 변수(`z` 등)를 반복문 밖에서 참조하는 코드를 볼 때마다 "이 값이
  누적된 값인지, 마지막 반복의 값인지"를 먼저 확인할 것 — 스칼라 합계(`+=`)는 눈에 잘 띄어 안전하게
  구현되기 쉽지만, 딕셔너리·리스트 같은 세부 구조는 "그냥 마지막 것 재사용"으로 빠지기 쉬움
- 이런 버그는 **테스트 대상이 항상 "묶음 1개(단일 항목)"일 때는 절대 드러나지 않음** — 회귀·신규
  기능 검증 시 반드시 "여러 개를 한 번에 묶는" 케이스(이 프로젝트에선 의뢰서 여러 건을 한 거래명세서로
  묶어 발행하는 경우)를 최소 1개는 포함해서 테스트할 것
- 발견 시 같은 함수 안에 비슷한 패턴이 더 있는지(이번엔 용지·봉투·삽지 3곳 전부 같은 버그) 반드시
  함께 확인 — 하나만 고치고 나머지를 놓치기 쉬움

---

## SKILL-41. "총량 유지 + 비율로만 배분"하는 헬퍼는 미매칭 항목도 라벨을 붙이면 회귀가 생김

**목적:** 기존 `_자재별_처리()`(실사용량을 그대로 청구수량으로 씀)와 다른 성격의 배분 헬퍼를 새로
만들 때, "자재단가 미등록 시 지금과 완전히 동일한 결과"라는 회귀 기준을 놓치기 쉬운 함정 방지

**검증 상태:** ✅ 완료 (2026-08-17, `billing._자재비례배분_처리()` 최초 구현에서 실제 발견)

**문제 상황:**
- 출력비(P)를 자재 비중으로 비례배분하는 신규 헬퍼를 만들면서, 자재단가가 등록 안 된 자재도
  `_자재별_처리()`처럼 "라벨 없는 기본단가 한 줄"로 합치지 않고 `라벨 = (매칭["라벨"] if 매칭 else
  None) or 자재명`로 짜버림 — 매칭이 `None`이어도 `or 자재명`에서 원본 자재명이 그대로 라벨로 살아남음
- 결과: 자재단가를 하나도 등록 안 한 흔한 경우(대다수)에도, 그 작업에 쓰인 용지 자재 종류 수만큼
  원본 표 행이 쪼개져 나옴 — 실제 청구 금액은 같아도(전부 기본단가) 화면에 불필요하게 여러 줄로
  보이는 회귀. 종단 테스트로 실거래처(BC카드)를 검증하다가 발견됨 — 단일 케이스(자재 1종류)만
  테스트했다면 안 드러났을 문제

**핵심 규칙:**
```python
# 나쁜 예 — 미매칭이어도 자재명이 라벨로 남음
단가 = 매칭["단가"] if 매칭 else 기본단가
라벨 = (매칭["라벨"] if 매칭 else None) or 자재명   # ← 매칭 없으면 자재명이 그대로 라벨이 됨
if 단가 > 0 and 배정량 > 0:
    행데이터[(품목, 작업, 단가, 라벨)]["수량"] += 배정량

# 좋은 예 — 미매칭 몫은 전부 모아서 기본단가 한 줄로(_자재별_처리()와 동일 관례)
기본단가_배정 = 0.0
for ...:
    매칭 = _자재단가_조회(...)
    if 매칭 is None:
        기본단가_배정 += 배정량
        continue
    ...  # 매칭된 것만 개별 라벨로
if 기본단가 > 0 and 기본단가_배정 > 0:
    행데이터[(품목, 작업, 기본단가, None)]["수량"] += 기본단가_배정
```

**주의사항:**
- 이 프로젝트는 "자재단가 등록 안 하면 지금까지와 완전히 동일하게 동작"을 모든 자재별 계산 기능의
  핵심 회귀 기준으로 삼고 있음(`_자재별_처리()` 최초 설계 원칙, 2026-08-15) — 새 배분 방식을 만들
  때마다 이 기준을 그대로 지키는지 "자재단가 미등록 + 자재 종류 2개 이상" 케이스로 반드시 확인할 것
- 단일 자재 케이스만 테스트하면 라벨 로직 버그가 절대 드러나지 않음(자재가 1종류면 어차피 한 줄만
  나옴) — 검증 시 여러 자재가 섞인 실거래처를 최소 1개는 포함할 것

---

## SKILL-42. 같은 계산을 두 함수가 각자 구현하면 한쪽만 갱신되다 어긋남

**목적:** "요약/미리보기용" 계산 함수와 "확정/저장용" 계산 함수가 로직을 따로 들고 있을 때,
계산 규칙이 바뀌는 시점에 한쪽만 고쳐지고 다른 쪽은 옛 로직으로 남아 화면마다 금액이 달라지는
버그 방지

**검증 상태:** ✅ 완료 (2026-08-20, `billing.calc_공급가맵()` vs `billing.build_품목행()` 불일치로
실제 발견 — `.claude/plans/bug_공급가액계산_불일치.md`)

**문제 상황:**
- `calc_공급가맵()`(미발행목록·발행목록·예상공급가액·부분취소가 쓰는 "요약용" 함수)과
  `build_품목행()`(미리보기·실제 확정·저장이 쓰는 "확정용" 함수)이 둘 다 출력비·봉입비 등
  공급가액 계산 로직을 처음부터 각자 구현하고 있었음
- 2026-08-17 "출력비·봉입비를 자재사용량 기준으로 청구"하도록 계산 규칙을 바꿀 때
  `build_품목행()`만 갱신되고 `calc_공급가맵()`은 옛날(단순 곱셈) 그대로 남음 — 미발행목록의
  "예상공급가액"이 실제 확정 금액과 달라지는 버그로 이어짐(사용자가 화면 스크린샷으로 208,290원
  차이를 제보하고서야 발견)
- 더 심각하게, 부분취소 API가 이 옛 함수로 재계산한 값을 그대로 DB에 덮어쓰고 있어서, **부분취소를
  하면 정확했던 금액이 부정확한 값으로 바뀌는 실제 청구 오류**로 이어졌음(화면 표시 문제를 넘어선
  진짜 버그)

**핵심 규칙:**
```python
# 나쁜 예 — 두 함수가 품목별 금액 계산을 각자 구현
def calc_공급가맵(...):
    항목금액 = {"출력비": 청구페이지 * rates.get("출력단가", 0), ...}  # 독자적인 단순 계산

def build_품목행(...):
    if 청구페이지있음:
        _자재비례배분_처리(...)  # 다른 곳에서 갱신된 최신 계산 로직
    ...

# 좋은 예 — 실제 계산 로직은 공유 헬퍼 하나에만 존재, 두 함수는 그걸 호출만 함
def _작업별_품목누적(행데이터, 작업, rates, *, ...):
    ...  # 출력비·봉입비·자재비 계산 로직은 여기 한 곳에만 있음

def calc_공급가맵(...):
    _작업별_품목누적(임시행, 작업, rates, ...)   # 의뢰서 1건씩 호출

def build_품목행(...):
    _작업별_품목누적(행데이터, 작업, rates, ...)  # 여러 의뢰서를 미리 합쳐서 호출
```

**주의사항:**
- "요약용 함수는 대충 근사치만 보여주면 된다"는 생각으로 계산 로직을 단순화해서 별도로 구현해두면,
  나중에 "확정용" 계산 규칙만 바뀌고 요약용은 방치되기 쉬움 — 애초에 계산 로직 자체는 하나만 두고
  요약/확정 두 함수는 "그 결과를 어떻게 묶어서 보여줄지"(의뢰서별 개별 vs 여러 건 합산)만 다르게
  가져가는 구조가 안전함
- 반환 형태(집계 단위)가 서로 다르다는 이유로 계산 로직까지 따로 만들 필요는 없음 — 이번처럼 공유
  헬퍼가 "이미 집계된 수량"만 받게 만들면, 호출부가 그 앞에서 의뢰서 1건 단위로 부르든 여러 건을
  합쳐서 부르든 자유롭게 선택할 수 있음
- 재발 방지 검증법: 두 함수(또는 그 이상)가 같은 대상에 대해 항상 정확히 같은 합계를 내는지
  실데이터로 회귀 비교하는 습관 — 이번엔 자재단가 등록 거래처 전수 + 랜덤 샘플 총 1,687건을
  비교해 신버전 두 함수의 불일치 0건을 확인함

---

## SKILL-43. 신규 데이터 컬럼 "합산 vs OR-flag(반복 표시)" 실사례 검증

**목적:** 새로 들어오는 데이터 컬럼 여러 개를 합쳐서 쓰기 전에, 그게 정말 "합산"인지 "같은 값이
여러 컬럼에 반복 표시"되는 것인지 실제 데이터로 확인

**검증 상태:** ✅ 완료 (2026-08-21, 공정별 단가 청구 기능 — `data/7월운영통계자료.xlsx` 실데이터 분석)

**문제 상황:**
- 당사 생산공정관리시스템이 압착·봉입·수작업·중철·제본 등 공정 세분화 컬럼 10개를 신규로 내려주기
  시작했는데, 얼핏 보면 "이 물건이 이 공정을 거쳤으면 그 컬럼에 수량이 찍힌다"는 단순한 구조로
  보여서 "여러 컬럼에 값이 있으면 다 더해서 총 처리량을 구하면 되겠다"고 오해하기 쉬움
- 실제로는 **한 물건이 여러 공정을 동시에 거치면(예: 제본 후 수작업으로 봉투에 인입) 관련된 각
  컬럼에 "같은 건수"가 그대로 반복 기록**됨 — 합산이 아니라 "이 건은 이 공정도 거쳤다"는 OR-flag
  방식(실사례: 의뢰서 96373 건수=수작업=제본=12, 96299 건수=중철=수작업=515 — 둘 다 합이 아니라
  동일 값)
- 이걸 모르고 그냥 다 더하면(예: 봉입비를 "봉투 자재사용량"으로 계산하면서 "수작업비"를 그 컬럼값
  그대로 또 더하면) 같은 물량이 두 번 청구되는 이중 청구 버그가 생김

**핵심 규칙:**
```python
# 나쁜 예 — 여러 신규 컬럼을 무조건 합쳐서 총 처리량으로 씀 (이중 청구 위험)
총처리량 = 봉입 + 수작업 + 중철 + 제본

# 좋은 예 — 실사례 몇 건을 직접 뽑아 각 컬럼 값과 기존 "건수" 컬럼이 어떤 관계인지 먼저 확인
# (합산이면 sum(새컬럼들) == 건수, OR-flag면 각 새컬럼 == 건수)
df.loc[df["업무의뢰서번호"] == "96373", ["건수","수작업","제본"]]
#    건수  수작업  제본
#     12     12    12   ← 합이 아니라 셋 다 동일값 → OR-flag 확인됨

# 확인 후: 우선순위가 있는 "대표 컬럼" 하나만 청구수량으로 쓰고, 나머지는 별도 품목으로 독립 청구
봉입_기준수량 = 봉입   # 기계봉입분만 정확히
수작업비_수량 = 수작업  # 별도 품목으로 독립 청구 (같은 물량을 중복해서 봉입비에도 넣지 않음)
```

**주의사항:**
- 실사례 검증은 반드시 "같은 물건이 여러 공정을 동시에 거친" 케이스(신규 컬럼 2개 이상이 동시에
  값 있는 행)를 골라서 확인할 것 — 컬럼 하나만 값 있는 케이스만 보면 합산인지 OR-flag인지 구분이
  안 됨
- 이중 청구를 피하려면, "여러 품목이 겹칠 수 있는 신호"(예: 배송계열합 = 여러 신규 컬럼의 합 > 0)로
  "신규 데이터 있음"을 판별한 뒤, 그 신호가 있으면 각 품목별로 **자기 컬럼값만** 독립적으로 청구하고,
  블렌디드 총량(예: 봉투 자재사용량)을 다른 품목의 기준수량으로 재사용하지 않을 것

---

## SKILL-44. "총량 - 기준값" 폴백 계산은 기준값이 0이 되는 경우 명시적 가드 필수

**목적:** 차감식으로 "초과분"을 계산하는 로직에서, 기준값이 특정 상황(반제품 등)에 의해 강제로
0이 될 수 있으면 결과도 반드시 0으로 처리되게 만들 것

**검증 상태:** ✅ 완료 (2026-08-22, `bug_추가봉입비_반제품제본단독오차.md` — 실사용 검수 중 발견)

**문제 상황:**
- "추가봉입비"(봉투 1개당 기본 1장을 넘는 초과 페이지 비용)를 `장수 - 봉입건수`로 계산하는 코드가
  있었는데, 봉입건수가 **의미상 0인 게 아니라 "이 작업 자체엔 봉투 삽입이 없다"는 뜻으로 강제 0이 된
  경우**(반제품 처리 규칙이 `건수`를 0으로 지움, 또는 제본만 하고 봉투 없이 그대로 발송/납품하는
  작업)에도 그대로 `장수 - 0` = 장수 전체가 "초과분"으로 계산돼버림
- "봉투가 아예 없는 작업"에는 "봉투 초과 페이지"라는 개념 자체가 성립하지 않는데, 코드는 그걸
  구분하지 못하고 정상적인 초과 페이지 계산과 똑같이 취급함 — 로컬 3개월치 데이터 회귀 스캔에서
  전체 5,844개 작업 그룹 중 2,406개(1,268개 의뢰서)가 영향받는 것으로 확인, 과다청구 수량 합계
  40,919,580(billing.py 2026-07-19 최초 작성 시점부터 존재하던 결함 — 최근 변경과 무관)

**핵심 규칙:**
```python
# 나쁜 예 — 기준값이 0이면(의미상 "삽입 없음"이어도) 결과가 총량 전체로 튐
추가용지 = max(0, 장수 - 봉입건수)

# 좋은 예 — 기준값 자체가 0이면 결과도 0 (총량을 그대로 반환하지 않음)
추가용지 = max(0, 장수 - 봉입건수) if 봉입건수 > 0 else 0
```

**주의사항:**
- 이런 결함은 "정상적인 값 범위"(기준값이 진짜 작지만 0보다는 큰 경우)로 테스트하면 절대 안 드러남
  — 기준값이 정확히 0이 되는 특수 케이스(반제품, 부가공정 등 도메인상 "이 개념 자체가 해당 없음"인
  행)를 일부러 골라서 확인해야 발견됨
- 옛 화면(Streamlit)의 **표시용** 합계 통계에는 이미 이 가드(`(총장수>0 and 총봉입>0) else 0`)가
  있었는데, 실제 청구 금액을 계산하는 코드에는 이 가드가 없었음 — 표시용 통계와 실제 계산 로직이
  분리돼 있으면 이렇게 한쪽에만 적용된 안전장치를 놓치기 쉬우므로, 두 로직이 같은 공식을 쓰는지도
  같이 점검할 것

---

*생성일: 2026. 5. 26. | 새 스킬 확립 시 이 파일에 추가*
