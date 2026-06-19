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

*생성일: 2026. 5. 26. | 새 스킬 확립 시 이 파일에 추가*
