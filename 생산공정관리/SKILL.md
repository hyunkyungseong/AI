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
| SKILL-05 | MariaDB 연결 패턴 (pymysql) | ⏳ 구현 예정 |

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

**검증 상태:** ⏳ 구현 예정

**핵심 로직:**
```python
import pymysql

def get_conn():
    return pymysql.connect(
        host="서버IP또는도메인",
        port=3306,
        user="DB사용자명",
        password="비밀번호",
        database="DB명",
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

# 사용 예시 (기존 SQLite와 동일한 방식 유지)
conn = get_conn()
conn.execute("SELECT * FROM 거래처마스터")
conn.commit()
conn.close()
```

**주의사항:**
- SQLite의 `sqlite3.connect()` 와 달리 접속 정보(host, user, pw) 필요
- 비밀번호 등 민감 정보는 코드에 직접 입력 금지 → 환경변수 또는 별도 config 파일 사용
- MariaDB는 MySQL과 호환 → pymysql 드라이버 그대로 사용 가능

---

*생성일: 2026. 5. 26. | 새 스킬 확립 시 이 파일에 추가*
