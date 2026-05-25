"""
XML 특약별 시작~끝 범위 탐색
- SECTION 직접 자식 P 요소 순서(인덱스)를 기준으로 각 특약 그룹의 범위 탐색
- 결과를 JSON으로 저장

[XML 구조 요약]
SECTION
  P (장 헤더 TABLE)       ← 장 경계
  P (빈 줄)
  P (대+소 특약명 TABLE)  ← 특약 그룹 시작
  P (빈 줄)
  P (제1조...)            ← 조문
  P (본문...)
  ...
  P (다음 특약명 TABLE)   ← 다음 특약 그룹 시작 = 이전 특약 끝+1

[수정 사항]
- 하나의 담보코드가 여러 범위를 가질 수 있도록 리스트 구조 사용 (LN531G 등)
- 제4장·별표·색인은 공통 포함 → 공통 경계 TABLE P(제4장 헤더)를 탐지하여 end_idx 보정
"""

import os
import xml.etree.ElementTree as ET
import zipfile
import json

BASE_DIR   = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXCEL_PATH = BASE_DIR + r"\data\(조건표)L3912~L3913_다렉3.5.5(26.04).xlsx"
XML_PATH   = BASE_DIR + r"\data\무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관_formatted.xml"
OUT_JSON   = BASE_DIR + r"\work\range_map.json"
OUT_TXT    = BASE_DIR + r"\docs\results\range_map_result.txt"

NS_SS = {'ss': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

# 공통 포함 경계: 이 텍스트를 가진 TABLE P 이후는 항상 포함(삭제 금지)
# 제4장(제도성 특별약관)이 첫 공통 경계 — 특약 섹션(idx>600) 이후에서만 탐색
COMMON_BOUNDARY_TEXT = '제4장'
COMMON_BOUNDARY_MIN_IDX = 600  # 앞부분 TOC 영역 제외


# ── 1. 엑셀 조건표 로드 ───────────────────────────────────────────
def load_excel_toc(path):
    with zipfile.ZipFile(path) as z:
        shared = []
        with z.open('xl/sharedStrings.xml') as f:
            for si in ET.parse(f).findall('.//ss:si', NS_SS):
                shared.append(''.join(t.text or '' for t in si.findall('.//ss:t', NS_SS)))
        with z.open('xl/worksheets/sheet2.xml') as f:
            rows = ET.parse(f).findall('.//ss:row', NS_SS)

    def val(c):
        v = c.find('ss:v', NS_SS)
        if v is None or not v.text:
            return ''
        return shared[int(v.text)] if c.get('t') == 's' else v.text

    header_found = False
    items = []
    for row in rows:
        cells = [val(c) for c in row.findall('ss:c', NS_SS)]
        if cells and cells[0] == 'seq':
            header_found = True
            continue
        if header_found and cells and cells[0].isdigit():
            toc_name = cells[1].strip() if len(cells) > 1 else ''
            dambo    = cells[2].strip() if len(cells) > 2 else ''
            if toc_name and dambo and dambo != 'L00000':
                items.append({'seq': cells[0], 'toc_name': toc_name, 'dambo': dambo})
    return items


# ── 2. P 요소 내 전체 텍스트 추출 ────────────────────────────────
def get_elem_text(elem):
    chars = [c.text for c in elem.iter('CHAR') if c.text]
    return ' '.join(''.join(chars).split())


# ── 3. 범위 탐색 ─────────────────────────────────────────────────
def build_range_map(xml_path, toc_items):
    print("XML 파싱 중...")
    tree = ET.parse(xml_path)
    section = tree.getroot().find('.//SECTION')
    children = list(section)
    print(f"  → SECTION 직접 자식 요소: {len(children)}개")

    # 엑셀 목차명 → TOC 항목 매핑
    toc_set = {' '.join(item['toc_name'].split()): item for item in toc_items}

    # 공통 경계 시작 인덱스 탐색 (제4장 헤더 — TOC 이후 영역에서만)
    common_boundary_idx = len(children)
    for idx, child in enumerate(children):
        if idx < COMMON_BOUNDARY_MIN_IDX:
            continue
        if not child.findall('.//TABLE'):
            continue
        t = get_elem_text(child)
        if COMMON_BOUNDARY_TEXT in t and '특별약관' in t:
            common_boundary_idx = idx
            print(f"  → 공통 경계 발견: idx={idx}  [{t[:50]}]")
            break

    # TABLE P 탐색 (특약 범위 시작점)
    # entries: [(idx, matched_toc_items)]
    entries = []
    current_chapter = ''

    for idx, child in enumerate(children):
        if idx >= common_boundary_idx:
            break
        if child.tag != 'P':
            continue
        if not child.findall('.//TABLE'):
            continue

        full_text = get_elem_text(child)
        if not full_text:
            continue

        # 장(章) 헤더 감지
        if '장.' in full_text and '특별약관' in full_text:
            current_chapter = full_text[:full_text.index('특별약관') + 4].strip()

        # PARALIST 내부 P 텍스트와 엑셀 TOC 매칭
        matched = []
        for inner_p in child.findall('.//PARALIST/P'):
            inner_chars = [c.text for c in inner_p.iter('CHAR') if c.text]
            inner_text  = ' '.join(''.join(inner_chars).split())
            if inner_text in toc_set:
                matched.append({**toc_set[inner_text], 'chapter': current_chapter})

        if matched:
            entries.append((idx, matched))

    print(f"  → 특약 TABLE P 발견: {len(entries)}개 그룹")

    # 범위 할당 (end_idx: 다음 경계 직전 또는 공통 경계 직전)
    # 담보코드 → 범위 리스트 (동일 코드가 여러 범위를 가질 수 있음)
    range_map = {}

    for i, (start_idx, matched_items) in enumerate(entries):
        if i + 1 < len(entries):
            end_idx = entries[i + 1][0] - 1
        else:
            end_idx = common_boundary_idx - 1  # 공통 경계 직전까지

        for item in matched_items:
            for dambo_code in item['dambo'].split(','):
                dambo_code = dambo_code.strip()
                entry = {
                    'toc_name'  : item['toc_name'],
                    'dambo'     : item['dambo'],
                    'chapter'   : item['chapter'],
                    'start_idx' : start_idx,
                    'end_idx'   : end_idx,
                    'elem_count': end_idx - start_idx + 1,
                }
                # 동일 코드 다중 범위 허용 (리스트), 단 같은 범위 중복 제거
                if dambo_code not in range_map:
                    range_map[dambo_code] = []
                already = any(
                    e['start_idx'] == start_idx and e['end_idx'] == end_idx
                    for e in range_map[dambo_code]
                )
                if not already:
                    range_map[dambo_code].append(entry)

    return range_map, children, common_boundary_idx


# ── main ─────────────────────────────────────────────────────────
print("엑셀 조건표 로딩 중...")
toc_items = load_excel_toc(EXCEL_PATH)
print(f"  → 특약 항목: {len(toc_items)}개")

range_map, children, common_boundary_idx = build_range_map(XML_PATH, toc_items)

# JSON 저장
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(range_map, f, ensure_ascii=False, indent=2)

# 텍스트 결과 저장
lines = []
lines.append("=" * 72)
lines.append("특약별 XML 범위 탐색 결과")
lines.append("=" * 72)
lines.append(f"매핑된 담보코드 수: {len(range_map)}개")
lines.append(f"공통 경계 시작 idx: {common_boundary_idx} (이후는 항상 포함)\n")

# 출력용: 첫 번째 범위 기준 정렬
current_ch = ''
all_entries = []
for dambo, ranges in range_map.items():
    for r in ranges:
        all_entries.append((dambo, r))
all_entries.sort(key=lambda x: x[1]['start_idx'])

for dambo, info in all_entries:
    if info['chapter'] != current_ch:
        current_ch = info['chapter']
        lines.append(f"\n[ {current_ch} ]")
        lines.append("-" * 72)
    multi = len(range_map[dambo]) > 1
    lines.append(
        f"  담보={dambo:<12}  "
        f"idx={info['start_idx']:>5}~{info['end_idx']:>5}  "
        f"({info['elem_count']:>3}개)  "
        f"{'[다중범위] ' if multi else ''}"
        f"{info['toc_name']}"
    )

with open(OUT_TXT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

multi_codes = [d for d, r in range_map.items() if len(r) > 1]
print(f"매핑 완료: {len(range_map)}개 담보코드")
print(f"다중 범위 담보코드: {multi_codes}")
print(f"공통 경계 idx: {common_boundary_idx}")
print(f"JSON: {OUT_JSON}")
print(f"텍스트: {OUT_TXT}")
