"""
거래명세서 금액 계산·Excel 생성 — scripts/app.py(Streamlit)·scripts/api.py(FastAPI) 공용.

원래 scripts/app.py의 tab4 블록 안에 클로저(closure)로 정의돼 있던 calc_공급가맵()·
generate_거래명세서_excel()을 그대로 옮기되, df_all/단가맵/자재map을 인자로 받도록 바꿨다.
계산 로직 자체는 한 글자도 바뀌지 않았다 — 자재 수량을 구하는 방법(자재map을 만드는 방법)만
호출부(app.py는 로컬 엑셀, api.py는 MariaDB)에 따라 달라진다.

자재map 규격: {(int(업무의뢰서번호), 작업이름): {"일반봉투_수량":.., "각대대봉투_수량":.., "용지_수량":.., "삽지_수량":..}}
단가맵 규격:  {(거래처명, 업무명 또는 None, 작업명 또는 None): {"출력단가":.., "봉입단가":.., ...}}
df_all 규격:  최소 컬럼 업무의뢰서번호·작업명·거래처명·업무명·확정청구페이지·건수·장수을 가진 DataFrame
"""

import io
import math
import os
import re
import tempfile
import zipfile
from collections import defaultdict
from pathlib import Path

import pandas as pd
from num2words import num2words

BASE_DIR = Path(__file__).parent.parent
템플릿_PATH = BASE_DIR / "data" / "거래명세서_템플릿_base.xlsx"
직인_PATH = BASE_DIR / "data" / "직인.png"


def _혼합단가_행목록(일반수량, 대대수량, 일반단가, 대대단가):
    """봉입비·봉투제작비처럼 '일반 자재 + 각대대봉투' 두 수량이 있고 둘 중 하나는 단가가
    등록 안 될 수 있는 품목의 (수량, 단가) 조합 리스트를 사용자 확정 규칙대로 만든다(2026-07-22,
    의뢰서 95073 미발행목록·미리보기 수치 불일치 제보로 발견):
    둘 다 등록  -> 분리된 두 항목(각자 단가로 따로 청구)
    하나만 등록 -> 일반+각대대 수량을 합쳐서 등록된 쪽 단가로 청구
    둘 다 없음  -> 무상(빈 리스트, 해당 품목 행 자체가 안 생김)"""
    if 일반단가 > 0 and 대대단가 > 0:
        결과 = []
        if 일반수량 > 0:
            결과.append((일반수량, 일반단가))
        if 대대수량 > 0:
            결과.append((대대수량, 대대단가))
        return 결과
    if 일반단가 > 0:
        return [(일반수량 + 대대수량, 일반단가)]
    if 대대단가 > 0:
        return [(일반수량 + 대대수량, 대대단가)]
    return []


def calc_공급가맵(df_all, 단가맵, 자재map, 의뢰서번호셋):
    """의뢰서번호 집합 → {의뢰서번호int: {"합계": float, "거래처명": str, "업무명": str,
                                           "항목": {품명: 금액}, "수량": {품명: 수량}, "단가": {품명: 단가},
                                           "부가세구분맵": {작업명: "포함"/"별도"}}}
    부가세구분맵은 이 의뢰서에 실제로 매칭된 각 작업명의 단가마스터 부가세구분 값 — 거래처 기본단가
    행 하나가 아니라 실제 청구된 작업명 기준으로 부가세를 판정하기 위함(결정_부가세구분() 참고,
    2026-08-04 — 기본단가 행이 없는 거래처(예: KB국민카드)는 항상 "별도"로 잘못 계산되던 버그 수정)."""
    _tgt = df_all[df_all["업무의뢰서번호"].apply(
        lambda x: int(float(x)) if pd.notna(x) else -1
    ).isin(의뢰서번호셋)].copy()
    if _tgt.empty:
        return {}
    _tgt["_의뢰서int"] = _tgt["업무의뢰서번호"].apply(lambda x: int(float(x)) if pd.notna(x) else -1)
    _g = _tgt.groupby(["_의뢰서int", "작업명", "거래처명", "업무명"], sort=False).agg(
        출력단가기준페이지=("확정청구페이지", "sum"),
        봉입건수=("건수", "sum"),
        장수=("장수", "sum"),
    ).reset_index()
    결과 = {}
    for _, _r in _g.iterrows():
        의뢰서 = _r["_의뢰서int"]
        작업 = _r["작업명"]
        거래처 = _r["거래처명"]
        업무 = _r["업무명"]
        rates = (
            단가맵.get((거래처, 업무, 작업))
            or 단가맵.get((거래처, 업무, None))
            or 단가맵.get((거래처, None, None))
        )
        if not rates:
            continue
        if 의뢰서 not in 결과:
            결과[의뢰서] = {"합계": 0, "거래처명": 거래처, "업무명": 업무,
                            "항목": {}, "수량": {}, "단가": {}, "부가세구분맵": {}}
        결과[의뢰서]["부가세구분맵"][작업] = rates.get("부가세구분") or "별도"
        z = 자재map.get((의뢰서, 작업), {"일반봉투_수량": 0, "각대대봉투_수량": 0, "용지_수량": 0, "삽지_수량": 0})
        일반봉투 = z["일반봉투_수량"]
        각대대봉투 = z["각대대봉투_수량"]
        용지 = z["용지_수량"]
        삽지 = z["삽지_수량"]
        봉입건수 = _r["봉입건수"]
        장수 = _r["장수"]
        추가용지 = max(0, 장수 - 봉입건수)
        청구페이지 = _r["출력단가기준페이지"]
        # 봉입비(공임)는 봉입건수(기계작업) × 봉입단가만 청구 — 각대대봉투 수작업분은 개별 작업 건
        # 단위 봉투형태 데이터가 없어 반영 불가(사용자 확정, 2026-07-22). build_품목행()과 동일한
        # 이유 — 상세: `.claude/plans/bug_각대대봉투_봉입비_계산.md`.
        봉투제작비_금액 = sum(
            수량 * 단가
            for 수량, 단가 in _혼합단가_행목록(일반봉투, 각대대봉투, rates.get("봉투제작단가", 0), rates.get("각대대봉투단가", 0))
        )
        항목금액 = {
            "출력비": 청구페이지 * rates.get("출력단가", 0),
            "봉입비": 봉입건수 * rates.get("봉입단가", 0),
            "용지제작비": 용지 * rates.get("용지제작단가", 0),
            "봉투제작비": 봉투제작비_금액,
            "추가봉입비": 추가용지 * rates.get("추가봉입단가", 0),
            "동봉물삽입비": 삽지 * rates.get("동봉물삽입단가", 0),
            "삽지봉입비": 삽지 * rates.get("삽지제작단가", 0),
        }
        항목수량 = {
            "출력비": 청구페이지,
            "봉입비": 봉입건수,
            "용지제작비": 용지,
            "봉투제작비": 일반봉투 + 각대대봉투,
            "추가봉입비": 추가용지,
            "동봉물삽입비": 삽지,
            "삽지봉입비": 삽지,
        }
        항목단가 = {
            "출력비": rates.get("출력단가", 0),
            "봉입비": rates.get("봉입단가", 0),
            "용지제작비": rates.get("용지제작단가", 0),
            "봉투제작비": rates.get("봉투제작단가", 0),
            "추가봉입비": rates.get("추가봉입단가", 0),
            "동봉물삽입비": rates.get("동봉물삽입단가", 0),
            "삽지봉입비": rates.get("삽지제작단가", 0),
        }
        소계 = sum(항목금액.values())
        결과[의뢰서]["합계"] += 소계
        for k in 항목금액:
            결과[의뢰서]["항목"][k] = 결과[의뢰서]["항목"].get(k, 0) + 항목금액[k]
            결과[의뢰서]["수량"][k] = 결과[의뢰서]["수량"].get(k, 0) + 항목수량[k]
            결과[의뢰서]["단가"][k] = 항목단가[k]  # 마지막 작업명 단가 사용 (단순화)
    return 결과


def build_품목행(df_all, 단가맵, 자재map, 의뢰서번호셋):
    """의뢰서번호 집합 → (정렬행, 총합계, 거래처명, 업무명, 코드맵, 부가세구분맵)

    정렬행: [((품목, 작업명, 단가), {"수량": float, "금액": float}), ...] — 품목순서→코드표순서 정렬 완료
    부가세구분맵: {작업명: "포함"/"별도"} — 실제로 매칭된 단가마스터 행 기준(결정_부가세구분() 참고,
    2026-08-04 — 기본단가 행이 없는 거래처는 항상 "별도"로 잘못 계산되던 버그 수정).
    generate_거래명세서_excel()과 화면 미리보기 API(POST /거래명세서미리보기) 공용 —
    원래 generate_거래명세서_excel() 안에 있던 계산 블록을 그대로 옮긴 것뿐, 로직은 한 글자도 안 바뀜.
    대상 의뢰서가 없거나(정렬행=[]) 등록된 단가가 없어 품목이 하나도 안 생기면 정렬행=[]로 반환한다
    (호출부가 `if not 정렬행:` 하나로 두 경우 모두 판별)."""
    품목순서 = ["출력비", "봉입비", "출력자재비", "봉입자재비", "추가봉입비", "동봉물삽입비", "삽지비"]
    코드맵 = {"출력비": "P", "봉입비": "M", "출력자재비": "F",
              "봉입자재비": "E", "추가봉입비": "MM", "동봉물삽입비": "SI", "삽지비": "M"}
    순서맵 = {p: i for i, p in enumerate(품목순서)}
    코드표순서 = ["P", "M", "MM", "SI", "E", "F", "H", "BB", "AB", "D"]
    코드순서맵 = {c: i for i, c in enumerate(코드표순서)}

    _tgt = df_all[df_all["업무의뢰서번호"].apply(
        lambda x: int(float(x)) if pd.notna(x) else -1
    ).isin(의뢰서번호셋)].copy()
    if _tgt.empty:
        return [], 0, None, None, 코드맵, {}

    _g = _tgt.groupby(["작업명", "거래처명", "업무명"], sort=False).agg(
        청구페이지=("확정청구페이지", "sum"),
        봉입건수=("건수", "sum"),
        장수=("장수", "sum"),
    ).reset_index()

    거래처명 = _g.iloc[0]["거래처명"]
    업무명 = _g.iloc[0]["업무명"]

    행데이터 = defaultdict(lambda: {"수량": 0.0, "금액": 0.0})
    부가세구분맵 = {}
    for _, _r in _g.iterrows():
        작업 = _r["작업명"]
        거래처 = _r["거래처명"]
        업무 = _r["업무명"]
        rates = (
            단가맵.get((거래처, 업무, 작업))
            or 단가맵.get((거래처, 업무, None))
            or 단가맵.get((거래처, None, None))
        )
        if not rates:
            continue
        부가세구분맵[작업] = rates.get("부가세구분") or "별도"
        일반봉투 = 각대대봉투 = 용지 = 삽지 = 0
        for 번호 in 의뢰서번호셋:
            z = 자재map.get((번호, 작업), {})
            일반봉투 += z.get("일반봉투_수량", 0)
            각대대봉투 += z.get("각대대봉투_수량", 0)
            용지 += z.get("용지_수량", 0)
            삽지 += z.get("삽지_수량", 0)
        봉입건수 = _r["봉입건수"]
        장수 = _r["장수"]
        청구 = _r["청구페이지"]
        추가용지 = max(0, 장수 - 봉입건수)
        # 봉입비(공임)는 봉입건수(기계작업) × 봉입단가만 청구한다 — 각대대봉투는 기계가 아니라
        # 사람이 손으로 처리해야 해서 별도 "수작업건수 × 각대대봉투봉입단가(수작업 단가)"가 필요하지만,
        # 수작업건수는 개별 작업 건 단위 봉투형태 데이터가 있어야 계산 가능하고 지금은 그 데이터를
        # 받지 못해 반영 불가(사용자 확정, 2026-07-22) — 데이터가 들어오면 그때 분리 예정, 지금은
        # 각대대봉투를 더하지 않는다(`.claude/plans/bug_각대대봉투_봉입비_계산.md` 향후 작업 참고).
        항목계산 = {
            "출력비": (청구, rates.get("출력단가", 0)),
            "봉입비": (봉입건수, rates.get("봉입단가", 0)),
            "출력자재비": (용지, rates.get("용지제작단가", 0)),
            "추가봉입비": (추가용지, rates.get("추가봉입단가", 0)),
            "동봉물삽입비": (삽지, rates.get("동봉물삽입단가", 0)),
            "삽지비": (삽지, rates.get("삽지제작단가", 0)),
        }
        for 품목, (수량, 단가) in 항목계산.items():
            if 단가 > 0 and 수량 > 0:
                행데이터[(품목, 작업, 단가)]["수량"] += 수량
                행데이터[(품목, 작업, 단가)]["금액"] += 수량 * 단가

        # 봉입자재비(실물 봉투 자재비)만 각대대봉투(큰 봉투) 단가가 등록 안 됐을 수 있어 단순 합산이
        # 아니라 _혼합단가_행목록()의 사용자 확정 규칙(2026-07-22)대로 처리 — 등록된 단가가 다르면
        # 별도 행으로 분리되고, 하나만 등록돼 있으면 그 단가로 합산됨.
        for 수량, 단가 in _혼합단가_행목록(일반봉투, 각대대봉투, rates.get("봉투제작단가", 0), rates.get("각대대봉투단가", 0)):
            행데이터[("봉입자재비", 작업, 단가)]["수량"] += 수량
            행데이터[("봉입자재비", 작업, 단가)]["금액"] += 수량 * 단가

    정렬행 = sorted(행데이터.items(), key=lambda x: (
        x[0][1],
        코드순서맵.get(코드맵.get(x[0][0]), 99),
        순서맵.get(x[0][0], 99),
    ))
    총합계 = sum(v["금액"] for _, v in 정렬행) if 정렬행 else 0
    return 정렬행, 총합계, 거래처명, 업무명, 코드맵, 부가세구분맵


def 정렬행_원본목록(정렬행, 코드맵):
    """build_품목행()의 정렬행([(품목,작업명,단가), {"수량","금액"}] 튜플)을 화면 미리보기·규칙엔진·
    Excel 작성이 공용으로 쓰는 평평한 dict 리스트로 변환한다.
    [{"코드","표시품명","작업명","품목","수량","단가","금액"}, ...] — 표시품명은 기존 Excel 작성부가
    쓰던 "품목(작업명)" 표기(작업명 없으면 품목만)를 그대로 재현한다."""
    결과 = []
    for (품목, 작업명, 단가), v in 정렬행:
        결과.append({
            "코드": 코드맵.get(품목, "M"),
            "표시품명": f"{품목}({작업명})" if 작업명 else 품목,
            "작업명": 작업명,
            "품목": 품목,
            "수량": v["수량"],
            "단가": 단가,
            "금액": v["금액"],
        })
    return 결과


def _절삭2(x):
    """소수점 셋째 자리부터 잘라 버림(반올림 아님) — 부동소수점 오차(예: 14.29*100=1428.9999...)
    로 한 자리 낮게 잘리는 걸 막기 위해 아주 작은 보정값을 더한 뒤 자른다. billingRules.절삭2()와 대칭."""
    return math.floor(x * 100 + 1e-9) / 100


def _평가_조건단일(row, 조건단일):
    필드값 = 조건단일["field"]
    비교값 = 조건단일.get("value", "")
    if 필드값 == "단가":
        # 단가는 숫자라 문자열 비교(str(14.0)=="14.0" 등)가 파이썬·JS 간 표현이 달라 어긋날 수 있음
        # → 숫자로 변환해 소수 2자리까지 절삭 비교(2026-07-28 조건식 "단가" 필드 추가)
        try:
            return _절삭2(float(row.get("단가", 0) or 0)) == _절삭2(float(비교값))
        except (TypeError, ValueError):
            return False
    필드값문자 = str(row.get(필드값, "") or "")
    비교값문자 = str(비교값 or "")
    if 조건단일.get("op") == "contains":
        return 비교값문자 in 필드값문자
    return 필드값문자 == 비교값문자


def _평가_and그룹(row, and그룹):
    조건들 = and그룹.get("and", [])
    if not 조건들:
        return False
    return all(_평가_조건단일(row, c) for c in 조건들)


def 평가_조건(row, 조건):
    """원본 행 하나(정렬행_원본목록()이 반환하는 dict)가 저장된 조건(OR-of-AND 트리)에 맞는지 판정.
    조건 = {"or": [{"and": [{"field","op","value"}, ...]}, ...]}
    조건["or"]가 빈 리스트면 무조건 True — 코드 구분 없이 전체를 합산하는 규칙을 표현하기 위함."""
    그룹들 = 조건.get("or", [])
    if not 그룹들:
        return True
    return any(_평가_and그룹(row, g) for g in 그룹들)


def 적용_규칙(원본행목록, 규칙목록):
    """원본행목록(정렬행_원본목록() 반환 형식)에 저장된 규칙들을 적용해 고객사 청구 명세서 초안을 만든다.
    규칙목록: [{"순서","최종청구품명","조건"}, ...] (순서는 오름차순으로 재정렬해서 검사)
    각 원본 행은 순서가 빠른 규칙부터 검사해 처음 매칭되는 규칙 한 곳에만 속한다(이중 청구 방지) —
    "전체 합산" 규칙(조건 없음)과 특정 코드 규칙을 같이 쓸 때는 전체 합산 규칙을 맨 뒤에 둬서
    "나머지 전부"를 받는 용도로 쓴다.
    반환: (규칙적용결과, 미분류) — 규칙적용결과는 규칙목록 순서 그대로
    [{"코드","표시품명","수량","단가"(단가가 갈리면 None),"금액"}, ...], 미분류는 어느 규칙에도
    안 걸린 원본행목록의 원소 그대로."""
    규칙정렬 = sorted(규칙목록, key=lambda r: r.get("순서", 0))
    매칭됨 = [False] * len(원본행목록)
    결과 = []
    for 규칙 in 규칙정렬:
        수량합 = 0.0
        금액합 = 0.0
        단가집합 = set()
        코드집합 = set()
        for i, row in enumerate(원본행목록):
            if 매칭됨[i]:
                continue
            if 평가_조건(row, 규칙["조건"]):
                매칭됨[i] = True
                수량합 += row["수량"]
                금액합 += row["금액"]
                단가집합.add(row["단가"])
                코드집합.add(row["코드"])
        결과.append({
            "코드": 코드집합.pop() if len(코드집합) == 1 else "",
            "표시품명": 규칙["최종청구품명"],
            "수량": 수량합,
            "단가": 단가집합.pop() if len(단가집합) == 1 else None,
            "금액": 금액합,
            "조": 규칙.get("조"),  # 조별 분할발급(2026-07-29) — 없으면 None(하위호환, 거래명세서 1건)
        })
    미분류 = [row for i, row in enumerate(원본행목록) if not 매칭됨[i]]
    return 결과, 미분류


def generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일):
    """zipfile+regex로 템플릿 xlsx 가변 셀만 교체 — Excel 불필요, 빠름.
    build_품목행()으로 원본 품목을 계산한 뒤 write_거래명세서_excel()에 위임(로직은 그대로,
    Excel 작성부만 별도 함수로 분리해 GET /거래명세서엑셀/{no}가 DB에 저장된 품목으로도
    같은 함수를 재사용할 수 있게 한다).
    청구된 작업명들의 부가세구분이 섞여 있으면(결정_부가세구분()) ValueError를 낸다 — 호출부(api.py)가
    이를 HTTPException으로 변환해 발급/다운로드를 막는다(2026-08-04)."""
    정렬행, 총합계, 거래처명, 업무명, 코드맵, 부가세구분맵 = build_품목행(df_all, 단가맵, 자재map, 의뢰서번호셋)
    if not 정렬행:
        return None
    품목행목록 = 정렬행_원본목록(정렬행, 코드맵)
    세액, _ = 부가세_계산(결정_부가세구분(부가세구분맵), 총합계)
    return write_거래명세서_excel(품목행목록, 총합계, 세액, 거래처명, 업무명, 발행일)


def write_거래명세서_excel(품목행목록, 총합계, 세액, 거래처명, 업무명, 발행일):
    """정렬행_원본목록() 반환 형식(또는 동일 형식으로 재구성한 편집/규칙 적용 결과)을 받아
    실제 xlsx 바이트를 만든다. generate_거래명세서_excel()과 GET /거래명세서엑셀/{no}(편집된
    거래명세서_품목 DB 레코드) 양쪽에서 공용으로 쓴다.
    세액: 부가세_계산()으로 미리 구한 값(거래처가 "포함"이면 0) — 총합계(공급가액)에 더해
    한글 금액·상단 총계·하단 합계를 실제 청구 총액(부가세 포함)으로 맞춘다(2026-07-28)."""
    구분날짜 = f"{발행일.month:02d}월{발행일.day:02d}일"

    # 템플릿 품목 영역은 16~29행(14줄) — 이보다 많으면 29행 뒤에 행을 복제해 끼워넣음
    기본_품목행수 = 14
    추가행수 = max(0, len(품목행목록) - 기본_품목행수)

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

    def _insert_extra_item_rows(xml, n_extra):
        """29행 뒤에 품목 행 n_extra개를 복제 삽입하고, 30행 이후(소계·합계·코드표 등)를 n_extra만큼 아래로 민다.
        복제 원본은 20행(A열·글꼴이 표준인 "정상" 품목 행) — 29행은 A열 셀이 없고 글꼴도 달라 복제 원본으로 부적합."""
        existing_rows = sorted(
            {int(r) for r in re.findall(r'<row r="(\d+)"', xml) if int(r) >= 30},
            reverse=True,
        )
        for old_r in existing_rows:
            new_r = old_r + n_extra
            xml = re.sub(rf'<row r="{old_r}"', f'<row r="{new_r}"', xml, count=1)
            xml = re.sub(rf'<c r="([A-Z]+){old_r}"', rf'<c r="\g<1>{new_r}"', xml)

        def _bump_ref(m):
            def bump(cellref):
                col = re.match(r"[A-Z]+", cellref).group(0)
                row = int(re.search(r"\d+", cellref).group(0))
                return f"{col}{row + n_extra}" if row >= 30 else cellref
            return f'<mergeCell ref="{":".join(bump(p) for p in m.group(1).split(":"))}"/>'

        xml = re.sub(r'<mergeCell ref="([^"]+)"/>', _bump_ref, xml)

        template_row_m = re.search(r'<row r="20"[^>]*>(.*?)</row>', xml, re.DOTALL)
        insert_after_m = re.search(r'<row r="29"[^>]*>.*?</row>', xml, re.DOTALL)
        new_rows = []
        for k in range(n_extra):
            new_r = 30 + k
            cloned_cells = re.sub(r'r="([A-Z]+)20"', rf'r="\g<1>{new_r}"', template_row_m.group(1))
            new_rows.append(f'<row r="{new_r}" spans="1:17" ht="32.549999999999997" customHeight="1">{cloned_cells}</row>')
        xml = xml[:insert_after_m.end()] + "".join(new_rows) + xml[insert_after_m.end():]

        new_merges = "".join(
            f'<mergeCell ref="B{30+k}:C{30+k}"/><mergeCell ref="D{30+k}:G{30+k}"/><mergeCell ref="K{30+k}:M{30+k}"/>'
            for k in range(n_extra)
        )
        xml = re.sub(
            r'(<mergeCells count=")(\d+)(">)',
            lambda m: f'{m.group(1)}{int(m.group(2)) + n_extra * 3}{m.group(3)}',
            xml,
        )
        xml = xml.replace("</mergeCells>", new_merges + "</mergeCells>")

        xml = re.sub(
            r'<dimension ref="([A-Z]+\d+):([A-Z]+)(\d+)"/>',
            lambda m: f'<dimension ref="{m.group(1)}:{m.group(2)}{int(m.group(3)) + n_extra}"/>',
            xml,
        )
        return xml

    with zipfile.ZipFile(템플릿_PATH, 'r') as zin:
        file_map = {name: zin.read(name) for name in zin.namelist()}

    xml = file_map["xl/worksheets/sheet2.xml"].decode("utf-8")

    if 추가행수 > 0:
        xml = _insert_extra_item_rows(xml, 추가행수)
        wb_xml = file_map["xl/workbook.xml"].decode("utf-8")
        wb_xml = re.sub(
            r'(<definedName name="_xlnm\.Print_Area" localSheetId="1">[^<]+?)\$([A-Z]+)\$(\d+)(</definedName>)',
            lambda m: f'{m.group(1)}${m.group(2)}${int(m.group(3)) + 추가행수}{m.group(4)}',
            wb_xml,
        )
        file_map["xl/workbook.xml"] = wb_xml.encode("utf-8")

    소계_행 = 30 + 추가행수
    합계_행 = 31 + 추가행수
    최종합계 = round(총합계) + round(세액)

    # 헤더 — 상단 "총계"(K14·D14 한글금액)와 하단 "합계"(J{합계_행})는 항상 같은 최종 청구액
    # (부가세 포함, "포함" 거래처는 세액=0이라 공급가액과 동일)을 쓴다(2026-07-28 버그 수정 —
    # 지금까지는 부가세가 전혀 더해지지 않은 채 "부가세 포함" 라벨만 붙어 있었음).
    xml = _set_str(xml, "B10", 발행일.strftime("%Y-%m-%d"))
    xml = _set_str(xml, "B11", 거래처명)
    xml = _set_str(xml, "B12", 업무명)
    xml = _set_str(xml, "D14", f"금 {num2words(최종합계, lang='ko')}")
    xml = _set_num(xml, "K14", 최종합계)
    xml = _set_num(xml, f"K{소계_행}", round(총합계))
    if 세액:
        # 소계 줄의 "비고" 칸(N열, 지금까지 항상 비어 있던 자리)을 그대로 재활용해 부가세 금액만
        # 표기(라벨 텍스트 없이 숫자만, 2026-07-29 사용자 요청) — 공급가액 칸(K{소계_행})과 완전히
        # 같은 스타일(폰트 크기·정렬·천단위 서식)을 그대로 복사해서 적용, 별도 줄/템플릿 구조
        # 변경 없음(사용자 확정, 2026-07-28). "포함" 거래처(세액=0)는 그대로 비워 둔다.
        공급가액_스타일_m = re.search(rf'<c r="K{소계_행}"([^>]*?)/?>', xml)
        공급가액_스타일 = re.search(r's="(\d+)"', 공급가액_스타일_m.group(1)).group(0) if 공급가액_스타일_m else ''
        새_비고셀 = f'<c r="N{소계_행}" {공급가액_스타일}><v>{round(세액)}</v></c>'
        xml = re.sub(rf'<c r="N{소계_행}"[^>]*?(?:/>|>.*?</c>)', 새_비고셀, xml, count=1, flags=re.DOTALL)
    xml = _set_num(xml, f"J{합계_행}", 최종합계)

    # 품목 행 (16행부터, 필요한 만큼 — 14줄 초과 시 위에서 미리 행을 늘려둠)
    첫행 = True
    for i, row in enumerate(품목행목록):
        r = 16 + i
        xml = _set_str(xml, f"A{r}", row.get("코드") or "")
        if 첫행:
            xml = _set_str(xml, f"B{r}", 구분날짜)
            첫행 = False
        xml = _set_str(xml, f"D{r}", row["표시품명"])
        xml = _set_num(xml, f"I{r}", int(row["수량"]))
        단가 = row.get("단가")
        if 단가 is None:
            xml = _set_str(xml, f"J{r}", "—")
        else:
            xml = _set_num(xml, f"J{r}", 단가)
        xml = _set_num(xml, f"K{r}", round(row["금액"]))

    file_map["xl/worksheets/sheet2.xml"] = xml.encode("utf-8")

    # ── 직인 삽입 ──────────────────────────────────────────────
    # 위치 조정 파라미터 (필요 시 여기만 수정)
    # 김형석 셀 = M11:N11 병합 (drawing col 12~13, 0-based)
    # M열(col 12) 너비 ≈ 567,000 EMU / 행 높이 ≈ 413,385 EMU
    # 직인 크기 1.5cm = 540,000 EMU / N열 너비 ≈ 1,094,000 EMU
    # 중앙 오프셋 = (1,094,000 - 540,000) / 2 = 277,000 EMU
    _직인_col_from = 13       # N열 (drawing 0-based)
    _직인_colOff_from = 583000   # 이전(430k) + 153k = "석" 오른쪽 끝 살짝 겹침
    _직인_row_from = 10       # Excel 11행 성명 행 (0-based)
    _직인_rowOff_from = 0
    _직인_col_to = 14       # O열 (N열 초과 — 583k+540k=1,123k > N열 1,094k)
    _직인_colOff_to = 29000    # 1,123,000 - 1,094,000 = 29,000 EMU
    _직인_row_to = 11       # Excel 12행 (0-based)
    _직인_rowOff_to = 127000   # 높이 ≈ 540,000 EMU = 1.5cm

    if 직인_PATH.exists():
        file_map["xl/media/image2.png"] = 직인_PATH.read_bytes()

        d_rels = file_map["xl/drawings/_rels/drawing1.xml.rels"].decode("utf-8")
        d_rels = d_rels.replace(
            "</Relationships>",
            '<Relationship Id="rId2" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" '
            'Target="../media/image2.png"/></Relationships>'
        )
        file_map["xl/drawings/_rels/drawing1.xml.rels"] = d_rels.encode("utf-8")

        seal_anchor = (
            '<xdr:twoCellAnchor editAs="oneCell">'
            f'<xdr:from><xdr:col>{_직인_col_from}</xdr:col>'
            f'<xdr:colOff>{_직인_colOff_from}</xdr:colOff>'
            f'<xdr:row>{_직인_row_from}</xdr:row>'
            f'<xdr:rowOff>{_직인_rowOff_from}</xdr:rowOff></xdr:from>'
            f'<xdr:to><xdr:col>{_직인_col_to}</xdr:col>'
            f'<xdr:colOff>{_직인_colOff_to}</xdr:colOff>'
            f'<xdr:row>{_직인_row_to}</xdr:row>'
            f'<xdr:rowOff>{_직인_rowOff_to}</xdr:rowOff></xdr:to>'
            '<xdr:pic><xdr:nvPicPr>'
            '<xdr:cNvPr id="6" name="직인"/>'
            '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>'
            '</xdr:nvPicPr>'
            '<xdr:blipFill>'
            '<a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
            ' r:embed="rId2"/>'
            '<a:stretch><a:fillRect/></a:stretch>'
            '</xdr:blipFill>'
            '<xdr:spPr>'
            '<a:xfrm><a:off x="0" y="0"/><a:ext cx="838800" cy="838800"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            '</xdr:spPr>'
            '</xdr:pic><xdr:clientData/>'
            '</xdr:twoCellAnchor>'
        )
        d_xml = file_map["xl/drawings/drawing1.xml"].decode("utf-8")
        d_xml = d_xml.replace("</xdr:wsDr>", seal_anchor + "</xdr:wsDr>")
        file_map["xl/drawings/drawing1.xml"] = d_xml.encode("utf-8")

    tmp_path = os.path.join(tempfile.gettempdir(), "거래명세서_tmp.xlsx")
    with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name, data in file_map.items():
            zout.writestr(name, data)

    with open(tmp_path, "rb") as f:
        return f.read()


def combine_거래명세서_시트들(시트_목록):
    """write_거래명세서_excel()이 만든 완성된 단일-데이터-시트 xlsx(표지 sheet1 + 데이터 sheet2)를
    여러 개 [(엑셀바이트, 시트명), ...] 로 받아, 표지 시트("요청내용")·셀 코멘트(comments1.xml)·
    vmlDrawing은 통합본에서 제외하고 데이터 시트만 하나의 워크북에 이어붙인 xlsx bytes를 반환한다
    (거래명세서 조별 분할발급, 2026-07-29 — `.claude/plans/plan_거래명세서_조별분할발급_통합엑셀.md`).

    모든 입력 파일이 같은 템플릿(거래명세서_템플릿_base.xlsx)·같은 직인 이미지에서 나온다는 전제로,
    styles.xml·sharedStrings.xml·theme·직인 이미지·printerSettings는 전부 첫 파일(컨테이너) 것을
    그대로 공유 재사용한다(생성 코드가 셀 값만 바꿀 뿐 스타일·공유문자열·이미지는 절대 건드리지
    않으므로 모든 출력이 바이트 단위로 동일 — 재넘버링 불필요, 구현 전 zipfile 실제 덤프로 확인)."""
    if len(시트_목록) <= 1:
        return 시트_목록[0][0] if 시트_목록 else None

    file_maps = []
    for 엑셀바이트, _ in 시트_목록:
        with zipfile.ZipFile(io.BytesIO(엑셀바이트)) as z:
            file_maps.append({name: z.read(name) for name in z.namelist()})

    def _safe_sheet_name(name, used):
        name = re.sub(r"[\[\]\*\?:/\\']", "", str(name or "")).strip()[:31] or "시트"
        원본, n = name, 2
        while name in used:
            접미 = f"({n})"
            name = 원본[: 31 - len(접미)] + 접미
            n += 1
        used.add(name)
        return name

    def _xml_esc(text):
        return (str(text).replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))

    def _strip_comment_ref(sheet_xml, rels_xml):
        """legacyDrawing(VML 셀 코멘트) 관계를 rId 번호 하드코딩 없이 Type 기준으로 찾아 제거."""
        vml_m = re.search(r'<Relationship Id="(rId\d+)"[^>]*Type="[^"]*/vmlDrawing"[^>]*/>', rels_xml)
        comment_m = re.search(r'<Relationship Id="(rId\d+)"[^>]*Type="[^"]*/comments"[^>]*/>', rels_xml)
        if vml_m:
            sheet_xml = sheet_xml.replace(f'<legacyDrawing r:id="{vml_m.group(1)}"/>', '')
            rels_xml = rels_xml.replace(vml_m.group(0), '')
        if comment_m:
            rels_xml = rels_xml.replace(comment_m.group(0), '')
        return sheet_xml, rels_xml

    def _relink_drawing(rels_xml, new_target):
        return re.sub(
            r'(<Relationship Id="rId\d+" Type="[^"]*/drawing" Target=")[^"]*(")',
            rf'\g<1>{new_target}\g<2>',
            rels_xml,
        )

    def _print_area_range(wb_xml):
        m = re.search(
            r"<definedName name=\"_xlnm\.Print_Area\" localSheetId=\"1\">"
            r"'[^']*'!(\$[A-Z]+\$\d+:\$[A-Z]+\$\d+)</definedName>",
            wb_xml,
        )
        return m.group(1) if m else "$B$1:$N$31"

    base = dict(file_maps[0])
    for key in (
        "xl/worksheets/sheet1.xml", "xl/worksheets/_rels/sheet1.xml.rels",
        "xl/comments1.xml", "xl/drawings/vmlDrawing1.vml",
        "xl/printerSettings/printerSettings1.bin",
    ):
        base.pop(key, None)

    ct = base["[Content_Types].xml"].decode("utf-8")
    ct = re.sub(r'<Override PartName="/xl/worksheets/sheet1\.xml"[^>]*/>', '', ct)
    ct = re.sub(r'<Override PartName="/xl/comments1\.xml"[^>]*/>', '', ct)

    wb_xml = base["xl/workbook.xml"].decode("utf-8")
    wb_rels = base["xl/_rels/workbook.xml.rels"].decode("utf-8")

    sheet1_rel_m = re.search(r'<Relationship Id="(rId\d+)"[^>]*Target="worksheets/sheet1\.xml"[^>]*/>', wb_rels)
    wb_rels = wb_rels.replace(sheet1_rel_m.group(0), '')
    wb_xml = re.sub(rf'<sheet [^>]*r:id="{sheet1_rel_m.group(1)}"[^>]*/>', '', wb_xml, count=1)

    data_rid = re.search(
        r'<Relationship Id="(rId\d+)"[^>]*Target="worksheets/sheet2\.xml"[^>]*/>', wb_rels
    ).group(1)
    next_id = max(int(n) for n in re.findall(r'rId(\d+)', wb_rels)) + 1

    used_names = set()
    sheet_entries = []   # [(시트명, rid), ...] — <sheets> 재구성용
    print_areas = []     # [(localSheetId, 시트명, 범위), ...] — Print_Area 재구성용

    for i, (엑셀바이트, 시트명) in enumerate(시트_목록):
        이름 = _safe_sheet_name(시트명 or f"시트{i+1}", used_names)
        범위 = _print_area_range(file_maps[i]["xl/workbook.xml"].decode("utf-8"))
        print_areas.append((i, 이름, 범위))

        own_sheet = file_maps[i]["xl/worksheets/sheet2.xml"].decode("utf-8")
        own_rels = file_maps[i]["xl/worksheets/_rels/sheet2.xml.rels"].decode("utf-8")
        own_sheet, own_rels = _strip_comment_ref(own_sheet, own_rels)

        if i == 0:
            sheet_entries.append((이름, data_rid))
            base["xl/worksheets/sheet2.xml"] = own_sheet.encode("utf-8")
            base["xl/worksheets/_rels/sheet2.xml.rels"] = own_rels.encode("utf-8")
            continue

        new_rid = f"rId{next_id}"
        next_id += 1
        sheet_num = i + 2  # sheet2.xml은 이미 사용 중(첫 파일) → 3, 4, ...
        sheet_entries.append((이름, new_rid))

        wb_rels = wb_rels.replace(
            "</Relationships>",
            f'<Relationship Id="{new_rid}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            f'Target="worksheets/sheet{sheet_num}.xml"/></Relationships>',
        )
        ct = ct.replace(
            "</Types>",
            f'<Override PartName="/xl/worksheets/sheet{sheet_num}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            f'<Override PartName="/xl/drawings/drawing{sheet_num}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>',
        )

        own_rels = _relink_drawing(own_rels, f"../drawings/drawing{sheet_num}.xml")
        base[f"xl/worksheets/sheet{sheet_num}.xml"] = own_sheet.encode("utf-8")
        base[f"xl/worksheets/_rels/sheet{sheet_num}.xml.rels"] = own_rels.encode("utf-8")
        # 도장 이미지(image1.png 로고·image2.png 직인)는 base 컨테이너 것을 그대로 참조하므로
        # drawing 파일 자체(내부 rId1/rId2)와 그 rels는 이름만 바꿔 그대로 복사하면 된다.
        base[f"xl/drawings/drawing{sheet_num}.xml"] = file_maps[i]["xl/drawings/drawing1.xml"]
        base[f"xl/drawings/_rels/drawing{sheet_num}.xml.rels"] = file_maps[i]["xl/drawings/_rels/drawing1.xml.rels"]

    sheets_block = "".join(
        f'<sheet name="{_xml_esc(name)}" sheetId="{1000 + idx}" r:id="{rid}"/>'
        for idx, (name, rid) in enumerate(sheet_entries)
    )
    wb_xml = re.sub(r'<sheets>.*?</sheets>', f'<sheets>{sheets_block}</sheets>', wb_xml, count=1, flags=re.DOTALL)

    wb_xml = re.sub(r'<definedName name="_xlnm\.Print_Area"[^<]*</definedName>', '', wb_xml, count=1)
    print_area_block = "".join(
        f'<definedName name="_xlnm.Print_Area" localSheetId="{idx}">\'{_xml_esc(name)}\'!{범위}</definedName>'
        for idx, name, 범위 in print_areas
    )
    wb_xml = wb_xml.replace("<definedNames>", "<definedNames>" + print_area_block, 1)

    base["[Content_Types].xml"] = ct.encode("utf-8")
    base["xl/workbook.xml"] = wb_xml.encode("utf-8")
    base["xl/_rels/workbook.xml.rels"] = wb_rels.encode("utf-8")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name, data in base.items():
            zout.writestr(name, data)
    return buf.getvalue()


def build_단가맵(단가df):
    """단가마스터 DataFrame(거래처명·업무명·작업명·8개 단가 필드) → calc_공급가맵/generate_거래명세서_excel이 쓰는 dict로 변환.
    MariaDB DECIMAL 컬럼은 pymysql이 Decimal로 반환하는데, 계산 도중 float(0.0)과 섞이면
    "unsupported operand type(s) for +=: 'float' and 'decimal.Decimal'" 오류가 나므로 float으로 통일한다
    (app.py의 load_단가마스터()가 SQLite 조회 후 pd.to_numeric()으로 float 변환하던 것과 동일한 처리)."""
    단가컬럼 = ["출력단가", "봉입단가", "추가봉입단가", "동봉물삽입단가", "용지제작단가", "봉투제작단가",
                "삽지제작단가", "각대대봉투단가", "각대대봉투봉입단가"]
    단가컬럼 = [c for c in 단가컬럼 if c in 단가df.columns]
    부가세구분있음 = "부가세구분" in 단가df.columns
    return {
        (r["거래처명"],
         None if pd.isna(r["업무명"]) else r["업무명"],
         None if pd.isna(r["작업명"]) else r["작업명"]): {
            **{c: float(r[c] or 0) for c in 단가컬럼},
            # 부가세구분은 숫자가 아니라 "포함"/"별도" 문자열이라 단가컬럼과 분리 처리(2026-07-28).
            "부가세구분": (r["부가세구분"] if 부가세구분있음 and pd.notna(r["부가세구분"]) else None) or "별도",
        }
        for _, r in 단가df.iterrows()
    }


def 결정_부가세구분(부가세구분맵):
    """{작업명: "포함"/"별도"} 맵(build_품목행()·calc_공급가맵()이 반환)을 받아, 이 거래명세서에
    실제로 청구된 작업명들의 부가세 취급이 전부 같으면 그 값을 반환한다.
    맵이 비어 있으면(매칭된 단가가 하나도 없는 예외 상황) 기본값 '별도'.
    섞여 있으면(포함/별도 혼재) ValueError를 낸다 — 거래명세서 발급·다운로드·부분취소를 막고
    단가마스터를 통일하도록 안내하기 위함(2026-08-04, 사용자 확정: 거래처 기본단가 행이 아니라
    실제 청구된 작업명 기준으로 판정해야 하고, 작업명끼리 값이 다르면 발급 자체를 막아야 함 —
    기본단가 행이 없는 거래처(예: KB국민카드)는 항상 '별도'로 잘못 계산되던 버그로 발견됨)."""
    구분들 = set(부가세구분맵.values()) if 부가세구분맵 else {"별도"}
    if len(구분들) > 1:
        상세 = ", ".join(f"{작업}={구분}" for 작업, 구분 in 부가세구분맵.items())
        raise ValueError(
            f"작업명별 부가세 처리 방식이 서로 다릅니다({상세}). 단가마스터에서 통일한 뒤 다시 시도해 주세요."
        )
    return next(iter(구분들))


def 부가세_계산(부가세구분, 공급가액):
    """이미 결정된 단일 부가세구분("포함"/"별도", 결정_부가세구분() 참고)으로 세액·합계를 계산.
    '포함'이면 단가에 이미 부가세가 포함된 것으로 보고 세액=0, 합계=공급가액 그대로.
    '별도'(기본값)면 공급가액의 10%를 세액으로 더한다."""
    if 부가세구분 == "포함":
        return 0, 공급가액
    세액 = round(공급가액 * 0.1)
    return 세액, 공급가액 + 세액


def build_자재map(자재df):
    """자재 라인 데이터(컬럼: 업무의뢰서번호·작업이름·자재종류·자재형태·사용량) →
    (int(업무의뢰서번호), 작업이름) 키로 일반봉투/각대대봉투/용지/삽지 수량을 담은 dict로 변환.
    자재형태는 자재종류='봉투' 행에서만 의미 있고(일반봉투/각대대봉투), 비어있으면 일반봉투로 간주한다
    (자재명이 없는 실시간 수신 건은 이미 저장 시점에 "일반봉투"로 채워짐 — data_transform.merge_자재 참고)."""
    if 자재df.empty:
        return {}

    def _분류(row):
        if row["자재종류"] == "봉투":
            return "각대대봉투_수량" if row.get("자재형태") == "각대대봉투" else "일반봉투_수량"
        if row["자재종류"] == "용지":
            return "용지_수량"
        if row["자재종류"] == "삽지":
            return "삽지_수량"
        return None

    자재df = 자재df.copy()
    자재df["_컬럼"] = 자재df.apply(_분류, axis=1)
    자재df = 자재df[자재df["_컬럼"].notna()]

    grp = 자재df.groupby(["업무의뢰서번호", "작업이름", "_컬럼"])["사용량"].sum().reset_index()
    자재map = {}
    for _, r in grp.iterrows():
        key = (int(r["업무의뢰서번호"]), r["작업이름"])
        자재map.setdefault(key, {"일반봉투_수량": 0, "각대대봉투_수량": 0, "용지_수량": 0, "삽지_수량": 0})
        자재map[key][r["_컬럼"]] = int(r["사용량"])
    return 자재map


def build_의뢰서_summary(df_all, 자재df):
    """운영통계자료(df_all)를 업무의뢰서번호 단위로 집계 — app.py의 동명 함수(124~143행)와 동일 로직.
    자재 데이터만 api.py의 _자재map_조회() 결과 형태(라인 단위: 업무의뢰서번호·작업이름·자재종류·자재형태·사용량)를
    받아 의뢰서 단위로 재집계한다(app.py는 load_자재_summary()로 로컬 엑셀을 직접 읽지만 계산 결과는 동일).

    df_all 필요 컬럼: 업무의뢰서번호·거래처명·업무명·작업명·업무명상세·사업부·연월·날짜·마케팅담당자·
                      확정청구페이지·건수·출력페이지·장수
    반환 컬럼: 업무의뢰서번호, 거래처명, 업무명, 작업명, 업무명상세, 사업부, 연월, 날짜, 마케팅담당자,
              봉입건수_합, 출력페이지_합, 장수_합, 확정청구페이지,
              봉투_사용량_합, 용지_사용량_합, 삽지_사용량_합 (전부 int)
    """
    first = df_all.groupby("업무의뢰서번호", sort=False).first().reset_index()
    agg = df_all.groupby("업무의뢰서번호", sort=False).agg(
        봉입건수_합=("건수", "sum"),
        출력페이지_합=("출력페이지", "sum"),
        장수_합=("장수", "sum"),
        확정청구페이지=("확정청구페이지", "sum"),
    ).reset_index()
    result = first[["업무의뢰서번호", "거래처명", "업무명", "작업명", "업무명상세",
                     "사업부", "연월", "날짜", "마케팅담당자"]].merge(agg, on="업무의뢰서번호")

    if 자재df is not None and not 자재df.empty:
        z = 자재df.copy()
        z["_컬럼"] = z["자재종류"].map({"봉투": "봉투_사용량_합", "용지": "용지_사용량_합", "삽지": "삽지_사용량_합"})
        z = z[z["_컬럼"].notna()]
        if not z.empty:
            자재_의뢰서 = z.groupby(["업무의뢰서번호", "_컬럼"])["사용량"].sum().unstack(fill_value=0).reset_index()
            result = result.merge(자재_의뢰서, on="업무의뢰서번호", how="left")

    # SKILL-12: 자재종류 일부만 등장하는 소량 결과(사업부 필터 등)에서는 특정 자재종류 컬럼 자체가
    # 안 생길 수 있으므로 항상 3개 컬럼을 보장한다.
    for c in ("봉투_사용량_합", "용지_사용량_합", "삽지_사용량_합"):
        if c not in result.columns:
            result[c] = 0
        result[c] = result[c].fillna(0).astype(int)
    return result
