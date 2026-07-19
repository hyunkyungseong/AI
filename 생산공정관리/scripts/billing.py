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


def calc_공급가맵(df_all, 단가맵, 자재map, 의뢰서번호셋):
    """의뢰서번호 집합 → {의뢰서번호int: {"합계": float, "거래처명": str, "업무명": str,
                                           "항목": {품명: 금액}, "수량": {품명: 수량}, "단가": {품명: 단가}}}"""
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
        z = 자재map.get((의뢰서, 작업), {"일반봉투_수량": 0, "각대대봉투_수량": 0, "용지_수량": 0, "삽지_수량": 0})
        일반봉투 = z["일반봉투_수량"]
        각대대봉투 = z["각대대봉투_수량"]
        용지 = z["용지_수량"]
        삽지 = z["삽지_수량"]
        봉입건수 = _r["봉입건수"]
        장수 = _r["장수"]
        추가용지 = max(0, 장수 - 봉입건수)
        청구페이지 = _r["출력단가기준페이지"]
        항목금액 = {
            "출력비": 청구페이지 * rates.get("출력단가", 0),
            "봉입비": 봉입건수 * rates.get("봉입단가", 0) + 각대대봉투 * rates.get("각대대봉투봉입단가", 0),
            "용지제작비": 용지 * rates.get("용지제작단가", 0),
            "봉투제작비": 일반봉투 * rates.get("봉투제작단가", 0) + 각대대봉투 * rates.get("각대대봉투단가", 0),
            "추가봉입비": (삽지 + 추가용지) * rates.get("추가봉입단가", 0),
            "삽지봉입비": 삽지 * rates.get("삽지제작단가", 0),
        }
        항목수량 = {
            "출력비": 청구페이지,
            "봉입비": 봉입건수 + 각대대봉투,
            "용지제작비": 용지,
            "봉투제작비": 일반봉투 + 각대대봉투,
            "추가봉입비": 삽지 + 추가용지,
            "삽지봉입비": 삽지,
        }
        항목단가 = {
            "출력비": rates.get("출력단가", 0),
            "봉입비": rates.get("봉입단가", 0),
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
            결과[의뢰서]["단가"][k] = 항목단가[k]  # 마지막 작업명 단가 사용 (단순화)
    return 결과


def build_품목행(df_all, 단가맵, 자재map, 의뢰서번호셋):
    """의뢰서번호 집합 → (정렬행, 총합계, 거래처명, 업무명, 코드맵)

    정렬행: [((품목, 작업명, 단가), {"수량": float, "금액": float}), ...] — 품목순서→코드표순서 정렬 완료
    generate_거래명세서_excel()과 화면 미리보기 API(POST /거래명세서미리보기) 공용 —
    원래 generate_거래명세서_excel() 안에 있던 계산 블록을 그대로 옮긴 것뿐, 로직은 한 글자도 안 바뀜.
    대상 의뢰서가 없거나(정렬행=[]) 등록된 단가가 없어 품목이 하나도 안 생기면 정렬행=[]로 반환한다
    (호출부가 `if not 정렬행:` 하나로 두 경우 모두 판별)."""
    품목순서 = ["출력비", "봉입비", "출력자재비", "봉입자재비", "추가봉입비", "삽지비"]
    코드맵 = {"출력비": "P", "봉입비": "M", "출력자재비": "F",
              "봉입자재비": "E", "추가봉입비": "M", "삽지비": "M"}
    순서맵 = {p: i for i, p in enumerate(품목순서)}
    코드표순서 = ["P", "M", "E", "F", "H", "BB", "AB", "D"]
    코드순서맵 = {c: i for i, c in enumerate(코드표순서)}

    _tgt = df_all[df_all["업무의뢰서번호"].apply(
        lambda x: int(float(x)) if pd.notna(x) else -1
    ).isin(의뢰서번호셋)].copy()
    if _tgt.empty:
        return [], 0, None, None, 코드맵

    _g = _tgt.groupby(["작업명", "거래처명", "업무명"], sort=False).agg(
        청구페이지=("확정청구페이지", "sum"),
        봉입건수=("건수", "sum"),
        장수=("장수", "sum"),
    ).reset_index()

    거래처명 = _g.iloc[0]["거래처명"]
    업무명 = _g.iloc[0]["업무명"]

    행데이터 = defaultdict(lambda: {"수량": 0.0, "금액": 0.0})
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
        항목계산 = {
            "출력비": (청구, rates.get("출력단가", 0)),
            "봉입비": (봉입건수 + 각대대봉투, rates.get("봉입단가", 0)),
            "출력자재비": (용지, rates.get("용지제작단가", 0)),
            "봉입자재비": (일반봉투 + 각대대봉투, rates.get("봉투제작단가", 0)),
            "추가봉입비": (삽지 + 추가용지, rates.get("추가봉입단가", 0)),
            "삽지비": (삽지, rates.get("삽지제작단가", 0)),
        }
        for 품목, (수량, 단가) in 항목계산.items():
            if 단가 > 0 and 수량 > 0:
                행데이터[(품목, 작업, 단가)]["수량"] += 수량
                행데이터[(품목, 작업, 단가)]["금액"] += 수량 * 단가

    정렬행 = sorted(행데이터.items(), key=lambda x: (
        x[0][1],
        코드순서맵.get(코드맵.get(x[0][0]), 99),
        순서맵.get(x[0][0], 99),
    ))
    총합계 = sum(v["금액"] for _, v in 정렬행) if 정렬행 else 0
    return 정렬행, 총합계, 거래처명, 업무명, 코드맵


def generate_거래명세서_excel(df_all, 단가맵, 자재map, 의뢰서번호셋, 발행일):
    """zipfile+regex로 템플릿 xlsx 가변 셀만 교체 — Excel 불필요, 빠름."""
    정렬행, 총합계, 거래처명, 업무명, 코드맵 = build_품목행(df_all, 단가맵, 자재map, 의뢰서번호셋)
    if not 정렬행:
        return None
    구분날짜 = f"{발행일.month:02d}월{발행일.day:02d}일"

    # 템플릿 품목 영역은 16~29행(14줄) — 이보다 많으면 29행 뒤에 행을 복제해 끼워넣음
    기본_품목행수 = 14
    추가행수 = max(0, len(정렬행) - 기본_품목행수)

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

    # 헤더
    xml = _set_str(xml, "B10", 발행일.strftime("%Y-%m-%d"))
    xml = _set_str(xml, "B11", 거래처명)
    xml = _set_str(xml, "B12", 업무명)
    xml = _set_str(xml, "D14", f"금 {num2words(round(총합계), lang='ko')}")
    xml = _set_num(xml, "K14", round(총합계))
    xml = _set_num(xml, f"K{소계_행}", round(총합계))
    xml = _set_num(xml, f"J{합계_행}", round(총합계))

    # 품목 행 (16행부터, 필요한 만큼 — 14줄 초과 시 위에서 미리 행을 늘려둠)
    첫행 = True
    for i, ((품목, 작업명_key, 단가), v) in enumerate(정렬행):
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


def build_단가맵(단가df):
    """단가마스터 DataFrame(거래처명·업무명·작업명·8개 단가 필드) → calc_공급가맵/generate_거래명세서_excel이 쓰는 dict로 변환.
    MariaDB DECIMAL 컬럼은 pymysql이 Decimal로 반환하는데, 계산 도중 float(0.0)과 섞이면
    "unsupported operand type(s) for +=: 'float' and 'decimal.Decimal'" 오류가 나므로 float으로 통일한다
    (app.py의 load_단가마스터()가 SQLite 조회 후 pd.to_numeric()으로 float 변환하던 것과 동일한 처리)."""
    단가컬럼 = ["출력단가", "봉입단가", "추가봉입단가", "용지제작단가", "봉투제작단가",
                "삽지제작단가", "각대대봉투단가", "각대대봉투봉입단가"]
    단가컬럼 = [c for c in 단가컬럼 if c in 단가df.columns]
    return {
        (r["거래처명"],
         None if pd.isna(r["업무명"]) else r["업무명"],
         None if pd.isna(r["작업명"]) else r["작업명"]): {c: float(r[c] or 0) for c in 단가컬럼}
        for _, r in 단가df.iterrows()
    }


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
