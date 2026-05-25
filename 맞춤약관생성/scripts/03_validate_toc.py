"""
엑셀 조건표의 목차명과 XML 텍스트 일치 여부 검증
- 특약 항목(담보코드 != L00000, 목차구분 = 특별약관)만 대상
- 결과: 일치 / XML에 없음(누락) / 엑셀에 없음 분류
"""

import os
import zipfile
import xml.etree.ElementTree as ET
import re

BASE_DIR   = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXCEL_PATH = BASE_DIR + r"\data\(조건표)L3912~L3913_다렉3.5.5(26.04).xlsx"
XML_PATH   = BASE_DIR + r"\data\무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관_formatted.xml"
OUT_PATH   = BASE_DIR + r"\docs\results\validate_result.txt"

NS = {'ss': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


# ── 1. 엑셀 목차명 추출 ────────────────────────────────────────────
def load_excel_toc(path):
    """sheet2에서 특약 목차명(담보코드 != L00000, 목차구분=특별약관) 추출"""
    with zipfile.ZipFile(path) as z:
        shared = []
        with z.open('xl/sharedStrings.xml') as f:
            for si in ET.parse(f).findall('.//ss:si', NS):
                shared.append(''.join(t.text or '' for t in si.findall('.//ss:t', NS)))

        with z.open('xl/worksheets/sheet2.xml') as f:
            rows = ET.parse(f).findall('.//ss:row', NS)

    def cell_val(c):
        v = c.find('ss:v', NS)
        if v is None or not v.text:
            return ''
        return shared[int(v.text)] if c.get('t') == 's' else v.text

    # 헤더 행 찾기 (seq, 목차명, 담보코드 ... 순)
    header_row = None
    items = []
    for row in rows:
        cells = [cell_val(c) for c in row.findall('ss:c', NS)]
        if cells and cells[0] == 'seq':
            header_row = cells
            continue
        if header_row and cells and cells[0].isdigit():
            seq       = cells[0] if len(cells) > 0 else ''
            toc_name  = cells[1].strip() if len(cells) > 1 else ''
            dambo     = cells[2].strip() if len(cells) > 2 else ''
            toc_class = cells[11].strip() if len(cells) > 11 else ''

            # 특약 항목만 (담보코드 있고, 목차구분이 특별약관)
            if toc_name and dambo and dambo != 'L00000':
                items.append({
                    'seq': seq,
                    'toc_name': toc_name,
                    'dambo': dambo,
                    'toc_class': toc_class,
                })
    return items


# ── 2. XML 텍스트 추출 (P 단락 단위로 CHAR 이어붙이기) ──────────────
def load_xml_texts(path):
    """
    <P> 단락 안의 모든 <CHAR> 텍스트를 이어붙인 뒤 공백 정규화하여 수집.
    개별 CHAR 텍스트도 함께 수집 (단독 CHAR가 일치하는 경우 대비).
    """
    texts = set()
    current_p_chars = []
    in_p = False

    for event, elem in ET.iterparse(path, events=['start', 'end']):
        if event == 'start':
            if elem.tag == 'P':
                in_p = True
                current_p_chars = []
        elif event == 'end':
            if elem.tag == 'CHAR' and elem.text and in_p:
                current_p_chars.append(elem.text)
                # 개별 CHAR도 수집
                norm = ' '.join(elem.text.split())
                if norm:
                    texts.add(norm)
            elif elem.tag == 'P':
                # P 단락 전체 이어붙인 텍스트 수집
                joined = ''.join(current_p_chars)
                norm = ' '.join(joined.split())
                if norm:
                    texts.add(norm)
                in_p = False
                current_p_chars = []
            elem.clear()
    return texts


# ── 3. 비교 ──────────────────────────────────────────────────────
def normalize(text):
    """비교용 공백 정규화"""
    return ' '.join(text.split())


def find_in_xml(toc_name, xml_texts):
    """목차명이 XML 텍스트에 존재하는지 확인 (완전 일치 또는 포함)"""
    norm = normalize(toc_name)
    if norm in xml_texts:
        return 'exact'
    # XML 텍스트 중 목차명을 포함하는 것이 있는지
    for xt in xml_texts:
        if norm in xt or xt in norm:
            return 'partial'
    return 'not_found'


# ── main ─────────────────────────────────────────────────────────
print("엑셀 목차명 로딩 중...")
excel_items = load_excel_toc(EXCEL_PATH)
print(f"  → 특약 항목 {len(excel_items)}개")

print("XML 텍스트 로딩 중 (시간이 걸릴 수 있습니다)...")
xml_texts = load_xml_texts(XML_PATH)
print(f"  → XML 텍스트 {len(xml_texts)}개")

print("비교 중...")
exact    = []
partial  = []
missing  = []

for item in excel_items:
    result = find_in_xml(item['toc_name'], xml_texts)
    if result == 'exact':
        exact.append(item)
    elif result == 'partial':
        partial.append(item)
    else:
        missing.append(item)

# ── 결과 출력 ─────────────────────────────────────────────────────
lines = []
lines.append("=" * 70)
lines.append("엑셀 조건표 ↔ XML 목차명 일치 검증 결과")
lines.append("=" * 70)
lines.append(f"전체 특약 항목: {len(excel_items)}개")
lines.append(f"  완전 일치: {len(exact)}개")
lines.append(f"  부분 일치: {len(partial)}개")
lines.append(f"  XML에 없음(누락): {len(missing)}개")
lines.append("")

if missing:
    lines.append("─" * 70)
    lines.append(f"[XML에 없는 목차명 — {len(missing)}개]")
    lines.append("─" * 70)
    for item in missing:
        lines.append(f"  seq={item['seq']:>3}  담보={item['dambo']:<10}  {item['toc_name']}")
    lines.append("")

if partial:
    lines.append("─" * 70)
    lines.append(f"[부분 일치 — 확인 필요 {len(partial)}개]")
    lines.append("─" * 70)
    for item in partial:
        lines.append(f"  seq={item['seq']:>3}  담보={item['dambo']:<10}  {item['toc_name']}")
    lines.append("")

lines.append("─" * 70)
lines.append(f"[완전 일치 — {len(exact)}개]")
lines.append("─" * 70)
for item in exact:
    lines.append(f"  seq={item['seq']:>3}  담보={item['dambo']:<10}  {item['toc_name']}")

result_text = '\n'.join(lines)

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(result_text)

# 콘솔 출력 (ASCII 안전 요약만)
print(f"완전 일치: {len(exact)}")
print(f"부분 일치: {len(partial)}")
print(f"XML 누락:  {len(missing)}")
print(f"결과 저장: {OUT_PATH}")
