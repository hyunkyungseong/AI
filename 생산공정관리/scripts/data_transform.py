"""
운영통계자료 가공 공통 로직 — preprocess.py(엑셀 배치)와 api.py(실시간 API 수신) 양쪽에서 재사용.

가공 규칙(반제품 처리·거래처명 파싱·사업부 구분·청구페이지 계산)은 이 파일 한 곳에서만 관리한다.
preprocess.py와 api.py에 로직을 각각 복사해두면 한쪽만 고치고 다른 쪽을 놓치는 버그가 생기기 쉽기 때문.
"""

import pandas as pd


def apply_반제품_logic(df):
    """반제품여부=Y인 행의 건수 필드를 0으로 설정 (봉입 없음 처리)"""
    df.loc[df["반제품여부"] == "Y", "건수"] = 0
    return df


def add_date_columns(df):
    dt = pd.to_datetime(df["작업일자"], errors="coerce")
    df["연월"] = dt.dt.strftime("%Y-%m")
    df["날짜"] = dt.dt.strftime("%Y-%m-%d")
    df["시간대"] = dt.dt.hour
    return df


def add_client_column(df):
    # 최초 구분자(" - ") 한 번만 분리 (n=1)
    split = df["작업내역서"].str.split(" - ", n=1, expand=True)
    df["거래처명"]  = split[0].str.strip()
    df["업무명상세"] = split[1].str.strip() if 1 in split.columns else ""

    # S/M/A교재 → 업무명 뒤에 원래 거래처명 추가 후 거래처명 통합
    교재_mask = df["거래처명"].isin(["S교재", "M교재", "A교재"])
    df.loc[교재_mask, "업무명"] = (
        df.loc[교재_mask, "업무명"] + " " + df.loc[교재_mask, "거래처명"]
    )
    df.loc[교재_mask, "거래처명"] = "강남대성수능연구소(주)"

    # Paffy교재 → 업무명상세 키워드로 업무명 분기 후 거래처명 치환
    paffy_mask = df["거래처명"] == "Paffy교재"
    paffy_모의 = paffy_mask & df["업무명상세"].str.contains("모의고사 시험지", na=False)
    paffy_omr  = paffy_mask & df["업무명상세"].str.contains("OMR", na=False)
    df.loc[paffy_모의, "업무명"] = df.loc[paffy_모의, "업무명"] + " 모의고사 시험지"
    df.loc[paffy_omr,  "업무명"] = df.loc[paffy_omr,  "업무명"] + " OMR"
    df.loc[paffy_mask, "거래처명"] = "파피(Paffy)"

    return df


DM_담당자 = {"강서윤", "노재민", "김성수", "김희원", "임병민"}


def add_사업부(df):
    df["사업부"] = df["마케팅담당자"].apply(
        lambda x: "DM사업부" if x in DM_담당자 else "N사업부"
    )
    return df


def _봉투종류(자재명):
    """자재명에 '각대' 또는 '대봉투'가 포함되면 각대대봉투, 아니면 일반봉투 (app.py의 기존 분류 규칙과 동일)"""
    s = str(자재명) if pd.notna(자재명) else ""
    return "각대대봉투" if ("각대" in s or "대봉투" in s) else "일반봉투"


def merge_자재(df, 자재df):
    """
    이미 로드된 자재df(컬럼: 업무의뢰서번호·작업내역서번호·작업명·작업일자·자재종류·자재코드·자재명·사용량, 앞 2개는 int, 작업일자는 YYYY-MM-DD 문자열,
    작업명은 배치 경로만 채워지고 실시간 API는 아직 안 보내줘서 NULL — merge_자재()가 dropna=False로 NULL도 하나의 그룹으로 보존함)를
    df에 자재종류별 사용량 컬럼으로 조인. 라인 단위 집계 결과(long_grouped)도 함께 반환 (자재사용현황 테이블 저장용).
    파일 읽기는 호출부(preprocess.py는 엑셀에서, api.py는 요청 바디에서) 책임.

    자재형태(일반봉투/각대대봉투)는 자재종류='봉투' 행만 자재명으로 분류하고, 나머지 자재종류는 구분이
    필요 없어 None으로 둔다 — 단가마스터가 봉투만 일반/각대대로 단가를 나눠 관리하기 때문(용지·삽지 등은 단일 단가).

    자재코드·자재명(2026-08-15 추가, 단가마스터 자재명 정규화)은 long_grouped의 groupby 키에 포함시켜
    라인 단위로 보존한다 — 지금까지는 이 두 값이 여기서 groupby 키에 안 들어가 있어 같은 (의뢰서,작업
    내역서,작업명,날짜,자재종류,자재형태) 조합 안의 서로 다른 자재(예: 95903 사례의 용지 자재코드
    2016·99)가 하나의 합산 행으로 뭉개졌었다. df에 조인되는 4개 `_사용량` 요약 컬럼(coarse·pivot)은
    이 변경과 무관하게 그대로 자재종류 총량 기준으로 유지한다(요약 화면 회귀 방지).
    """
    자재df = 자재df.copy()
    for 컬럼 in ("자재형태", "자재코드", "자재명"):
        if 컬럼 not in 자재df.columns:
            자재df[컬럼] = None
    봉투_mask = 자재df["자재종류"] == "봉투"
    # 우선순위: ① 호출부가 자재형태를 이미 채워 보냈으면 그대로 존중(예: 실시간 API가 소·중·대봉투처럼
    # 일반봉투/각대대봉투 2종을 넘어서는 값을 직접 분류해 보내는 경우) → ② 없고 자재명이 있으면 기존처럼
    # _봉투종류()로 자동 분류(자재명이 없으면 _봉투종류(None)이 "일반봉투"를 반환해 ③과 동일하게 처리됨)
    미분류_mask = 봉투_mask & 자재df["자재형태"].isna()
    자재df.loc[미분류_mask, "자재형태"] = 자재df.loc[미분류_mask, "자재명"].apply(_봉투종류)
    자재df.loc[봉투_mask & 자재df["자재형태"].isna(), "자재형태"] = "일반봉투"

    long_grouped = (
        자재df.groupby(
            ["업무의뢰서번호", "작업내역서번호", "작업명", "작업일자", "자재종류", "자재형태", "자재코드", "자재명"],
            dropna=False
        )["사용량"]
        .sum()
        .reset_index()
    )

    # 운영통계자료의 4개 사용량 컬럼(봉투_사용량 등)은 봉투 하위형태를 합산한 총량 기준 — 기존 동작과 동일
    coarse = (
        long_grouped.groupby(["업무의뢰서번호", "작업내역서번호", "작업일자", "자재종류"])["사용량"]
        .sum()
        .reset_index()
    )

    pivot = (
        coarse
        .pivot(index=["업무의뢰서번호", "작업내역서번호", "작업일자"], columns="자재종류", values="사용량")
        .fillna(0)
        .reset_index()
    )
    pivot.columns.name = None
    pivot.columns = [
        c if c in ("업무의뢰서번호", "작업내역서번호", "작업일자") else f"{c}_사용량"
        for c in pivot.columns
    ]

    df["_작업일자날짜"] = pd.to_datetime(df["작업일자"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["_업무의뢰서번호키"] = pd.to_numeric(df["업무의뢰서번호"], errors="coerce").fillna(-1).astype(int)
    df["_작업내역서번호키"] = pd.to_numeric(df["작업내역서번호"], errors="coerce").fillna(-1).astype(int)

    df = df.merge(
        pivot,
        left_on=["_업무의뢰서번호키", "_작업내역서번호키", "_작업일자날짜"],
        right_on=["업무의뢰서번호", "작업내역서번호", "작업일자"],
        how="left",
        suffixes=("", "_자재"),
    )
    df = df.drop(columns=["_작업일자날짜", "_업무의뢰서번호키", "_작업내역서번호키",
                           "업무의뢰서번호_자재", "작업내역서번호_자재", "작업일자_자재"], errors="ignore")

    # 이번 배치에 자재종류 일부(예: 봉투·용지만)만 존재하면 pivot이 그 컬럼만 만들기 때문에,
    # 4종류 컬럼을 항상 보장해준다 (실시간 API처럼 배치가 작을 때 특히 중요 — 없으면 KeyError)
    for 자재종류 in ("봉투", "용지", "삽지", "미구분"):
        col = f"{자재종류}_사용량"
        if col not in df.columns:
            df[col] = 0

    자재컬럼 = [c for c in df.columns if c.endswith("_사용량")]
    df[자재컬럼] = df[자재컬럼].fillna(0).astype(int)
    return df, long_grouped


def apply_billing_logic(df):
    """
    (업무의뢰서번호, 작업명) 그룹 기준 청구페이지 계산 — 작업명별 첫 행에 확정청구페이지 저장
    경우 1: 첫 행만 청구페이지 > 0, 나머지 0 → 첫 행 값 그대로
    경우 2: 2번째 이후 행 중 청구페이지 > 0 존재 → 전체 합산
    경우 3: 모든 행 청구페이지 = 0 → 출력페이지 전체 합산

    실시간 API 수신 시에는 같은 업무의뢰서번호의 행이 전부 한 번에 들어오는 것을 전제로 함
    (그렇지 않으면 이 그룹 계산이 반쪽짜리 데이터로 실행되어 값이 틀어짐 — data_transform.py 상단 설명 참고)
    """
    groups = []
    for _, group in df.groupby(["업무의뢰서번호", "작업명"], sort=False):
        rest = group["청구페이지"].iloc[1:]
        if group["청구페이지"].sum() == 0:
            billing = group["출력페이지"].sum()
        elif (rest > 0).any():
            billing = group["청구페이지"].sum()
        else:
            billing = group["청구페이지"].iloc[0]

        g = group.copy()
        g["확정청구페이지"] = 0
        g.loc[g.index[0], "확정청구페이지"] = billing
        groups.append(g)

    return pd.concat(groups, ignore_index=True)


MARIADB_컬럼 = [
    "마케팅담당자", "등록자", "업무명", "업무의뢰서번호", "작업일자",
    "작업내역서번호", "작업내역서", "작업명", "작업내역서상세", "반제품여부",
    "P수", "장수", "건수", "출력페이지", "청구페이지",
    "연월", "날짜", "시간대", "거래처명", "업무명상세", "사업부", "확정청구페이지",
    "봉투_사용량", "용지_사용량", "삽지_사용량", "미구분_사용량",
    "압착", "주소출력", "봉입", "수작업", "중철", "제본",
    "무광코팅", "유광코팅", "에폭시", "날개접지",
]


def _문자(v):
    return None if pd.isna(v) else v


def _문자숫자(v):
    """업무의뢰서번호는 문자열 식별자이므로 정수 변환 후 문자열로 저장 (float ".0" 방지)"""
    return None if pd.isna(v) else str(int(v))


def _정수(v):
    return None if pd.isna(v) else int(v)


def _일시(v):
    return None if pd.isna(v) else pd.Timestamp(v).to_pydatetime()


def 운영통계_행_변환(row):
    """운영통계자료 한 행을 MariaDB INSERT 파라미터 튜플로 변환 (모든 필드 NaN 안전 처리)"""
    return (
        _문자(row["마케팅담당자"]), _문자(row["등록자"]), _문자(row["업무명"]),
        _문자숫자(row["업무의뢰서번호"]),
        _일시(row["작업일자"]),
        _정수(row["작업내역서번호"]),
        _문자(row["작업내역서"]), _문자(row["작업명"]), _문자(row["작업내역서상세"]),
        _문자(row["반제품여부"]),
        _문자(row["P수"]), _정수(row["장수"]), _정수(row["건수"]),
        _정수(row["출력페이지"]), _정수(row["청구페이지"]),
        _문자(row["연월"]), _문자(row["날짜"]), _정수(row["시간대"]),
        _문자(row["거래처명"]), _문자(row["업무명상세"]), _문자(row["사업부"]), _정수(row["확정청구페이지"]),
        _정수(row["봉투_사용량"]), _정수(row["용지_사용량"]),
        _정수(row["삽지_사용량"]), _정수(row["미구분_사용량"]),
        # 2026-08-21 — 신규 공정 세분화 컬럼 10개(`.claude/plans/plan_공정별단가청구.md`).
        # .get()으로 읽어 5월 이전(컬럼 자체가 없는) 원본 파일도 그대로 통과시킴 — 없으면 0.
        _정수(row.get("압착", 0)), _정수(row.get("주소출력", 0)),
        _정수(row.get("봉입", 0)), _정수(row.get("수작업", 0)),
        _정수(row.get("중철", 0)), _정수(row.get("제본", 0)),
        _정수(row.get("무광코팅", 0)), _정수(row.get("유광코팅", 0)),
        _정수(row.get("에폭시", 0)), _정수(row.get("날개접지", 0)),
    )


def 자재_행_변환(row):
    """자재사용현황 한 행을 MariaDB INSERT 파라미터 튜플로 변환"""
    자재코드 = row.get("자재코드")
    return (
        str(int(row["업무의뢰서번호"])), int(row["작업내역서번호"]), _문자(row.get("작업명")),
        row["작업일자"], row["자재종류"], _문자(row.get("자재형태")),
        None if pd.isna(자재코드) else int(자재코드), _문자(row.get("자재명")),
        int(row["사용량"]),
    )
