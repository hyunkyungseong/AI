import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
import plotly.express as px
import sqlite3
from pathlib import Path
from datetime import date, timedelta

BASE_DIR = Path(__file__).parent.parent
PKL_PATH = BASE_DIR / "work" / "processed.pkl"
DB_PATH  = BASE_DIR / "work" / "dashboard.db"

st.set_page_config(page_title="생산공정 대시보드", layout="wide", page_icon="📊")

st.markdown("""
<style>
    .block-container { padding-top: 2.5rem !important; padding-bottom: 1rem !important; }
    [data-testid="stAppViewBlockContainer"] > div:first-child { margin-top: -1.5rem; }
    [data-testid="stHeader"] h1 { font-size: 1.4rem !important; }
    .stMarkdown h1 { font-size: 1.4rem !important; margin-bottom: 0.3rem !important; }
    .stMarkdown h2 { font-size: 1.1rem !important; margin-bottom: 0.2rem !important; }
    .stMarkdown h3 { font-size: 0.95rem !important; margin-bottom: 0.2rem !important; }
    [data-testid="stMetricLabel"] { font-size: 0.75rem !important; }
    [data-testid="stMetricValue"] { font-size: 1.1rem !important; }
</style>
""", unsafe_allow_html=True)

DM_담당자 = {"강서윤", "노재민", "김성수", "김희원", "임병민"}

# ── 데이터 로드 ─────────────────────────────────────────────
@st.cache_data
def load_data(_mtime=None):
    df = pd.read_pickle(PKL_PATH)
    df["연월"] = df["연월"].astype(str)
    return df

# pkl 파일 수정 시각을 캐시 키로 사용 → 데이터 갱신 시 자동 재로드
_pkl_mtime = PKL_PATH.stat().st_mtime if PKL_PATH.exists() else 0

def get_conn():
    return sqlite3.connect(DB_PATH)

def load_master():
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM 거래처마스터 ORDER BY 거래처명", conn)
    conn.close()
    return df

def load_단가마스터():
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM 단가마스터 ORDER BY 거래처명, 업무명, 작업명", conn)
    conn.close()
    _단가컬럼 = ["출력단가","봉입단가","추가봉입단가","용지제작단가","봉투제작단가","삽지제작단가","각대대봉투단가","각대대봉투봉입단가"]
    _단가컬럼 = [c for c in _단가컬럼 if c in df.columns]
    df[_단가컬럼] = df[_단가컬럼].apply(pd.to_numeric, errors="coerce").fillna(0)
    # None 유지 (dict 키 매칭용 — NaN → None 변환)
    df["업무명"] = df["업무명"].where(df["업무명"].notna(), None)
    df["작업명"] = df["작업명"].where(df["작업명"].notna(), None)
    return df

def load_이력():
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM 거래명세서이력 ORDER BY 등록일 DESC", conn)
    conn.close()
    return df

@st.cache_data
def load_자재_summary():
    """자재사용현황.xlsx → (업무의뢰서번호, 작업이름) 기준 자재 수량 집계 (봉투는 일반/각대대봉투 분리)"""
    자재_path = BASE_DIR / "data" / "자재사용현황.xlsx"
    if not 자재_path.exists():
        return pd.DataFrame(columns=["업무의뢰서번호","작업이름","일반봉투_수량","각대대봉투_수량","용지_수량","삽지_수량"])
    zdf = pd.read_excel(자재_path, engine="openpyxl")
    zdf.columns = zdf.columns.str.strip()
    zdf = zdf.rename(columns={"업무의뢰서코드": "업무의뢰서번호"})
    zdf["업무의뢰서번호"] = pd.to_numeric(zdf["업무의뢰서번호"], errors="coerce").fillna(-1).astype(int)

    def _봉투종류(자재명):
        s = str(자재명)
        return "각대대봉투" if ("각대" in s or "대봉투" in s) else "일반봉투"

    # 봉투 행: 자재명으로 일반봉투/각대대봉투 분류, 나머지는 자재종류 그대로
    zdf["자재종류2"] = zdf["자재종류"].where(zdf["자재종류"] != "봉투", zdf["자재명"].apply(_봉투종류))

    grp = zdf.groupby(["업무의뢰서번호","작업이름","자재종류2"])["사용량"].sum().reset_index()
    pivot = grp.pivot_table(
        index=["업무의뢰서번호","작업이름"],
        columns="자재종류2",
        values="사용량",
        aggfunc="sum",
        fill_value=0,
    ).reset_index()
    pivot.columns.name = None

    rename_map = {"일반봉투": "일반봉투_수량", "각대대봉투": "각대대봉투_수량",
                  "용지": "용지_수량", "삽지": "삽지_수량", "미구분": "미구분_수량"}
    pivot = pivot.rename(columns={k: v for k, v in rename_map.items() if k in pivot.columns})
    for col in ["일반봉투_수량","각대대봉투_수량","용지_수량","삽지_수량"]:
        if col not in pivot.columns:
            pivot[col] = 0
    return pivot

@st.cache_data
def build_의뢰서_summary(df):
    first = df.groupby("업무의뢰서번호", sort=False).first().reset_index()
    agg = df.groupby("업무의뢰서번호", sort=False).agg(
        봉입건수_합=("건수",        "sum"),
        출력페이지_합=("출력페이지", "sum"),
        장수_합=("장수",            "sum"),
    ).reset_index()
    자재df = load_자재_summary()
    result = first[["업무의뢰서번호","거래처명","업무명","작업명","업무명상세","사업부","연월","날짜","마케팅담당자","확정청구페이지"]].merge(agg, on="업무의뢰서번호")
    if not 자재df.empty:
        자재_의뢰서 = 자재df.groupby("업무의뢰서번호")[["일반봉투_수량","각대대봉투_수량","용지_수량","삽지_수량"]].sum().reset_index()
        자재_의뢰서["봉투_사용량_합"] = 자재_의뢰서["일반봉투_수량"] + 자재_의뢰서["각대대봉투_수량"]
        자재_의뢰서 = 자재_의뢰서.rename(columns={"용지_수량": "용지_사용량_합", "삽지_수량": "삽지_사용량_합"})
        result = result.merge(자재_의뢰서, on="업무의뢰서번호", how="left")
        자재cols = ["봉투_사용량_합","용지_사용량_합","삽지_사용량_합","일반봉투_수량","각대대봉투_수량"]
        for c in 자재cols:
            if c in result.columns:
                result[c] = result[c].fillna(0).astype(int)
    return result

df_all   = load_data(_mtime=_pkl_mtime)
연월목록 = sorted(df_all["연월"].unique())

# ── 기간 관련 헬퍼 ───────────────────────────────────────────
def _months_ago_first(n):
    today = date.today()
    m, y = today.month - n, today.year
    while m <= 0:
        m += 12; y -= 1
    return date(y, m, 1)

def _smart_end():
    """15일 초과면 오늘, 15일 이하면 전월 말일"""
    today = date.today()
    if today.day > 15:
        return today
    return today.replace(day=1) - timedelta(days=1)

def _smart_start():
    """15일 초과면 당월 1일, 15일 이하면 전월 1일"""
    today = date.today()
    if today.day > 15:
        return today.replace(day=1)
    return (today.replace(day=1) - timedelta(days=1)).replace(day=1)

_today = date.today()

# session_state 초기화
if "_sb_기간" not in st.session_state:
    st.session_state._sb_기간 = "사용자 정의"
if "_di_시작" not in st.session_state:
    st.session_state._di_시작 = _smart_start()
if "_di_종료" not in st.session_state:
    st.session_state._di_종료 = _smart_end()

def _on_sb_change():
    opt = st.session_state._sb_기간
    end = _smart_end()
    if opt == "최근 3개월":
        st.session_state._di_시작 = _months_ago_first(2)
        st.session_state._di_종료 = end
    elif opt == "최근 6개월":
        st.session_state._di_시작 = _months_ago_first(5)
        st.session_state._di_종료 = end
    elif opt == "최근 1년":
        st.session_state._di_시작 = _months_ago_first(11)
        st.session_state._di_종료 = end

def _on_di_change():
    st.session_state._sb_기간 = "사용자 정의"

# 달력 헤더 월 이름 → 숫자 변환 (MutationObserver로 달력 열릴 때마다 실행)
components.html("""
<script>
const KO = {
  January:'1월', February:'2월', March:'3월', April:'4월',
  May:'5월', June:'6월', July:'7월', August:'8월',
  September:'9월', October:'10월', November:'11월', December:'12월'
};
function fix() {
  const doc = window.parent.document;
  doc.querySelectorAll('[data-baseweb="calendar"] [data-baseweb="select"] span').forEach(el => {
    const t = el.textContent.trim();
    if (KO[t]) el.textContent = KO[t];
  });
}
fix();
new MutationObserver(fix).observe(
  window.parent.document.body, {childList:true, subtree:true}
);
</script>
""", height=0)

# ── 사이드바 ────────────────────────────────────────────────
with st.sidebar:
    with st.expander("🔍 필터", expanded=True):
        선택_사업부 = st.multiselect(
            "사업부", ["DM사업부", "N사업부"], placeholder="전체"
        )

        if 선택_사업부:
            df_base = df_all[df_all["사업부"].isin(선택_사업부)]
        else:
            df_base = df_all

        # ── 기간 선택
        st.selectbox(
            "기간",
            ["사용자 정의", "최근 3개월", "최근 6개월", "최근 1년"],
            key="_sb_기간",
            on_change=_on_sb_change,
        )

        # 시작일 / 종료일 별도 입력
        c1, c2 = st.columns(2)
        with c1:
            st.date_input("시작일", format="YYYY.MM.DD",
                          key="_di_시작", on_change=_on_di_change)
        with c2:
            st.date_input("종료일", format="YYYY.MM.DD",
                          key="_di_종료", on_change=_on_di_change)

        시작일 = st.session_state._di_시작
        종료일 = st.session_state._di_종료
        시작_str = 시작일.strftime("%Y-%m-%d")
        종료_str = 종료일.strftime("%Y-%m-%d")

        거래처목록 = sorted(df_base["거래처명"].dropna().unique())
        담당자목록 = sorted(df_base["마케팅담당자"].dropna().unique())

        선택_거래처 = st.multiselect("거래처", 거래처목록)
        선택_담당자 = st.multiselect("담당자", 담당자목록)

        # 업무명 목록 — 거래처·담당자 선택 반영
        df_업무명 = df_base.copy()
        if 선택_거래처:
            df_업무명 = df_업무명[df_업무명["거래처명"].isin(선택_거래처)]
        if 선택_담당자:
            df_업무명 = df_업무명[df_업무명["마케팅담당자"].isin(선택_담당자)]
        업무명목록 = sorted(df_업무명["업무명"].dropna().unique())

        선택_업무명 = st.multiselect("업무명", 업무명목록)

    df = df_base[
        (df_base["날짜"] >= 시작_str) &
        (df_base["날짜"] <= 종료_str)
    ].copy()
    if 선택_거래처:
        df = df[df["거래처명"].isin(선택_거래처)]
    if 선택_담당자:
        df = df[df["마케팅담당자"].isin(선택_담당자)]
    if 선택_업무명:
        df = df[df["업무명"].isin(선택_업무명)]

    st.caption(f"조회 데이터: {len(df):,}행")

# ── 탭 ──────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "📈 작업 현황 요약",
    "🏢 거래처별 현황",
    "👤 담당자별 현황",
    "📄 거래명세서 관리",
])


# ════════════════════════════════════════════════════════════
# 탭 1 — 작업 현황 요약
# ════════════════════════════════════════════════════════════
with tab1:
    사업부_타이틀 = f"[{', '.join(선택_사업부)}]" if 선택_사업부 else "[전체]"
    st.header(f"작업 현황 요약  {사업부_타이틀}")

    # ── 기준월 = 종료일 기준
    기준월 = 종료일.strftime("%Y-%m")
    전월str     = str(pd.Period(기준월, "M") - 1)
    전년동월str = f"{int(기준월[:4])-1}{기준월[4:]}"

    # 전체 데이터에서 비교월 추출 (사업부 필터 유지, 기간만 해제)
    df_비교base = df_base.copy()
    if 선택_거래처:
        df_비교base = df_비교base[df_비교base["거래처명"].isin(선택_거래처)]
    if 선택_담당자:
        df_비교base = df_비교base[df_비교base["마케팅담당자"].isin(선택_담당자)]

    df_현재 = df_비교base[df_비교base["연월"] == 기준월]
    df_전월 = df_비교base[df_비교base["연월"] == 전월str]
    df_전년 = df_비교base[df_비교base["연월"] == 전년동월str]

    출력_현 = int(df_현재["출력페이지"].sum())
    출력_전 = int(df_전월["출력페이지"].sum())
    출력_전년 = int(df_전년["출력페이지"].sum())
    자재_현 = int(df_현재["장수"].sum())
    자재_전 = int(df_전월["장수"].sum())
    봉입_현 = int(df_현재["건수"].sum())
    봉입_전 = int(df_전월["건수"].sum())
    봉입_전년 = int(df_전년["건수"].sum())
    청구_현 = int(df_현재["확정청구페이지"].sum())
    청구_전 = int(df_전월["확정청구페이지"].sum())

    def pct(cur, prev):
        if prev == 0:
            return None
        return f"{(cur - prev) / prev * 100:+.1f}%"

    # ── 핵심 지표 카드
    st.subheader(f"기준월  ({기준월})")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("출력페이지 (장비기준)", f"{출력_현:,}", pct(출력_현, 출력_전), help=f"전월({전월str}) 대비")
    c2.metric("출력자재사용량 (장)",   f"{자재_현:,}", pct(자재_현, 자재_전), help=f"전월({전월str}) 대비")
    c3.metric("봉입건수",              f"{봉입_현:,}", pct(봉입_현, 봉입_전), help=f"전월({전월str}) 대비")
    c4.metric("청구페이지",             f"{청구_현:,}", pct(청구_현, 청구_전), help=f"전월({전월str}) 대비")

    st.caption(f"전월: {전월str}  |  전년동월: {전년동월str}")
    st.divider()

    # ── 전체 사업부 비교
    if not 선택_사업부:
        st.subheader(f"사업부별 비교 ({기준월})")
        dm = df_all[(df_all["연월"] == 기준월) & (df_all["사업부"] == "DM사업부")]
        ns = df_all[(df_all["연월"] == 기준월) & (df_all["사업부"] == "N사업부")]
        cmp_dept = pd.DataFrame({
            "사업부":    ["DM사업부", "N사업부"],
            "출력페이지": [int(dm["출력페이지"].sum()), int(ns["출력페이지"].sum())],
            "봉입건수":   [int(dm["건수"].sum()),       int(ns["건수"].sum())],
        })
        d1, d2 = st.columns(2)
        with d1:
            fig = px.bar(cmp_dept, x="사업부", y="출력페이지", color="사업부",
                         color_discrete_sequence=["#4C72B0","#DD8452"],
                         title="사업부별 출력페이지")
            st.plotly_chart(fig, use_container_width=True)
        with d2:
            fig2 = px.bar(cmp_dept, x="사업부", y="봉입건수", color="사업부",
                          color_discrete_sequence=["#4C72B0","#DD8452"],
                          title="사업부별 봉입건수")
            st.plotly_chart(fig2, use_container_width=True)
        st.divider()

    # ── 전월 대비 / 전년동월 대비
    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader(f"전월 대비  ({전월str} → {기준월})")
        cmp = pd.DataFrame({
            "항목":  ["출력페이지", "봉입건수"],
            "전월":  [출력_전, 봉입_전],
            f"기준월({기준월})": [출력_현, 봉입_현],
        }).melt(id_vars="항목", var_name="구분", value_name="수량")
        fig = px.bar(cmp, x="항목", y="수량", color="구분", barmode="group",
                     category_orders={"구분": ["전월", f"기준월({기준월})"]},
                     color_discrete_sequence=["#DD8452","#4C72B0"],
                     text_auto=True)
        fig.update_traces(texttemplate="%{y:,}", textposition="outside")
        fig.update_layout(height=350, uniformtext_minsize=8)
        st.plotly_chart(fig, use_container_width=True)

    with col_b:
        st.subheader(f"전년동월 대비  ({전년동월str} → {기준월})")
        cmp2 = pd.DataFrame({
            "항목":     ["출력페이지", "봉입건수"],
            "전년동월": [출력_전년, 봉입_전년],
            f"기준월({기준월})": [출력_현, 봉입_현],
        }).melt(id_vars="항목", var_name="구분", value_name="수량")
        fig2 = px.bar(cmp2, x="항목", y="수량", color="구분", barmode="group",
                      category_orders={"구분": ["전년동월", f"기준월({기준월})"]},
                      color_discrete_sequence=["#55A868","#4C72B0"],
                      text_auto=True)
        fig2.update_traces(texttemplate="%{y:,}", textposition="outside")
        fig2.update_layout(height=350, uniformtext_minsize=8)
        st.plotly_chart(fig2, use_container_width=True)



# ════════════════════════════════════════════════════════════
# 탭 2 — 거래처별 현황
# ════════════════════════════════════════════════════════════
with tab2:
    st.header(f"거래처별 현황  {'['+', '.join(선택_사업부)+']' if 선택_사업부 else '[전체]'}")

    client = df.groupby(["사업부","거래처명"]).agg(
        출력페이지=("출력페이지", "sum"),
        봉입건수=("건수", "sum"),
        확정청구페이지=("확정청구페이지", "sum"),
    ).reset_index().sort_values("출력페이지", ascending=False)

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("출력페이지 순위 (상위 20)")
        top20 = client.head(20)
        fig = px.bar(top20, x="출력페이지", y="거래처명",
                     color="사업부", orientation="h",
                     color_discrete_map={"DM사업부":"#4C72B0","N사업부":"#DD8452"},
                     text=[f"{int(v/10_000)/100:.2f}M" for v in top20["출력페이지"]])
        fig.update_layout(height=550, yaxis={"categoryorder":"total ascending"},
                          legend={"orientation":"h","yanchor":"bottom","y":1.02,"xanchor":"left","x":0})
        fig.update_traces(textposition="outside")
        st.plotly_chart(fig, use_container_width=True)
    with col2:
        st.subheader("봉입건수 순위 (상위 20)")
        top20_b = client.sort_values("봉입건수", ascending=False).head(20)
        fig2 = px.bar(top20_b, x="봉입건수", y="거래처명", color="사업부", orientation="h",
                      color_discrete_map={"DM사업부":"#4C72B0","N사업부":"#DD8452"},
                      text=[f"{int(v/10_000)/100:.2f}M" for v in top20_b["봉입건수"]])
        fig2.update_layout(height=550, yaxis={"categoryorder":"total ascending"},
                           legend={"orientation":"h","yanchor":"bottom","y":1.02,"xanchor":"left","x":0})
        fig2.update_traces(textposition="outside")
        st.plotly_chart(fig2, use_container_width=True)

    st.divider()
    st.subheader("거래처별 상세")
    st.dataframe(
        client.style.format({
            "출력페이지":     "{:,.0f}",
            "봉입건수":       "{:,.0f}",
            "확정청구페이지": "{:,.0f}",
        }),
        use_container_width=True, height=400,
    )


# ════════════════════════════════════════════════════════════
# 탭 3 — 담당자별 현황
# ════════════════════════════════════════════════════════════
with tab3:
    st.header(f"담당자별 현황  {'['+', '.join(선택_사업부)+']' if 선택_사업부 else '[전체]'}")

    has_작업자 = "등록자" in df.columns and not df["등록자"].isna().all()

    # 마케팅담당자 집계 — 사업부 컬럼을 "구분"으로 사용
    staff_mk = df.groupby(["마케팅담당자", "사업부"]).agg(
        출력페이지=("출력페이지", "sum"),
        봉입건수=("건수", "sum"),
    ).reset_index().rename(columns={"마케팅담당자": "담당자명", "사업부": "구분"})

    if has_작업자:
        staff_op = df[df["등록자"].notna()].groupby("등록자").agg(
            출력페이지=("출력페이지", "sum"),
            봉입건수=("건수", "sum"),
        ).reset_index().rename(columns={"등록자": "담당자명"})
        staff_op["담당자명"] = staff_op["담당자명"] + "(작업자)"
        staff_op["구분"] = "작업자"
        staff_all = pd.concat([staff_mk, staff_op], ignore_index=True)
    else:
        staff_all = staff_mk

    # 막대 순서: 작업자 → DM사업부 → N사업부, 각 그룹 내 값 내림차순
    구분_순서 = {"작업자": 0, "DM사업부": 1, "N사업부": 2}
    color_map  = {"작업자": "#55A868", "DM사업부": "#4C72B0", "N사업부": "#DD8452"}
    legend_순서 = ["작업자", "DM사업부", "N사업부"]

    staff_all["_순서"] = staff_all["구분"].map(구분_순서)
    staff_출력 = staff_all.sort_values(["_순서", "출력페이지"], ascending=[True, False])
    staff_봉   = staff_all.sort_values(["_순서", "봉입건수"],   ascending=[True, False])

    col1, col2 = st.columns(2)
    with col1:
        fig = px.bar(staff_출력, x="담당자명", y="출력페이지", color="구분",
                     color_discrete_map=color_map,
                     category_orders={"구분": legend_순서},
                     title="담당자별 출력페이지",
                     text=[f"{int(v/10_000)/100:.2f}M" for v in staff_출력["출력페이지"]])
        fig.update_traces(textposition="outside")
        st.plotly_chart(fig, use_container_width=True)
    with col2:
        fig2 = px.bar(staff_봉, x="담당자명", y="봉입건수", color="구분",
                      color_discrete_map=color_map,
                      category_orders={"구분": legend_순서},
                      title="담당자별 봉입건수",
                      text=[f"{int(v/10_000)/100:.2f}M" for v in staff_봉["봉입건수"]])
        fig2.update_traces(textposition="outside")
        st.plotly_chart(fig2, use_container_width=True)

    # ── 시간대별 히트맵 ───────────────────────────────────────
    st.divider()
    st.subheader("시간대별 업무 집중도")

    heat_df = df[df["시간대"].notna()].copy()
    heat_df["시간대"] = heat_df["시간대"].astype(int)
    pivot = heat_df.groupby(["마케팅담당자","시간대"]).agg(
        건수=("건수","sum")
    ).reset_index().pivot(index="마케팅담당자", columns="시간대", values="건수").fillna(0)
    for h in range(24):
        if h not in pivot.columns:
            pivot[h] = 0
    pivot = pivot[list(range(24))]
    fig3 = px.imshow(pivot, labels=dict(x="시간대", y="담당자", color="봉입건수"),
                     color_continuous_scale="YlOrRd", aspect="auto",
                     title="마케팅담당자 × 시간대 (봉입건수 합계)")
    fig3.update_layout(height=380)

    if has_작업자:
        hm1, hm2 = st.columns(2)
        with hm1:
            st.plotly_chart(fig3, use_container_width=True)

        heat_e = df[df["시간대"].notna() & df["등록자"].notna()].copy()
        heat_e["시간대"] = heat_e["시간대"].astype(int)
        pivot_e = heat_e.groupby(["등록자","시간대"]).agg(
            건수=("건수","sum")
        ).reset_index().pivot(index="등록자", columns="시간대", values="건수").fillna(0)
        for h in range(24):
            if h not in pivot_e.columns:
                pivot_e[h] = 0
        pivot_e = pivot_e[list(range(24))]
        fig_e3 = px.imshow(pivot_e, labels=dict(x="시간대", y="작업자", color="봉입건수"),
                           color_continuous_scale="Blues", aspect="auto",
                           title="작업자 × 시간대 (봉입건수 합계)")
        fig_e3.update_layout(height=380)
        with hm2:
            st.plotly_chart(fig_e3, use_container_width=True)
    else:
        st.plotly_chart(fig3, use_container_width=True)


# ── 거래처 삭제 확인 다이얼로그 ─────────────────────────────
@st.dialog("거래처 삭제 확인")
def _거래처삭제_dialog(거래처_목록):
    if len(거래처_목록) == 1:
        st.warning(f"**'{거래처_목록[0]}'** 거래처를 삭제하시겠습니까?")
    else:
        st.warning(f"선택한 {len(거래처_목록)}개 거래처를 삭제하시겠습니까?\n\n" +
                   "\n".join(f"• {n}" for n in 거래처_목록))
    st.caption("삭제 후 복구할 수 없습니다.")
    c1, c2 = st.columns(2)
    with c1:
        if st.button("삭제", type="primary", use_container_width=True, key="dlg_del_confirm"):
            conn = get_conn()
            for 거래처명 in 거래처_목록:
                conn.execute("DELETE FROM 거래처마스터 WHERE 거래처명 = ?", (거래처명,))
            conn.commit()
            conn.close()
            st.cache_data.clear()
            st.rerun()
    with c2:
        if st.button("취소", use_container_width=True, key="dlg_del_cancel"):
            st.rerun()

# ════════════════════════════════════════════════════════════
# 탭 4 — 거래명세서 관리
# ════════════════════════════════════════════════════════════
with tab4:
    st.header("거래명세서 관리")

    # 거래명세서 요청 완료 후 성공 메시지 + 탭 자동 이동 (2회 rerun 동안 유지)
    if st.session_state.pop("t4_요청완료", False):
        st.session_state["t4_탭이동"] = 2
        st.success("거래명세서 발행 요청이 완료되었습니다. 발행요청목록 탭을 확인해 주세요.")

    if st.session_state.get("t4_탭이동", 0) > 0:
        st.session_state["t4_탭이동"] -= 1
        components.html("""
        <script>
        setTimeout(function() {
            const tabs = window.parent.document.querySelectorAll('[data-baseweb="tab"]');
            for (const tab of tabs) {
                if (tab.textContent.trim() === '발행요청목록') {
                    tab.click();
                    break;
                }
            }
        }, 200);
        </script>
        """, height=0)

    # ── 공용: 단가맵·자재map (t4a·t4c 공유) ────────────────────
    _t4_단가컬럼 = ["출력단가","봉입단가","추가봉입단가","용지제작단가","봉투제작단가","삽지제작단가","각대대봉투단가","각대대봉투봉입단가"]
    _t4_단가df   = load_단가마스터()
    _t4_단가컬럼 = [c for c in _t4_단가컬럼 if c in _t4_단가df.columns]
    _t4_단가맵 = {
        (r["거래처명"],
         None if pd.isna(r["업무명"]) else r["업무명"],
         None if pd.isna(r["작업명"]) else r["작업명"]): {c: r[c] for c in _t4_단가컬럼}
        for _, r in _t4_단가df.iterrows()
    }

    _t4_자재_summary = load_자재_summary()
    _t4_자재map = {
        (int(r["업무의뢰서번호"]), r["작업이름"]): {
            "일반봉투_수량":   int(r.get("일반봉투_수량",   0)),
            "각대대봉투_수량": int(r.get("각대대봉투_수량", 0)),
            "용지_수량":       int(r.get("용지_수량",       0)),
            "삽지_수량":       int(r.get("삽지_수량",       0)),
        }
        for _, r in _t4_자재_summary.iterrows()
    } if not _t4_자재_summary.empty else {}

    def calc_공급가맵(의뢰서번호셋):
        """의뢰서번호 집합 → {의뢰서번호int: {"합계": float, "거래처명": str, "업무명": str,
                                               "항목": {품명: 금액}, "수량": {품명: 수량}, "단가": {품명: 단가}}}"""
        _tgt = df_all[df_all["업무의뢰서번호"].apply(
            lambda x: int(float(x)) if pd.notna(x) else -1
        ).isin(의뢰서번호셋)].copy()
        if _tgt.empty:
            return {}
        _tgt["_의뢰서int"] = _tgt["업무의뢰서번호"].apply(lambda x: int(float(x)) if pd.notna(x) else -1)
        _g = _tgt.groupby(["_의뢰서int","작업명","거래처명","업무명"], sort=False).agg(
            출력단가기준페이지=("확정청구페이지", "sum"),
            봉입건수=("건수", "sum"),
            장수=("장수", "sum"),
        ).reset_index()
        결과 = {}
        for _, _r in _g.iterrows():
            의뢰서 = _r["_의뢰서int"]
            작업   = _r["작업명"]
            거래처 = _r["거래처명"]
            업무   = _r["업무명"]
            rates = (
                _t4_단가맵.get((거래처, 업무, 작업))
                or _t4_단가맵.get((거래처, 업무, None))
                or _t4_단가맵.get((거래처, None, None))
            )
            if not rates:
                continue
            z = _t4_자재map.get((의뢰서, 작업), {"일반봉투_수량":0,"각대대봉투_수량":0,"용지_수량":0,"삽지_수량":0})
            일반봉투   = z["일반봉투_수량"]
            각대대봉투 = z["각대대봉투_수량"]
            용지       = z["용지_수량"]
            삽지       = z["삽지_수량"]
            봉입건수   = _r["봉입건수"]
            장수       = _r["장수"]
            추가용지   = max(0, 장수 - 봉입건수)
            청구페이지 = _r["출력단가기준페이지"]
            항목금액 = {
                "출력비":    청구페이지 * rates.get("출력단가", 0),
                "봉입비":    봉입건수   * rates.get("봉입단가", 0) + 각대대봉투 * rates.get("각대대봉투봉입단가", 0),
                "용지제작비": 용지      * rates.get("용지제작단가", 0),
                "봉투제작비": 일반봉투  * rates.get("봉투제작단가", 0) + 각대대봉투 * rates.get("각대대봉투단가", 0),
                "추가봉입비": (삽지 + 추가용지) * rates.get("추가봉입단가", 0),
                "삽지봉입비": 삽지      * rates.get("삽지제작단가", 0),
            }
            항목수량 = {
                "출력비":    청구페이지,
                "봉입비":    봉입건수 + 각대대봉투,
                "용지제작비": 용지,
                "봉투제작비": 일반봉투 + 각대대봉투,
                "추가봉입비": 삽지 + 추가용지,
                "삽지봉입비": 삽지,
            }
            항목단가 = {
                "출력비":    rates.get("출력단가", 0),
                "봉입비":    rates.get("봉입단가", 0),
                "용지제작비": rates.get("용지제작단가", 0),
                "봉투제작비": rates.get("봉투제작단가", 0),
                "추가봉입비": rates.get("추가봉입단가", 0),
                "삽지봉입비": rates.get("삽지제작단가", 0),
            }
            소계 = sum(항목금액.values())
            if 의뢰서 not in 결과:
                결과[의뢰서] = {"합계": 0, "거래처명": 거래처, "업무명": 업무,
                                "항목": {k: 0 for k in 항목금액}, "수량": {k: 0 for k in 항목수량}, "단가": {}}
            결과[의뢰서]["합계"] += 소계
            for k in 항목금액:
                결과[의뢰서]["항목"][k] = 결과[의뢰서]["항목"].get(k, 0) + 항목금액[k]
                결과[의뢰서]["수량"][k] = 결과[의뢰서]["수량"].get(k, 0) + 항목수량[k]
                결과[의뢰서]["단가"][k]  = 항목단가[k]  # 마지막 작업명 단가 사용 (단순화)
        return 결과

    def generate_거래명세서_excel(의뢰서번호셋, 발행일):
        """zipfile+regex로 템플릿 xlsx 가변 셀만 교체 — Excel 불필요, 빠름."""
        import zipfile, re, os, tempfile
        from pathlib import Path
        from collections import defaultdict
        from num2words import num2words

        src_path = Path(__file__).parent.parent / "data" / "거래명세서_템플릿_base.xlsx"

        # ── 품목 정의 ────────────────────────────────────────────────
        품목순서 = ["출력비", "봉입비", "출력자재비", "봉입자재비", "추가봉입비", "삽지비"]
        코드맵   = {"출력비": "P", "봉입비": "M", "출력자재비": "F",
                    "봉입자재비": "E", "추가봉입비": "M", "삽지비": "M"}
        순서맵   = {p: i for i, p in enumerate(품목순서)}

        # ── 데이터 계산 ──────────────────────────────────────────────
        _tgt = df_all[df_all["업무의뢰서번호"].apply(
            lambda x: int(float(x)) if pd.notna(x) else -1
        ).isin(의뢰서번호셋)].copy()
        if _tgt.empty:
            return None

        _g = _tgt.groupby(["작업명", "거래처명", "업무명"], sort=False).agg(
            청구페이지=("확정청구페이지", "sum"),
            봉입건수=("건수", "sum"),
            장수=("장수", "sum"),
        ).reset_index()

        거래처명 = _g.iloc[0]["거래처명"]
        업무명   = _g.iloc[0]["업무명"]

        행데이터 = defaultdict(lambda: {"수량": 0.0, "금액": 0.0})
        for _, _r in _g.iterrows():
            작업   = _r["작업명"]
            거래처 = _r["거래처명"]
            업무   = _r["업무명"]
            rates = (
                _t4_단가맵.get((거래처, 업무, 작업))
                or _t4_단가맵.get((거래처, 업무, None))
                or _t4_단가맵.get((거래처, None, None))
            )
            if not rates:
                continue
            일반봉투 = 각대대봉투 = 용지 = 삽지 = 0
            for 번호 in 의뢰서번호셋:
                z = _t4_자재map.get((번호, 작업), {})
                일반봉투   += z.get("일반봉투_수량", 0)
                각대대봉투 += z.get("각대대봉투_수량", 0)
                용지       += z.get("용지_수량", 0)
                삽지       += z.get("삽지_수량", 0)
            봉입건수 = _r["봉입건수"]
            장수     = _r["장수"]
            청구     = _r["청구페이지"]
            추가용지 = max(0, 장수 - 봉입건수)
            항목계산 = {
                "출력비":    (청구,                  rates.get("출력단가", 0)),
                "봉입비":    (봉입건수 + 각대대봉투, rates.get("봉입단가", 0)),
                "출력자재비": (용지,                  rates.get("용지제작단가", 0)),
                "봉입자재비": (일반봉투 + 각대대봉투, rates.get("봉투제작단가", 0)),
                "추가봉입비": (삽지 + 추가용지,       rates.get("추가봉입단가", 0)),
                "삽지비":    (삽지,                   rates.get("삽지제작단가", 0)),
            }
            for 품목, (수량, 단가) in 항목계산.items():
                if 단가 > 0 and 수량 > 0:
                    행데이터[(품목, 작업, 단가)]["수량"] += 수량
                    행데이터[(품목, 작업, 단가)]["금액"] += 수량 * 단가

        정렬행 = sorted(행데이터.items(), key=lambda x: (순서맵.get(x[0][0], 99), x[0][1]))
        if not 정렬행:
            return None
        총합계 = sum(v["금액"] for _, v in 정렬행)
        구분날짜 = f"{발행일.month:02d}월{발행일.day:02d}일"

        # ── zipfile로 템플릿 복사 → sheet2.xml 가변 셀 교체 → bytes 반환 ──
        def _esc(text):
            return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

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

        with zipfile.ZipFile(src_path, 'r') as zin:
            file_map = {name: zin.read(name) for name in zin.namelist()}

        xml = file_map["xl/worksheets/sheet2.xml"].decode("utf-8")

        # 헤더
        xml = _set_str(xml, "B10", 발행일.strftime("%Y-%m-%d"))
        xml = _set_str(xml, "B11", 거래처명)
        xml = _set_str(xml, "B12", 업무명)
        xml = _set_str(xml, "D14", f"금 {num2words(round(총합계), lang='ko')}")
        xml = _set_num(xml, "K14", round(총합계))
        xml = _set_num(xml, "K30", round(총합계))
        xml = _set_num(xml, "J31", round(총합계))

        # 품목 행 (16~25)
        첫행 = True
        for i, ((품목, 작업명_key, 단가), v) in enumerate(정렬행):
            if i >= 10:
                break
            r = 16 + i
            xml = _set_str(xml, f"A{r}", 코드맵.get(품목, "M"))
            if 첫행:
                xml = _set_str(xml, f"B{r}", 구분날짜)
                첫행 = False
            품명표시 = f"{품목}({작업명_key})" if 작업명_key else 품목
            xml = _set_str(xml, f"D{r}", 품명표시)
            xml = _set_num(xml, f"I{r}", int(v["수량"]))
            xml = _set_num(xml, f"J{r}", 단가)
            xml = _set_num(xml, f"K{r}", round(v["금액"]))

        file_map["xl/worksheets/sheet2.xml"] = xml.encode("utf-8")

        tmp_path = os.path.join(tempfile.gettempdir(), "거래명세서_tmp.xlsx")
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for name, data in file_map.items():
                zout.writestr(name, data)

        with open(tmp_path, "rb") as f:
            return f.read()

    t4a, t4b, t4c = st.tabs(["미발행 목록", "거래처 마스터", "발행요청목록"])

    with t4a:
        st.subheader("미발행 업무의뢰서 목록")

        # 발행요청된 번호 수집 (발행여부 관계없이 이력에 있는 모든 번호를 미발행 목록에서 제외)
        이력df = load_이력()
        발행요청_번호 = set()
        for _, row in 이력df.iterrows():
            if row["업무의뢰서번호목록"]:
                try:
                    import json as _json
                    발행요청_번호.update(
                        int(float(n)) for n in _json.loads(row["업무의뢰서번호목록"])
                    )
                except Exception:
                    pass

        # df 는 이미 기간·사업부·거래처·담당자·업무명 필터가 모두 적용된 상태
        summary = build_의뢰서_summary(df)
        미발송 = summary[~summary["업무의뢰서번호"].apply(
            lambda x: int(float(x)) if pd.notna(x) else -1
        ).isin(발행요청_번호)].copy()
        미발송 = 미발송.sort_values("날짜", ascending=False)

        # ── 업무의뢰서번호 검색 필터 ─────────────────────────────
        if "t4a_검색번호" not in st.session_state:
            st.session_state["t4a_검색번호"] = set()
        af1, af2, af3 = st.columns([6, 1, 1.3])
        with af1:
            t4a_검색입력 = st.text_input(
                "검색", placeholder="의뢰서번호 붙여넣기  예: 94361|94362|94363",
                key="t4a_검색입력", label_visibility="collapsed",
            )
        with af2:
            if st.button("검색", key="t4a_검색_btn", use_container_width=True) and t4a_검색입력.strip():
                st.session_state["t4a_검색번호"] = {n.strip() for n in t4a_검색입력.split("|") if n.strip()}
        with af3:
            if st.button("전체 보기", key="t4a_검색초기화_btn", use_container_width=True):
                st.session_state["t4a_검색번호"] = set()

        t4a_검색번호 = st.session_state["t4a_검색번호"]
        if t4a_검색번호:
            미발송_str = 미발송["업무의뢰서번호"].apply(
                lambda x: str(int(float(x))) if pd.notna(x) else ""
            )
            미발송 = 미발송[미발송_str.isin(t4a_검색번호)]
            if 미발송.empty:
                st.warning(f"검색한 의뢰서번호 {len(t4a_검색번호)}건이 미발행 목록에 없습니다.")

        # 공용 calc_공급가맵 사용 (탭 밖에서 정의됨)
        미발송_번호셋 = set(
            미발송["업무의뢰서번호"].apply(lambda x: int(float(x)) if pd.notna(x) else -1)
        )
        공급가맵 = calc_공급가맵(미발송_번호셋)

        미발송["예상공급가액"] = 미발송["업무의뢰서번호"].apply(
            lambda x: int(공급가맵[int(float(x))]["합계"]) if (pd.notna(x) and int(float(x)) in 공급가맵 and 공급가맵[int(float(x))]["합계"] > 0) else None
        )

        # 인덱스 리셋 (선택 후 원본 매핑용)
        미발송_r = 미발송.reset_index(drop=True)

        # 의뢰서번호: 정수 문자열로 변환 (소수점 제거)
        미발송_r["업무의뢰서번호_str"] = 미발송_r["업무의뢰서번호"].apply(
            lambda x: str(int(float(x))) if pd.notna(x) else ""
        )

        # 전체선택/취소 상태 초기화
        if "t4_전체선택" not in st.session_state:
            st.session_state.t4_전체선택 = False
        if "t4_선택버전" not in st.session_state:
            st.session_state.t4_선택버전 = 0

        # 미발송 목록 표시용 DataFrame
        _단가미등록여부 = 미발송_r["예상공급가액"].isna()
        display_df = pd.DataFrame({
            "선택":           st.session_state.t4_전체선택,
            "No":             range(1, len(미발송_r) + 1),
            "단가":           ["⚠️ 미등록" if v else "" for v in _단가미등록여부],
            "담당자":         미발송_r["마케팅담당자"].values,
            "의뢰서번호":     미발송_r["업무의뢰서번호_str"].values,
            "사업부":         미발송_r["사업부"].values,
            "거래처명":       미발송_r["거래처명"].values,
            "업무명":         미발송_r["업무명"].values,
            "업무명상세":     미발송_r["업무명상세"].values,
            "작업일자":       미발송_r["날짜"].values,
            "청구페이지":     pd.to_numeric(미발송_r["확정청구페이지"],          errors="coerce").values,
            "장수":           pd.to_numeric(미발송_r["장수_합"],                  errors="coerce").values,
            "봉입건수":       pd.to_numeric(미발송_r["봉입건수_합"],              errors="coerce").values,
            "용지수량":       pd.to_numeric(미발송_r.get("용지_사용량_합", 0),   errors="coerce").values,
            "봉투수량":       pd.to_numeric(미발송_r.get("봉투_사용량_합", 0),   errors="coerce").values,
            "삽지수량":       pd.to_numeric(미발송_r.get("삽지_사용량_합", 0),   errors="coerce").values,
            "예상공급가액":   pd.to_numeric(미발송_r["예상공급가액"],             errors="coerce").values,
        })

        # 전체선택 체크박스 (선택 컬럼 헤더 역할) + 미발송 건수
        cb_c, cnt_c = st.columns([1.5, 8.5])
        with cb_c:
            새_전체선택 = st.checkbox(
                "선택 (전체)",
                value=st.session_state.t4_전체선택,
                key="t4_전체선택_cb",
            )
        with cnt_c:
            st.caption(f"미발행 {len(미발송_r):,}건")

        if 새_전체선택 != st.session_state.t4_전체선택:
            st.session_state.t4_전체선택 = 새_전체선택
            st.session_state.t4_선택버전 += 1
            st.rerun()

        선택결과 = st.data_editor(
            display_df,
            column_config={
                "선택":           st.column_config.CheckboxColumn("선택",        pinned=True),
                "No":             st.column_config.NumberColumn("No",            format="%d",  pinned=True),
                "단가":           st.column_config.TextColumn("단가",            pinned=True),
                "담당자":         st.column_config.TextColumn("담당자",          pinned=True),
                "의뢰서번호":     st.column_config.TextColumn("의뢰서번호",      pinned=True),
                "사업부":         st.column_config.TextColumn("사업부",          pinned=True),
                "거래처명":       st.column_config.TextColumn("거래처명",        pinned=True),
                "업무명":         st.column_config.TextColumn("업무명",          pinned=True),
                "청구페이지":     st.column_config.NumberColumn("청구페이지",    format="%,d"),
                "장수":           st.column_config.NumberColumn("장수",          format="%,d"),
                "봉입건수":       st.column_config.NumberColumn("봉입건수",      format="%,d"),
                "용지수량":       st.column_config.NumberColumn("용지수량",      format="%,d"),
                "봉투수량":       st.column_config.NumberColumn("봉투수량",      format="%,d"),
                "삽지수량":       st.column_config.NumberColumn("삽지수량",      format="%,d"),
                "예상공급가액":   st.column_config.NumberColumn("예상공급가액",  format="%,d"),
            },
            disabled=["No","단가","담당자","의뢰서번호","사업부","거래처명","업무명","업무명상세","작업일자",
                      "청구페이지","장수","봉입건수","봉투수량","용지수량","삽지수량","예상공급가액"],
            hide_index=True,
            use_container_width=True,
            height=380,
            key=f"미발송_선택_{st.session_state.t4_선택버전}",
        )

        # 선택된 행 → 원본 미발송_r에서 가져오기
        선택_idx = 선택결과[선택결과["선택"] == True].index.tolist()
        선택된 = 미발송_r.iloc[선택_idx]

        if not 선택된.empty:
            st.divider()

            # 합계 (원본 숫자로 계산)
            총청구 = int(선택된["확정청구페이지"].sum())
            총봉입 = int(선택된["봉입건수_합"].sum())
            총장수 = int(선택된["장수_합"].sum())
            총공급_s = 선택된["예상공급가액"]
            총공급 = 총공급_s.sum() if 총공급_s.notna().all() else None
            총공급str = f"{int(총공급):,}원" if 총공급 is not None else "단가 미등록"

            # ── 선택된 업무의뢰서 타이틀 + 복사
            st.markdown("**선택된 업무의뢰서**")

            # 공백 제거한 번호 목록 (파이프 구분자)
            번호목록 = "|".join(n.strip() for n in 선택된["업무의뢰서번호_str"].tolist())
            components.html(f"""
<div style="display:flex;align-items:center;gap:10px;padding:4px 0;font-family:sans-serif;">
  <button id="cpBtn"
    onclick="var txt=document.getElementById('numTxt').textContent.replace(/\\s+/g,'');
             navigator.clipboard.writeText(txt)
               .then(function(){{document.getElementById('cpBtn').textContent='✅ 복사됨';}})
               .catch(function(){{alert('복사 실패');}});"
    style="cursor:pointer;padding:4px 14px;border-radius:4px;border:1px solid #bbb;
           background:#f0f2f6;font-size:0.82rem;white-space:nowrap;">
    📋 복사
  </button>
  <code id="numTxt"
    style="font-size:0.83rem;background:#f0f2f6;padding:4px 10px;
           border-radius:4px;flex:1;word-break:break-all;">
    {번호목록}
  </code>
</div>""", height=46)

            # 자재 수량 합계
            총봉투 = int(선택된["봉투_사용량_합"].sum()) if "봉투_사용량_합" in 선택된.columns else 0
            총용지 = int(선택된["용지_사용량_합"].sum()) if "용지_사용량_합" in 선택된.columns else 0
            총삽지 = int(선택된["삽지_사용량_합"].sum()) if "삽지_사용량_합" in 선택된.columns else 0
            총추가용지 = (총장수 - 총봉입) if (총장수 > 0 and 총봉입 > 0) else 0

            # 합계 텍스트 — 폰트 크게, 진하게
            st.markdown(
                f"<p style='font-size:1.05rem;font-weight:bold;margin:4px 0;'>"
                f"청구페이지: {총청구:,} &nbsp;|&nbsp; "
                f"봉입건수: {총봉입:,} &nbsp;|&nbsp; "
                f"장수: {총장수:,} &nbsp;|&nbsp; "
                f"봉투: {총봉투:,} &nbsp;|&nbsp; "
                f"용지: {총용지:,} &nbsp;|&nbsp; "
                f"추가용지: {총추가용지:,} &nbsp;|&nbsp; "
                f"삽지: {총삽지:,} &nbsp;|&nbsp; "
                f"예상공급가액: {총공급str}</p>",
                unsafe_allow_html=True,
            )

            # 선택된 항목 중 단가 미등록 의뢰서번호 목록
            미등록_번호목록 = 선택된[선택된["예상공급가액"].isna()]["업무의뢰서번호_str"].tolist()

            btn_col, warn_col = st.columns([2, 8])
            with btn_col:
                요청_클릭 = st.button("거래명세서 요청", type="primary",
                                      disabled=bool(미등록_번호목록),
                                      help="단가가 등록된 경우에만 활성화됩니다.")
            with warn_col:
                if 미등록_번호목록:
                    st.warning(
                        f"단가 미등록 의뢰서 {len(미등록_번호목록)}건이 선택에 포함되어 있습니다. "
                        f"거래처 마스터 탭에서 단가를 입력해 주세요.\n\n"
                        f"미등록 의뢰서번호: {', '.join(미등록_번호목록)}"
                    )

            if 요청_클릭:
                import json as _json_req
                번호목록  = 선택된["업무의뢰서번호_str"].tolist()
                거래처    = 선택된["거래처명"].iloc[0]
                담당자들  = ", ".join(선택된["마케팅담당자"].unique())
                품목들    = ", ".join(선택된["업무명"].unique())
                세액_amt  = int(총공급 * 0.1)
                합계_amt  = int(총공급 + 세액_amt)

                conn = get_conn()
                conn.execute("""
                    INSERT INTO 거래명세서이력
                        (거래처명, 업무의뢰서번호목록, 발행일자, 품목,
                         공급가액, 세액, 합계, 발송여부, 담당자)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                """, (
                    거래처,
                    _json_req.dumps(번호목록),
                    str(date.today()),
                    품목들,
                    int(총공급),
                    세액_amt,
                    합계_amt,
                    담당자들,
                ))
                conn.commit()
                conn.close()
                st.cache_data.clear()
                st.session_state["t4_요청완료"] = True
                st.rerun()

            # ── 세부내역 (용지/봉투/삽지는 의뢰서 단위 합계라 행별 표기 불가 → 합계 텍스트에서 확인)
            st.markdown("**선택 항목 세부 내역**")
            선택번호_int = {int(float(n)) for n in 선택된["업무의뢰서번호_str"]}
            NUM_COLS = ["장수","건수","출력페이지","청구페이지"]

            세부 = df_all[
                df_all["업무의뢰서번호"].apply(
                    lambda x: int(float(x)) if pd.notna(x) else -1
                ).isin(선택번호_int)
            ].copy()
            세부["업무의뢰서번호"] = 세부["업무의뢰서번호"].apply(
                lambda x: str(int(float(x))) if pd.notna(x) else ""
            )
            세부 = 세부[["업무의뢰서번호","거래처명","작업일자","업무명","업무명상세","작업내역서상세","P수"] + NUM_COLS].reset_index(drop=True)

            # 의뢰서 2개 이상 선택 시 의뢰서번호별 소계 행 추가
            if len(선택번호_int) > 1:
                rows = []
                for req_no, grp in 세부.groupby("업무의뢰서번호", sort=False):
                    rows.append(grp)
                    sub = {c: "" for c in 세부.columns}
                    sub["업무의뢰서번호"] = req_no
                    sub["업무명"] = "▶ 소계"
                    for c in NUM_COLS:
                        sub[c] = grp[c].sum()
                    rows.append(pd.DataFrame([sub]))
                세부 = pd.concat(rows, ignore_index=True)

            세부.insert(0, "No", range(1, len(세부) + 1))

            def _style(row):
                if row["업무명"] == "▶ 소계":
                    return ["font-weight:bold"] * len(row)
                return [""] * len(row)

            styled = 세부.style.apply(_style, axis=1).format(
                {c: "{:,.0f}" for c in NUM_COLS},
                na_rep="",
            )
            st.dataframe(styled, use_container_width=True, height=320, hide_index=True,
                         column_config={
                             "No":         st.column_config.NumberColumn("No",         pinned=True),
                             "업무의뢰서번호": st.column_config.TextColumn("업무의뢰서번호", pinned=True),
                             "거래처명":   st.column_config.TextColumn("거래처명",      pinned=True),
                             "작업일자":   st.column_config.TextColumn("작업일자",      pinned=True),
                             "업무명":     st.column_config.TextColumn("업무명",        pinned=True),
                         })

    with t4b:
        st.subheader("거래처 마스터 관리")

        # 탭 상태 초기화 (key 없이 index로만 제어 — 프로그래밍 전환 가능)
        if "t4b_탭_요청" not in st.session_state:
            st.session_state["t4b_탭_요청"] = "기본정보"

        t4b_탭 = st.radio(
            "", ["기본정보", "단가 관리"],
            horizontal=True,
            index=0 if st.session_state["t4b_탭_요청"] == "기본정보" else 1,
        )
        # 사용자가 직접 탭 클릭 시 상태 동기화
        if t4b_탭 != st.session_state["t4b_탭_요청"]:
            st.session_state["t4b_탭_요청"] = t4b_탭
        st.divider()

        if t4b_탭 == "기본정보":
            master = load_master()
            display_df = master[["거래처명","사업자등록번호","수신이메일","비고"]].copy()
            display_df.insert(0, "선택", False)
            edited = st.data_editor(
                display_df,
                num_rows="dynamic",
                column_config={
                    "선택":           st.column_config.CheckboxColumn("선택", pinned=True, default=False),
                    "거래처명":       st.column_config.TextColumn("거래처명", required=True),
                    "사업자등록번호": st.column_config.TextColumn("사업자등록번호"),
                    "수신이메일":     st.column_config.TextColumn("수신이메일"),
                    "비고":           st.column_config.TextColumn("비고"),
                },
                use_container_width=True,
                key="master_editor",
            )
            선택된_목록 = edited.loc[edited["선택"] == True, "거래처명"].dropna().tolist()
            save_c, del_c, move_c, _ = st.columns([1, 1, 2, 6])
            with save_c:
                if st.button("저장", type="primary", key="master_save"):
                    from datetime import date
                    conn = get_conn()
                    conn.execute("DELETE FROM 거래처마스터")
                    save_df = edited.drop(columns=["선택"])
                    save_df["수정일"] = str(date.today())
                    if "등록일" not in save_df.columns:
                        save_df["등록일"] = str(date.today())
                    save_df.to_sql("거래처마스터", conn, if_exists="append", index=False)
                    conn.close()
                    st.cache_data.clear()
                    st.success("저장되었습니다.")
                    st.rerun()
            with del_c:
                if st.button("삭제", key="master_del_btn", disabled=not 선택된_목록):
                    _거래처삭제_dialog(선택된_목록)
            with move_c:
                if st.button(
                    "→ 단가 관리",
                    key="master_goto_단가",
                    disabled=len(선택된_목록) != 1,
                    help="거래처를 1개 선택한 후 클릭하세요.",
                ):
                    st.session_state["단가_거래처_selectbox"] = 선택된_목록[0]
                    st.session_state["t4b_탭_요청"] = "단가 관리"
                    st.rerun()

        elif t4b_탭 == "단가 관리":
            master_단가탭 = load_master()
            거래처목록_단가 = master_단가탭["거래처명"].dropna().tolist()
            if not 거래처목록_단가:
                st.info("먼저 기본정보 탭에서 거래처를 등록해 주세요.")
            else:
                선택_거래처_단가 = st.selectbox(
                    "거래처 선택",
                    거래처목록_단가,
                    key="단가_거래처_selectbox",
                )
                단가df = load_단가마스터()
                해당_단가 = 단가df[단가df["거래처명"] == 선택_거래처_단가].copy()

                # ── 기존 단가 목록 ──────────────────────────────
                st.markdown("##### 등록된 단가 목록")
                st.caption("단가만 수정 가능합니다. 업무명·작업명 변경이 필요하면 삭제 후 재등록하세요.")

                if 해당_단가.empty:
                    st.info("등록된 단가가 없습니다. 아래에서 추가하세요.")
                    edited_단가 = pd.DataFrame()
                else:
                    _표시컬럼 = [c for c in ["id","업무명","작업명","출력단가","봉입단가","추가봉입단가","각대대봉투봉입단가","용지제작단가","봉투제작단가","삽지제작단가","각대대봉투단가","비고"] if c in 해당_단가.columns]
                    표시df = 해당_단가[_표시컬럼].copy()
                    표시df["업무명"] = 표시df["업무명"].fillna("(기본단가)")
                    표시df["작업명"] = 표시df["작업명"].fillna("(기본단가)")
                    표시df["비고"]   = 표시df["비고"].fillna("")
                    표시df.insert(0, "선택", False)

                    edited_단가 = st.data_editor(
                        표시df,
                        num_rows="fixed",
                        column_config={
                            "선택":         st.column_config.CheckboxColumn("선택", default=False),
                            "id":           None,
                            "업무명":       st.column_config.TextColumn("업무명",   disabled=True),
                            "작업명":       st.column_config.TextColumn("작업명",   disabled=True),
                            "출력단가":     st.column_config.NumberColumn("출력단가(원)",     min_value=0, default=0, format="%.2f"),
                            "봉입단가":     st.column_config.NumberColumn("봉입단가(원)",     min_value=0, default=0, format="%.2f"),
                            "추가봉입단가": st.column_config.NumberColumn("추가봉입단가(원)", min_value=0, default=0, format="%.2f"),
                            "용지제작단가": st.column_config.NumberColumn("용지제작단가(원)", min_value=0, default=0, format="%.2f"),
                            "각대대봉투봉입단가": st.column_config.NumberColumn("수작업 단가(원)",      min_value=0, default=0, format="%.2f"),
                            "봉투제작단가":    st.column_config.NumberColumn("봉투제작단가(원)",      min_value=0, default=0, format="%.2f"),
                            "삽지제작단가":    st.column_config.NumberColumn("삽지제작단가(원)",      min_value=0, default=0, format="%.2f"),
                            "각대대봉투단가":  st.column_config.NumberColumn("각대대봉투단가(원)",    min_value=0, default=0, format="%.2f"),
                            "비고":            st.column_config.TextColumn("비고"),
                        },
                        use_container_width=True,
                        hide_index=True,
                        key="단가_editor",
                    )

                    선택된_단가행 = edited_단가.loc[edited_단가["선택"] == True]
                    dsave_c, ddel_c, _ = st.columns([1, 1, 8])

                    with dsave_c:
                        if st.button("저장", type="primary", key="단가_save"):
                            from datetime import date as _date
                            today = str(_date.today())
                            conn = get_conn()
                            for _, r in edited_단가.iterrows():
                                if pd.isna(r["id"]):
                                    continue
                                conn.execute("""
                                    UPDATE 단가마스터
                                    SET 출력단가=?, 봉입단가=?, 추가봉입단가=?,
                                        용지제작단가=?, 봉투제작단가=?, 삽지제작단가=?,
                                        각대대봉투단가=?, 각대대봉투봉입단가=?, 비고=?, 수정일=?
                                    WHERE id=?
                                """, (r["출력단가"] or 0, r["봉입단가"] or 0,
                                      r["추가봉입단가"] or 0, r["용지제작단가"] or 0,
                                      r["봉투제작단가"] or 0, r["삽지제작단가"] or 0,
                                      r.get("각대대봉투단가") or 0, r.get("각대대봉투봉입단가") or 0,
                                      r["비고"] if r["비고"] != "" else None,
                                      today, int(r["id"])))
                            conn.commit()
                            conn.close()
                            st.cache_data.clear()
                            st.success("저장되었습니다.")
                            st.rerun()

                    with ddel_c:
                        삭제_ids = 선택된_단가행["id"].dropna().tolist() if not 선택된_단가행.empty else []
                        if st.button("삭제", key="단가_del_btn", disabled=not 삭제_ids):
                            conn = get_conn()
                            for _id in 삭제_ids:
                                conn.execute("DELETE FROM 단가마스터 WHERE id=?", (int(_id),))
                            conn.commit()
                            conn.close()
                            st.cache_data.clear()
                            st.success(f"{len(삭제_ids)}건 삭제되었습니다.")
                            st.rerun()

                # ── 새 단가 추가 (거래처명→업무명→작업명 3단계 연동) ──
                st.divider()
                st.markdown("##### 새 단가 추가")

                거래처_df = df_all[df_all["거래처명"] == 선택_거래처_단가]
                업무명목록 = ["(기본단가 — 선택 안 함)"] + sorted(거래처_df["업무명"].dropna().unique().tolist())

                add_c1, add_c2 = st.columns(2)
                with add_c1:
                    선택_업무명 = st.selectbox(
                        "업무명",
                        업무명목록,
                        key="단가_add_업무명",
                        help="선택하지 않으면 거래처 전체 기본단가로 등록됩니다.",
                    )
                with add_c2:
                    if 선택_업무명 == "(기본단가 — 선택 안 함)":
                        작업명목록 = ["(기본단가 — 선택 안 함)"]
                    else:
                        filtered_작업 = 거래처_df[거래처_df["업무명"] == 선택_업무명]
                        작업명목록 = ["(기본단가 — 선택 안 함)"] + sorted(filtered_작업["작업명"].dropna().unique().tolist())
                    선택_작업명 = st.selectbox(
                        "작업명",
                        작업명목록,
                        key="단가_add_작업명",
                        help="선택하지 않으면 업무명 단위 기본단가로 등록됩니다.",
                    )

                p1, p2, p3, p4 = st.columns(4)
                with p1: add_출력 = st.number_input("출력단가(원)",     min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_출력")
                with p2: add_봉입 = st.number_input("봉입단가(원)",     min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_봉입")
                with p3: add_추가 = st.number_input("추가봉입단가(원)", min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_추가")
                with p4: add_각대봉입 = st.number_input("수작업 단가(원)", min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_각대봉입")
                p5, p6, p7, p8 = st.columns(4)
                with p5: add_용지 = st.number_input("용지제작단가(원)", min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_용지")
                with p6: add_봉투 = st.number_input("봉투제작단가(원)", min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_봉투")
                with p7: add_삽지 = st.number_input("삽지제작단가(원)", min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_삽지")
                with p8: add_각대봉투 = st.number_input("각대대봉투단가(원)", min_value=0.0, value=None, step=0.01, format="%.2f", placeholder="0.00", key="단가_add_각대봉투")
                add_비고 = st.text_input("비고", key="단가_add_비고")

                if st.button("추가", type="primary", key="단가_add_btn"):
                    from datetime import date as _date
                    _업무명 = None if 선택_업무명 == "(기본단가 — 선택 안 함)" else 선택_업무명
                    _작업명 = None if 선택_작업명 == "(기본단가 — 선택 안 함)" else 선택_작업명
                    conn = get_conn()
                    try:
                        conn.execute("""
                            INSERT INTO 단가마스터
                                (거래처명,업무명,작업명,출력단가,봉입단가,추가봉입단가,용지제작단가,봉투제작단가,삽지제작단가,각대대봉투단가,각대대봉투봉입단가,비고,등록일,수정일)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """, (선택_거래처_단가, _업무명, _작업명,
                              add_출력 or 0, add_봉입 or 0, add_추가 or 0, add_용지 or 0, add_봉투 or 0, add_삽지 or 0,
                              add_각대봉투 or 0, add_각대봉입 or 0,
                              add_비고 or None, str(_date.today()), str(_date.today())))
                        conn.commit()
                        st.cache_data.clear()
                        st.success("추가되었습니다.")
                        st.rerun()
                    except Exception as e:
                        st.error(f"동일한 업무명·작업명 조합이 이미 존재합니다. ({e})")
                    finally:
                        conn.close()

    with t4c:
        st.subheader("발행요청목록")

        # ── 의뢰서번호 검색 (승인자용) ────────────────────────
        sc1, sc2, sc3 = st.columns([6, 1, 1.3])
        with sc1:
            검색_입력 = st.text_input(
                "검색",
                placeholder="의뢰서번호 붙여넣기  예: 94361|94362|94363",
                key="t4c_검색입력",
                label_visibility="collapsed",
            )
        with sc2:
            검색_클릭 = st.button("검색", key="t4c_검색_btn", use_container_width=True)
        with sc3:
            검색_초기화 = st.button("전체 보기", key="t4c_검색초기화_btn", use_container_width=True)

        if 검색_클릭 and 검색_입력.strip():
            st.session_state["t4c_검색번호"] = {
                n.strip() for n in 검색_입력.split("|") if n.strip()
            }
        if 검색_초기화:
            st.session_state.pop("t4c_검색번호", None)

        검색번호 = st.session_state.get("t4c_검색번호", set())

        이력_t4c = load_이력()

        # 사이드바 필터 적용 (거래처·담당자만)
        if not 이력_t4c.empty:
            if 선택_거래처:
                이력_t4c = 이력_t4c[이력_t4c["거래처명"].isin(선택_거래처)]
            if 선택_담당자:
                이력_t4c = 이력_t4c[이력_t4c["담당자"].apply(
                    lambda d: any(dm in str(d) for dm in 선택_담당자) if pd.notna(d) else False
                )]
            이력_t4c = 이력_t4c.reset_index(drop=True)

        if 이력_t4c.empty:
            st.info("발행요청 이력이 없습니다.")
        else:
            # 거래명세서이력 → 업무의뢰서 단위로 펼치기 (미발행목록과 동일 구조)
            import json as _json3
            summary_all = build_의뢰서_summary(df_all)
            summary_map = {}
            for _, r in summary_all.iterrows():
                try:
                    summary_map[int(float(r["업무의뢰서번호"]))] = r
                except Exception:
                    pass

            # 이력에 포함된 전체 의뢰서번호 → 예상공급가 일괄 계산
            _t4c_모든번호 = set()
            for _, row in 이력_t4c.iterrows():
                if row["업무의뢰서번호목록"]:
                    try:
                        _t4c_모든번호.update(int(float(n)) for n in _json3.loads(row["업무의뢰서번호목록"]))
                    except Exception:
                        pass
            _t4c_공급가맵 = calc_공급가맵(_t4c_모든번호)

            expanded_rows = []
            for _, row in 이력_t4c.iterrows():
                if row["업무의뢰서번호목록"]:
                    try:
                        for n in _json3.loads(row["업무의뢰서번호목록"]):
                            req_no = int(float(n))
                            s = summary_map.get(req_no)
                            if s is not None:
                                _가액 = _t4c_공급가맵.get(req_no)
                                expanded_rows.append({
                                    "_이력_id":    int(row["id"]),
                                    "담당자":      str(s["마케팅담당자"]),
                                    "의뢰서번호":  str(req_no),
                                    "사업부":      str(s["사업부"]),
                                    "거래처명":    str(s["거래처명"]),
                                    "업무명":      str(s["업무명"]),
                                    "업무명상세":  str(s["업무명상세"]),
                                    "작업일자":    str(s["날짜"]),
                                    "청구페이지":  int(s["확정청구페이지"]) if pd.notna(s["확정청구페이지"]) else 0,
                                    "출력페이지":  int(s["출력페이지_합"])   if pd.notna(s["출력페이지_합"])   else 0,
                                    "장수":        int(s["장수_합"])          if pd.notna(s["장수_합"])          else 0,
                                    "봉입건수":    int(s["봉입건수_합"])      if pd.notna(s["봉입건수_합"])      else 0,
                                    "용지수량":    int(s["용지_사용량_합"])   if "용지_사용량_합" in s.index and pd.notna(s["용지_사용량_합"]) else 0,
                                    "봉투수량":    int(s["봉투_사용량_합"])   if "봉투_사용량_합" in s.index and pd.notna(s["봉투_사용량_합"]) else 0,
                                    "삽지수량":    int(s["삽지_사용량_합"])   if "삽지_사용량_합" in s.index and pd.notna(s["삽지_사용량_합"]) else 0,
                                    "예상공급가액": int(_가액["합계"]) if _가액 and _가액["합계"] > 0 else None,
                                    "발행여부":    "발행완료" if row["발송여부"] == 1 else "발행대기",
                                })
                    except Exception:
                        pass

            if not expanded_rows:
                st.info("표시할 항목이 없습니다.")
            else:
                if "t4c_전체선택" not in st.session_state:
                    st.session_state.t4c_전체선택 = False
                if "t4c_선택버전" not in st.session_state:
                    st.session_state.t4c_선택버전 = 0

                exp_df = pd.DataFrame(expanded_rows)

                # 검색 필터 적용
                if 검색번호:
                    exp_df_filtered = exp_df[exp_df["의뢰서번호"].isin(검색번호)]
                    if exp_df_filtered.empty:
                        st.warning(f"검색한 의뢰서번호 {len(검색번호)}건이 발행요청목록에 없습니다.")
                        st.stop()
                    else:
                        st.info(f"🔍 검색 결과 {len(exp_df_filtered):,}건  (전체 {len(exp_df):,}건)")
                        exp_df = exp_df_filtered.reset_index(drop=True)

                display_c = pd.DataFrame({
                    "선택":       st.session_state.t4c_전체선택,
                    "No":         range(1, len(exp_df) + 1),
                    "담당자":     exp_df["담당자"].values,
                    "의뢰서번호": exp_df["의뢰서번호"].values,
                    "사업부":     exp_df["사업부"].values,
                    "거래처명":   exp_df["거래처명"].values,
                    "업무명":     exp_df["업무명"].values,
                    "업무명상세": exp_df["업무명상세"].values,
                    "작업일자":   exp_df["작업일자"].values,
                    "청구페이지": pd.to_numeric(exp_df["청구페이지"], errors="coerce").values,
                    "장수":       pd.to_numeric(exp_df["장수"],       errors="coerce").values,
                    "봉입건수":   pd.to_numeric(exp_df["봉입건수"],   errors="coerce").values,
                    "용지수량":    pd.to_numeric(exp_df["용지수량"],    errors="coerce").values,
                    "봉투수량":    pd.to_numeric(exp_df["봉투수량"],    errors="coerce").values,
                    "삽지수량":    pd.to_numeric(exp_df["삽지수량"],    errors="coerce").values,
                    "예상공급가액": pd.to_numeric(exp_df["예상공급가액"], errors="coerce").values,
                    "발행여부":    exp_df["발행여부"].values,
                })

                cb_c2, cnt_c2 = st.columns([1.5, 8.5])
                with cb_c2:
                    새_t4c_전체선택 = st.checkbox(
                        "선택 (전체)",
                        value=st.session_state.t4c_전체선택,
                        key="t4c_전체선택_cb",
                    )
                with cnt_c2:
                    st.caption(f"발행요청 {len(display_c):,}건")

                if 새_t4c_전체선택 != st.session_state.t4c_전체선택:
                    st.session_state.t4c_전체선택 = 새_t4c_전체선택
                    st.session_state.t4c_선택버전 += 1
                    st.rerun()

                이력_선택결과 = st.data_editor(
                    display_c,
                    column_config={
                        "선택":       st.column_config.CheckboxColumn("선택",       pinned=True),
                        "No":         st.column_config.NumberColumn("No",           format="%d",  pinned=True),
                        "담당자":     st.column_config.TextColumn("담당자",         pinned=True),
                        "의뢰서번호": st.column_config.TextColumn("의뢰서번호",     pinned=True),
                        "사업부":     st.column_config.TextColumn("사업부",         pinned=True),
                        "거래처명":   st.column_config.TextColumn("거래처명",       pinned=True),
                        "업무명":     st.column_config.TextColumn("업무명",         pinned=True),
                        "청구페이지": st.column_config.NumberColumn("청구페이지",   format="%,d"),
                        "장수":       st.column_config.NumberColumn("장수",         format="%,d"),
                        "봉입건수":   st.column_config.NumberColumn("봉입건수",     format="%,d"),
                        "용지수량":    st.column_config.NumberColumn("용지수량",     format="%,d"),
                        "봉투수량":    st.column_config.NumberColumn("봉투수량",     format="%,d"),
                        "삽지수량":    st.column_config.NumberColumn("삽지수량",     format="%,d"),
                        "예상공급가액": st.column_config.NumberColumn("예상공급가액", format="%,d"),
                    },
                    disabled=["No","담당자","의뢰서번호","사업부","거래처명","업무명","업무명상세",
                              "작업일자","청구페이지","장수","봉입건수","용지수량","봉투수량","삽지수량","예상공급가액","발행여부"],
                    hide_index=True,
                    use_container_width=True,
                    height=380,
                    key=f"이력_선택_{st.session_state.t4c_선택버전}",
                )

                선택_idx_c = 이력_선택결과[이력_선택결과["선택"] == True].index.tolist()

                # 다운로드 버튼: 발행 완료 후 rerun으로 체크박스가 초기화돼도 유지되어야 하므로 선택_idx_c 블록 밖에 위치
                if st.session_state.get("t4c_excel_bytes"):
                    st.divider()
                    dl_col, _ = st.columns([3, 7])
                    with dl_col:
                        # key에 발행 시각을 포함해 발행할 때마다 버튼을 새로 렌더링 (캐시 방지)
                        dl_key = f"t4c_dl_{st.session_state.get('t4c_dl_version', 0)}"
                        st.download_button(
                            label="📥 거래명세서 다운로드",
                            data=st.session_state["t4c_excel_bytes"],
                            file_name=st.session_state.get("t4c_excel_filename", "거래명세서.xlsx"),
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            key=dl_key,
                        )

                if 선택_idx_c:
                    st.divider()
                    발행_btn_col, _ = st.columns([2, 8])
                    with 발행_btn_col:
                        발행_클릭 = st.button("거래명세서 발행", type="primary", key="t4c_발행_btn")

                    if 발행_클릭:
                        선택_ids = list({int(exp_df.iloc[idx]["_이력_id"]) for idx in 선택_idx_c})
                        선택번호_발행 = {int(exp_df.iloc[idx]["의뢰서번호"]) for idx in 선택_idx_c}
                        conn = get_conn()
                        conn.executemany(
                            "UPDATE 거래명세서이력 SET 발송여부 = 1, 발송일 = ? WHERE id = ?",
                            [(str(date.today()), id_) for id_ in 선택_ids]
                        )
                        conn.commit()
                        conn.close()
                        st.cache_data.clear()
                        excel_bytes = generate_거래명세서_excel(선택번호_발행, date.today())
                        if excel_bytes:
                            from datetime import datetime as _dt
                            발행시각 = _dt.now().strftime("%Y%m%d_%H%M")
                            거래처명_발행 = exp_df.iloc[선택_idx_c[0]]["거래처명"]
                            업무명_발행   = exp_df.iloc[선택_idx_c[0]]["업무명"]
                            st.session_state["t4c_excel_bytes"]    = excel_bytes
                            st.session_state["t4c_excel_filename"] = f"{발행시각}_{거래처명_발행}_{업무명_발행}.xlsx"
                            st.session_state["t4c_dl_version"]     = st.session_state.get("t4c_dl_version", 0) + 1
                        st.success("거래명세서 발행이 완료되었습니다.")
                        st.session_state.t4c_선택버전 += 1
                        st.rerun()

                    st.subheader("선택된 업무의뢰서")

                    # 합계 — 미발행 목록과 동일한 텍스트 한 줄 형식
                    선택_exp = exp_df.iloc[선택_idx_c]
                    _장수 = int(선택_exp["장수"].sum())
                    _봉입 = int(선택_exp["봉입건수"].sum())
                    _청구 = int(선택_exp["청구페이지"].sum())
                    _용지 = int(선택_exp["용지수량"].sum())
                    _봉투 = int(선택_exp["봉투수량"].sum())
                    _삽지 = int(선택_exp["삽지수량"].sum())
                    _추가용지 = (_장수 - _봉입) if (_장수 > 0 and _봉입 > 0) else 0
                    _공급_s = 선택_exp["예상공급가액"]
                    _공급 = int(_공급_s.sum()) if _공급_s.notna().all() else None
                    _공급str = f"{_공급:,}원" if _공급 is not None else "단가 미등록"
                    st.markdown(
                        f"<p style='font-size:1.05rem;font-weight:bold;margin:4px 0;'>"
                        f"청구페이지: {_청구:,} &nbsp;|&nbsp; "
                        f"봉입건수: {_봉입:,} &nbsp;|&nbsp; "
                        f"장수: {_장수:,} &nbsp;|&nbsp; "
                        f"봉투: {_봉투:,} &nbsp;|&nbsp; "
                        f"용지: {_용지:,} &nbsp;|&nbsp; "
                        f"추가용지: {_추가용지:,} &nbsp;|&nbsp; "
                        f"삽지: {_삽지:,} &nbsp;|&nbsp; "
                        f"예상공급가액: {_공급str}</p>",
                        unsafe_allow_html=True,
                    )

                    선택번호_int_c = {int(exp_df.iloc[idx]["의뢰서번호"]) for idx in 선택_idx_c}

                    NUM_COLS_C = ["장수","건수","출력페이지","청구페이지"]
                    세부_c = df_all[
                        df_all["업무의뢰서번호"].apply(
                            lambda x: int(float(x)) if pd.notna(x) else -1
                        ).isin(선택번호_int_c)
                    ].copy()
                    세부_c["업무의뢰서번호"] = 세부_c["업무의뢰서번호"].apply(
                        lambda x: str(int(float(x))) if pd.notna(x) else ""
                    )
                    세부_c = 세부_c[["업무의뢰서번호","거래처명","작업일자","업무명","업무명상세","작업내역서상세","P수"] + NUM_COLS_C].reset_index(drop=True)

                    if len(선택번호_int_c) > 1:
                        rows_c = []
                        for req_no, grp in 세부_c.groupby("업무의뢰서번호", sort=False):
                            rows_c.append(grp)
                            sub = {col: "" for col in 세부_c.columns}
                            sub["업무의뢰서번호"] = req_no
                            sub["업무명"] = "▶ 소계"
                            for c in NUM_COLS_C:
                                sub[c] = grp[c].sum()
                            rows_c.append(pd.DataFrame([sub]))
                        세부_c = pd.concat(rows_c, ignore_index=True)

                    세부_c.insert(0, "No", range(1, len(세부_c) + 1))

                    def _style_c(row):
                        if row["업무명"] == "▶ 소계":
                            return ["font-weight:bold"] * len(row)
                        return [""] * len(row)

                    styled_c = 세부_c.style.apply(_style_c, axis=1).format(
                        {c: "{:,.0f}" for c in NUM_COLS_C}, na_rep=""
                    )
                    st.dataframe(styled_c, use_container_width=True, height=320, hide_index=True,
                                 column_config={
                                     "No":         st.column_config.NumberColumn("No",         pinned=True),
                                     "업무의뢰서번호": st.column_config.TextColumn("업무의뢰서번호", pinned=True),
                                     "거래처명":   st.column_config.TextColumn("거래처명",      pinned=True),
                                     "작업일자":   st.column_config.TextColumn("작업일자",      pinned=True),
                                     "업무명":     st.column_config.TextColumn("업무명",        pinned=True),
                                 })
