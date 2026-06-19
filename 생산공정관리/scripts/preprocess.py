"""
운영통계자료.xlsx 전처리 스크립트
실행: python scripts/preprocess.py
결과: work/processed.pkl (대시보드에서 바로 로드)
"""

import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "data" / "운영통계자료.xlsx"
자재_FILE = BASE_DIR / "data" / "자재사용현황.xlsx"
OUTPUT_FILE = BASE_DIR / "work" / "processed.pkl"


def load_raw():
    df = pd.read_excel(DATA_FILE, engine="openpyxl")
    df.columns = df.columns.str.strip()
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
    return df


def apply_반제품_logic(df):
    """반제품여부=Y인 행의 건수 필드를 0으로 설정 (봉입 없음 처리)"""
    df.loc[df["반제품여부"] == "Y", "건수"] = 0
    return df


def load_and_merge_자재(df):
    """자재사용현황.xlsx를 읽어 자재종류별 사용량 컬럼으로 조인"""
    자재df = pd.read_excel(자재_FILE, engine="openpyxl")
    자재df.columns = 자재df.columns.str.strip()
    자재df = 자재df.rename(columns={
        "업무의뢰서코드": "업무의뢰서번호",
        "작업내역서코드": "작업내역서번호",
    })
    자재df["업무의뢰서번호"] = 자재df["업무의뢰서번호"].astype(int)
    자재df["작업내역서번호"] = 자재df["작업내역서번호"].astype(int)
    자재df["작업일자"] = pd.to_datetime(자재df["작업일자"]).dt.strftime("%Y-%m-%d")

    pivot = (
        자재df.groupby(["업무의뢰서번호", "작업내역서번호", "작업일자", "자재종류"])["사용량"]
        .sum()
        .unstack(fill_value=0)
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

    자재컬럼 = [c for c in df.columns if c.endswith("_사용량")]
    df[자재컬럼] = df[자재컬럼].fillna(0).astype(int)
    return df


DM_담당자 = {"강서윤", "노재민", "김성수", "김희원", "임병민"}

def add_사업부(df):
    df["사업부"] = df["마케팅담당자"].apply(
        lambda x: "DM사업부" if x in DM_담당자 else "N사업부"
    )
    return df


def apply_billing_logic(df):
    """
    업무의뢰서번호 그룹 기준 청구페이지 계산
    경우 1: 첫 행만 청구페이지 > 0, 나머지 0 → 첫 행 값 그대로
    경우 2: 2번째 이후 행 중 청구페이지 > 0 존재 → 전체 합산
    경우 3: 모든 행 청구페이지 = 0 → 출력페이지 전체 합산
    """
    groups = []
    for _, group in df.groupby("업무의뢰서번호", sort=False):
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


def main():
    print("[1/5] 데이터 로드 중...")
    df = load_raw()
    print(f"  총 {len(df):,}행 로드 완료")

    print("[2/5] 반제품 처리 중...")
    df = apply_반제품_logic(df)

    print("[3/5] 날짜/시간 컬럼 추가 중...")
    df = add_date_columns(df)

    print("[4/5] 거래처명·사업부 추가 및 자재 조인 중...")
    df = add_client_column(df)
    df = add_사업부(df)
    df = load_and_merge_자재(df)

    print("[5/5] 청구페이지 계산 중...")
    df = apply_billing_logic(df)

    df.to_pickle(OUTPUT_FILE)
    print(f"완료 -> {OUTPUT_FILE}")
    print(f"컬럼 목록: {list(df.columns)}")


if __name__ == "__main__":
    main()
