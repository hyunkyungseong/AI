"""
맞춤약관 생성 스크립트
- 가입자 담보코드 목록을 입력하면 해당 특약만 남기고 나머지를 삭제한 XML을 생성합니다.
- range_map.json 을 기준으로 삭제할 XML 요소 범위를 결정합니다.
- 장(章) 헤더는 해당 장의 특약이 모두 삭제될 때 함께 제거됩니다.
- 문서 앞쪽 목차(TOC)에서도 삭제된 특약 항목을 제거합니다.
"""

import os
import xml.etree.ElementTree as ET
import json
import io
import re

# ════════════════════════════════════════════════════════════════
#  ★ 실행 전 담보코드 목록(SUBSCRIBER_CODES)만 수정하세요
# ════════════════════════════════════════════════════════════════

BASE_DIR       = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RANGE_MAP_JSON = BASE_DIR + r"\work\range_map.json"
XML_PATH       = BASE_DIR + r"\data\무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관_formatted.xml"
OUT_XML        = BASE_DIR + r"\output\맞춤약관_출력.xml"

# 가입자 담보코드 목록 (실제 사용 시 이 목록을 교체하세요)
SUBSCRIBER_CODES = [
    'LK501G',   # 1. 일반상해입원비(1일-180일)
    'LA916G',   # 1. 일반상해입원비(1일-180일) (동반코드)
    'LM501G',   # 1-1. 질병입원비(경증간편가입Ⅲ)
    'LM503G',   # 2. 암진단비(유사암제외)
    'LB706G',   # 2. 암진단비(유사암제외) (동반코드)
    'LK507G',   # 1. 보험료납입면제대상보장(3대질병진단 및 상해질병후유장해80%이상)
]

# ════════════════════════════════════════════════════════════════

COMMON_BOUNDARY_TEXT    = '제4장'
COMMON_BOUNDARY_MIN_IDX = 600


def get_elem_text(elem):
    """XML 요소 안의 모든 CHAR 텍스트를 하나의 문자열로 합칩니다."""
    chars = [c.text for c in elem.iter('CHAR') if c.text]
    return ' '.join(''.join(chars).split())


# ── 1. range_map 로드 ─────────────────────────────────────────
print("=" * 60)
print("맞춤약관 생성 시작")
print("=" * 60)
print("\n[1단계] range_map.json 로딩 중...")
with open(RANGE_MAP_JSON, encoding='utf-8') as f:
    range_map = json.load(f)
print(f"  ->담보코드 수: {len(range_map)}개")

# (start_idx, end_idx) → 담보코드 집합
range_to_codes = {}
for code, ranges in range_map.items():
    for r in ranges:
        key = (r['start_idx'], r['end_idx'])
        range_to_codes.setdefault(key, set()).add(code)

# chapter 텍스트 → 해당 장에 속한 범위 집합
chapter_to_ranges = {}
for code, ranges in range_map.items():
    for r in ranges:
        ch = r['chapter']
        key = (r['start_idx'], r['end_idx'])
        chapter_to_ranges.setdefault(ch, set()).add(key)


# ── 2. 삭제 / 유지 범위 결정 ──────────────────────────────────
print("\n[2단계] 삭제 대상 결정 중...")
subscriber_set = set(SUBSCRIBER_CODES)

# range_map에 없는 코드 경고
unknown = subscriber_set - set(range_map.keys())
if unknown:
    print(f"  [!] 경고: range_map에 없는 담보코드가 있습니다 -> {unknown}")

ranges_to_delete = set()
ranges_to_keep   = set()
for (start, end), codes in range_to_codes.items():
    if codes.intersection(subscriber_set):
        ranges_to_keep.add((start, end))
    else:
        ranges_to_delete.add((start, end))


# ── 3. 결과 요약 출력 ─────────────────────────────────────────
print("\n[유지할 특약 목록]")
kept_entries = []
for (start, end) in ranges_to_keep:
    for code, ranges in range_map.items():
        for r in ranges:
            if r['start_idx'] == start and r['end_idx'] == end:
                kept_entries.append(r)
                break
        else:
            continue
        break
kept_entries.sort(key=lambda x: x['start_idx'])
for r in kept_entries:
    print(f"  [OK] [{r['chapter']}]  {r['toc_name']}")

print("\n[삭제할 특약 목록]")
del_entries = []
for (start, end) in ranges_to_delete:
    for code, ranges in range_map.items():
        for r in ranges:
            if r['start_idx'] == start and r['end_idx'] == end:
                del_entries.append(r)
                break
        else:
            continue
        break
del_entries.sort(key=lambda x: x['start_idx'])
for r in del_entries:
    print(f"  [DEL] [{r['chapter']}]  {r['toc_name']}")

print(f"\n  ->유지: {len(ranges_to_keep)}개 범위 / 삭제: {len(ranges_to_delete)}개 범위")


# ── 4. 삭제 인덱스 집합 구성 ──────────────────────────────────
indices_to_delete = set()
for start, end in ranges_to_delete:
    for i in range(start, end + 1):
        indices_to_delete.add(i)


# ── 5. XML 파싱 + 구조 탐색 ──────────────────────────────────
print("\n[3단계] XML 파싱 중...")

# 원본 파일의 헤더 줄(XML 선언, XSL 참조 PI) 보존
# XSL href를 output/ 기준 상대 경로로 교체 (원본은 data/ 기준이므로 조정 필요)
import re as _re
_xsl_src_dir  = os.path.dirname(XML_PATH)        # data/
_xsl_out_dir  = os.path.dirname(OUT_XML)          # output/
xml_header_lines = []
with open(XML_PATH, encoding='utf-8-sig') as f:
    for line in f:
        stripped = line.rstrip()
        if stripped.lstrip().startswith('<?'):
            # XSL PI의 href 경로를 output/ 기준 상대 경로로 변환
            def _fix_href(m):
                xsl_filename = m.group(1)
                xsl_abs = os.path.join(_xsl_src_dir, xsl_filename)
                rel = os.path.relpath(xsl_abs, _xsl_out_dir).replace('\\', '/')
                return f'href="{rel}"'
            stripped = _re.sub(r'href="([^"]+\.xsl)"', _fix_href, stripped)
            xml_header_lines.append(stripped)
        else:
            break

tree = ET.parse(XML_PATH)
root = tree.getroot()
section = root.find('.//SECTION')
children = list(section)
print(f"  ->SECTION 직접 자식: {len(children)}개")

# 공통 경계(제4장) 위치 탐지
common_boundary_idx = len(children)
for idx, child in enumerate(children):
    if idx < COMMON_BOUNDARY_MIN_IDX:
        continue
    if not child.findall('.//TABLE'):
        continue
    t = get_elem_text(child)
    if COMMON_BOUNDARY_TEXT in t and '특별약관' in t:
        common_boundary_idx = idx
        print(f"  ->공통 경계(제4장): idx={idx}")
        break


# ── 6. 장(章) 헤더 처리 ───────────────────────────────────────
# 특약 범위 시작 인덱스 집합 (TABLE P 중 TOC와 매칭된 것)
matched_start_indices = {
    r['start_idx']
    for ranges in range_map.values()
    for r in ranges
}

print("\n[4단계] 장(章) 헤더 탐지...")
chapter_header_info = []  # [(header_idx, full_text)]
for idx, child in enumerate(children):
    if idx >= common_boundary_idx:
        break
    if child.tag != 'P':
        continue
    if not child.findall('.//TABLE'):
        continue
    t = get_elem_text(child)
    # 장 헤더: '제N장.' + '특별약관' 포함, TOC 매칭 시작점이 아닌 것
    if '장.' in t and '특별약관' in t and idx not in matched_start_indices:
        chapter_header_info.append((idx, t))
        print(f"  ->장 헤더 발견: idx={idx}  [{t[:50]}]")

# 장의 모든 특약이 삭제 대상이면 → 장 헤더 + 헤더~첫특약 사이 빈 줄도 삭제
for header_idx, header_text in chapter_header_info:
    matched_ch = None
    for ch in chapter_to_ranges:
        if ch in header_text:
            matched_ch = ch
            break
    if matched_ch is None:
        print(f"  [!]매칭 실패: idx={header_idx}")
        continue

    ch_ranges = chapter_to_ranges[matched_ch]
    if ch_ranges and ch_ranges.issubset(ranges_to_delete):
        first_start = min(r[0] for r in ch_ranges)
        # 장 헤더 ~ 첫 특약 직전(빈 줄 포함)까지 삭제
        for i in range(header_idx, first_start):
            indices_to_delete.add(i)
        print(f"  ->장 헤더 + 공백 삭제: idx={header_idx}~{first_start - 1}  [{matched_ch}]")
    else:
        # 유지 대상 장 헤더 — 삭제 범위 안에 포함됐더라도 명시적으로 보호
        indices_to_delete.discard(header_idx)
        print(f"  ->장 헤더 유지(보호): idx={header_idx}  [{matched_ch}]")


# ── 7. TOC(목차) 정리 ────────────────────────────────────────
# TOC 구조 (원본 idx 기준):
#   idx ~83 : "특 별 약 관" 헤더
#   idx 85~ : 장 헤더 + 특약명 항목 (1., 1-1., 1-1-1. 패턴)
#   idx ~168: 제4장 목록 끝
#   idx 170+: 별 표, 색인 (항상 포함)
# 1-1-1. 처럼 번호가 깊은 항목도 같은 특약의 변형이므로 함께 삭제

print("\n[5단계] TOC(목차) 정리 중...")

def strip_num_prefix(text):
    """'1.', '1-1.', '1-1-1.' 등 앞의 번호+점을 제거하고 핵심 텍스트 반환"""
    return re.sub(r'^\d+(-\d+)*\.\s*', '', text).strip()

# 유지/삭제 범위별 핵심 이름(number prefix 제거) 집합
kept_core_names    = set()
deleted_core_names = set()
for code, ranges in range_map.items():
    for r in ranges:
        core = strip_num_prefix(r['toc_name'])
        key  = (r['start_idx'], r['end_idx'])
        if key in ranges_to_keep:
            kept_core_names.add(core)
        else:
            deleted_core_names.add(core)

# 장별 전체 삭제 여부 (TOC 장 헤더 삭제 판단용)
chapter_all_deleted = {
    ch: ch_ranges.issubset(ranges_to_delete)
    for ch, ch_ranges in chapter_to_ranges.items()
}

# TOC 스캔: 원본 idx 70~210 범위, TABLE 없는 P만 처리
# 알고리즘: 그룹 상태 추적(current_group_deleted)
#   - 알려진 toc_name(range_map에 있는 것)과 정확히 일치 → kept/deleted 판정 후 그룹 상태 갱신
#   - 알려지지 않은 항목(서브 항목, 예: "2-1. 상해수술비(경증간편가입Ⅲ)") → 현재 그룹 상태 상속
#   - 장 헤더 만날 때 그룹 상태 초기화
all_known_core_names = kept_core_names | deleted_core_names
current_group_deleted = False   # 현재 탐색 중인 특약 그룹의 삭제 여부
toc_deleted_count = 0

for idx in range(70, min(210, len(children))):
    child = children[idx]
    if child.findall('.//TABLE'):
        continue
    t = get_elem_text(child)
    if not t:
        continue

    # 장 헤더 항목 (제N장. ... 특별약관) — 해당 장 전체 삭제 시 제거 + 그룹 상태 초기화
    if '장.' in t and '특별약관' in t and idx not in matched_start_indices:
        current_group_deleted = False   # 새 장 진입 시 그룹 상태 초기화
        matched_ch = next((ch for ch in chapter_to_ranges if ch in t), None)
        if matched_ch and chapter_all_deleted.get(matched_ch, False):
            indices_to_delete.add(idx)
            toc_deleted_count += 1
            print("  ->TOC 장 헤더 삭제: [%s]" % t[:50])
        continue

    if '특별약관' not in t:
        continue

    # 특약명 항목
    core = strip_num_prefix(t)

    if core in deleted_core_names and core not in kept_core_names:
        # range_map에서 삭제 대상으로 확인된 항목
        current_group_deleted = True
        indices_to_delete.add(idx)
        toc_deleted_count += 1
    elif core in kept_core_names:
        # range_map에서 유지 대상으로 확인된 항목
        current_group_deleted = False
    else:
        # range_map에 없는 서브 항목(예: "2-1. 상해수술비(경증간편가입Ⅲ)")
        # — 현재 그룹 상태(부모 항목의 삭제 여부) 상속
        if current_group_deleted:
            indices_to_delete.add(idx)
            toc_deleted_count += 1

print("  ->TOC 삭제 항목 수: %d개" % toc_deleted_count)
print("  ->전체 삭제 대상: %d개" % len(indices_to_delete))


# ── 8. 삭제 실행 ─────────────────────────────────────────────
print(f"\n[6단계] 삭제 실행 중...")
print(f"  ->삭제할 요소 수: {len(indices_to_delete)}개")

delete_count = 0
for idx in sorted(indices_to_delete, reverse=True):
    if idx < len(children):
        section.remove(children[idx])
        delete_count += 1

remaining = len(list(section))
print(f"  ->실제 삭제: {delete_count}개")
print(f"  ->남은 요소: {remaining}개")


# ── 8. XML 저장 ───────────────────────────────────────────────
print(f"\n[7단계] XML 저장 중...")

# XML 트리를 문자열로 직렬화
sio = io.StringIO()
tree.write(sio, encoding='unicode', xml_declaration=False)
xml_body = sio.getvalue()

# 원본 헤더(XML 선언, XSL PI) + 수정된 본문을 합쳐서 저장
with open(OUT_XML, 'w', encoding='utf-8') as f:
    for pi_line in xml_header_lines:
        f.write(pi_line + '\n')
    f.write(xml_body)

print(f"  ->저장 완료: {OUT_XML}")
print("\n" + "=" * 60)
print("완료!")
print("=" * 60)
