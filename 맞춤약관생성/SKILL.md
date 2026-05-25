# 맞춤약관 생성 — 검증된 스킬 목록 (SKILL)

> 자동화 구현 시 이 파일의 스킬을 재사용하세요.
> 각 스킬은 실제 실행·검증이 완료된 절차입니다.

---

## 📋 스킬 인덱스

| 스킬 | 목적 | 사용 스크립트 |
|---|---|---|
| SKILL-01 | 엑셀 조건표 파싱 | `03_validate_toc.py`, `04_build_range_map.py` |
| SKILL-02 | XML 텍스트 추출 (P 단락 단위) | `03_validate_toc.py`, `04_build_range_map.py` |
| SKILL-03 | 엑셀 목차명 ↔ XML 텍스트 일치 검증 | `03_validate_toc.py` |
| SKILL-04 | 공백 정규화 비교 | `03_validate_toc.py`, `05_generate_맞춤약관.py` |
| SKILL-05 | XML 특약별 범위 탐색 | `04_build_range_map.py` |
| SKILL-06 | 맞춤약관 XML 삭제 로직 | `05_generate_맞춤약관.py` |
| SKILL-07 | 한컴오피스 COM PDF 생성 | `06_generate_pdf_com.py` |

---

## SKILL-01. 엑셀 조건표 파싱

**목적:** 엑셀 조건표에서 특약 목차명 ↔ 담보코드 매핑 딕셔너리 생성

**검증 상태:** ✅ 완료 (2026-05-23)

**핵심 로직:**
```python
import zipfile, xml.etree.ElementTree as ET

NS = {'ss': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

with zipfile.ZipFile(excel_path) as z:
    # 공유 문자열 로드
    shared = []
    with z.open('xl/sharedStrings.xml') as f:
        for si in ET.parse(f).findall('.//ss:si', NS):
            shared.append(''.join(t.text or '' for t in si.findall('.//ss:t', NS)))

    # sheet2 파싱
    with z.open('xl/worksheets/sheet2.xml') as f:
        rows = ET.parse(f).findall('.//ss:row', NS)
```

**주의사항:**
- openpyxl은 이 파일의 스타일 포맷 오류로 사용 불가 → `zipfile + xml` 직접 파싱
- sheet2 이름: `다렉3.5.5간편종합_2종`
- 헤더 행: `seq`로 시작하는 행
- 컬럼 순서: seq(0), 목차명(1), 담보코드(2), 대표코드(3), 시작일자(4), 페이지(5), 분류기준(6), 색인(7), 상품코드(8)

**담보코드 규칙:**
- `L00000` → 공통 항목 (보통약관·가이드북·제도성 특약), 항상 포함
- 그 외 코드 → 개별 특약, 가입 여부로 포함/삭제 결정

---

## SKILL-02. XML 텍스트 추출 (P 단락 단위)

**목적:** XML에서 `<P>` 단락 단위로 CHAR를 이어붙인 텍스트 집합 생성

**검증 상태:** ✅ 완료 (2026-05-23)

**핵심 로직:**
```python
def load_xml_texts(xml_path):
    texts = set()
    current_p_chars = []
    in_p = False

    for event, elem in ET.iterparse(xml_path, events=['start', 'end']):
        if event == 'start':
            if elem.tag == 'P':
                in_p = True
                current_p_chars = []
        elif event == 'end':
            if elem.tag == 'CHAR' and elem.text and in_p:
                current_p_chars.append(elem.text)
                norm = ' '.join(elem.text.split())
                if norm:
                    texts.add(norm)          # 개별 CHAR도 수집
            elif elem.tag == 'P':
                joined = ''.join(current_p_chars)
                norm = ' '.join(joined.split())
                if norm:
                    texts.add(norm)          # 단락 전체 이어붙인 텍스트 수집
                in_p = False
                current_p_chars = []
            elem.clear()
    return texts
```

**왜 개별 CHAR가 아닌 P 단락 단위인가:**
- `경증간편가입Ⅲ` 등 일부 글자에 다른 CharShape(서식)가 적용되면 CHAR 태그가 분할됨
- 개별 CHAR 비교 시 부분 일치 발생 → P 단락 이어붙이면 완전 일치

---

## SKILL-03. 엑셀 목차명 ↔ XML 텍스트 일치 검증

**목적:** 엑셀 조건표 목차명이 XML에 모두 존재하는지 검증 (누락·불일치 탐지)

**검증 상태:** ✅ 완료 (2026-05-23)

**검증 결과 (L3912 기준):**
- 전체 특약 항목: 76개
- 완전 일치: 76개 (100%)
- 누락: 0개

**스크립트:** `validate_toc.py`
**결과 파일:** `validate_result.txt`

**검증 절차:**
1. 엑셀 조건표에서 특약 목차명 추출 (담보코드 != L00000)
2. XML에서 P 단락 단위 텍스트 집합 생성 (SKILL-02 사용)
3. 목차명별 공백 정규화 후 텍스트 집합과 비교
4. 완전 일치 / 부분 일치 / 누락 분류 후 결과 파일 저장

**새 약관 파일 적용 시 반드시 이 검증을 먼저 수행할 것**

---

## SKILL-04. 공백 정규화 비교

**목적:** XML과 엑셀 텍스트의 앞뒤 공백·연속 공백 차이를 무시하고 비교

**검증 상태:** ✅ 완료 (2026-05-23)

```python
def normalize(text):
    return ' '.join(text.split())
```

**적용 이유:**
- XML CHAR 텍스트에 선행 공백(들여쓰기용) 포함 경우 있음
- 엑셀 목차명에 후행 공백 포함 경우 있음

---

## SKILL-05. XML 특약별 범위 탐색

**목적:** SECTION 직접 자식 P 인덱스를 기준으로 각 특약 그룹의 시작~끝 범위를 탐색하여 JSON으로 저장

**검증 상태:** ✅ 완료 (2026-05-23)

**스크립트:** `build_range_map.py`  
**결과 파일:** `range_map.json`, `range_map_result.txt`

**핵심 원칙:**
- 특약 그룹 시작 = `<TABLE>` 을 포함하는 `<P>` 중 PARALIST 내부 텍스트가 엑셀 목차명과 일치하는 것
- 특약 그룹 끝 = 다음 특약 TABLE P 직전 인덱스 (`entries[i+1][0] - 1`)
- 마지막 특약 끝 = 공통 경계(제4장) 직전 인덱스
- 동일 담보코드가 여러 범위를 가질 수 있음 (예: `LN531G` — 2개 범위)

**공통 경계 탐지:**
```python
COMMON_BOUNDARY_TEXT    = '제4장'
COMMON_BOUNDARY_MIN_IDX = 600   # TOC 영역(앞부분) 제외용

for idx, child in enumerate(children):
    if idx < COMMON_BOUNDARY_MIN_IDX: continue
    if not child.findall('.//TABLE'): continue
    t = get_elem_text(child)
    if COMMON_BOUNDARY_TEXT in t and '특별약관' in t:
        common_boundary_idx = idx
        break
```

**범위 할당 핵심 로직:**
```python
for i, (start_idx, matched_items) in enumerate(entries):
    end_idx = entries[i+1][0] - 1 if i+1 < len(entries) else common_boundary_idx - 1
    for item in matched_items:
        for code in item['dambo'].split(','):
            code = code.strip()
            entry = {'start_idx': start_idx, 'end_idx': end_idx, ...}
            if code not in range_map:
                range_map[code] = []
            # 동일 범위 중복 제거
            already = any(e['start_idx']==start_idx and e['end_idx']==end_idx
                          for e in range_map[code])
            if not already:
                range_map[code].append(entry)
```

**주의사항:**
- 공통 경계(`COMMON_BOUNDARY_MIN_IDX=600`) 미설정 시 TOC 앞부분의 '장.' 텍스트에 오탐 발생
- 담보코드가 쉼표로 구분된 복수 코드(`LK501G,LA916G`)일 경우 각각 분리하여 저장
- 대특약·소특약이 같은 TABLE P에 함께 있어 같은 범위로 등록될 수 있음 → 중복 제거 필수

---

## SKILL-06. 맞춤약관 XML 삭제 로직

**목적:** 가입자 담보코드 목록을 받아 미가입 특약 구간을 XML에서 삭제하고 출력 파일 저장

**검증 상태:** ✅ 완료 (2026-05-23)

**스크립트:** `generate_맞춤약관.py`

**핵심 알고리즘:**

```python
# 1. (start_idx, end_idx) → 담보코드 집합 역매핑
range_to_codes = {}
for code, ranges in range_map.items():
    for r in ranges:
        key = (r['start_idx'], r['end_idx'])
        range_to_codes.setdefault(key, set()).add(code)

# 2. 범위별 삭제/유지 결정
ranges_to_delete = set()
for (start, end), codes in range_to_codes.items():
    if not codes.intersection(subscriber_set):
        ranges_to_delete.add((start, end))

# 3. 삭제 인덱스 집합 구성
indices_to_delete = set()
for start, end in ranges_to_delete:
    for i in range(start, end + 1):
        indices_to_delete.add(i)

# 4. 삭제 실행 (역순으로 remove — element 참조 방식이므로 순서 무관하나 관례상 역순)
children = list(section)   # 스냅샷
for idx in sorted(indices_to_delete, reverse=True):
    section.remove(children[idx])
```

**장(章) 헤더 처리 — 핵심 주의사항:**

장 헤더 P는 직전 특약 범위의 끝 인덱스 안에 위치할 수 있음  
(예: 제2장 헤더 idx=922 → 제1장 마지막 특약 범위 878~923 안에 포함)

```python
# 장 헤더 탐지: TABLE P이며 TOC 매칭 시작점이 아닌 것
matched_start_indices = {r['start_idx'] for ranges in range_map.values() for r in ranges}

for idx, child in enumerate(children):
    t = get_elem_text(child)
    if '장.' in t and '특별약관' in t and idx not in matched_start_indices:
        chapter_header_info.append((idx, t))

# 장 헤더 보호/삭제 분기
for header_idx, header_text in chapter_header_info:
    ch_ranges = chapter_to_ranges[matched_ch]
    if ch_ranges.issubset(ranges_to_delete):
        # 해당 장의 특약 전부 삭제 → 헤더 + 빈 줄도 삭제
        first_start = min(r[0] for r in ch_ranges)
        for i in range(header_idx, first_start):
            indices_to_delete.add(i)
    else:
        # 일부 특약 유지 → 헤더가 삭제 범위 안에 있어도 명시적 보호
        indices_to_delete.discard(header_idx)
```

**XSL 참조(PI) 보존:**
```python
# 원본 파일 헤더 줄(<?xml...?>, <?xml-stylesheet...?>) 읽기
xml_header_lines = []
with open(XML_PATH, encoding='utf-8-sig') as f:
    for line in f:
        if line.strip().startswith('<?'):
            xml_header_lines.append(line.rstrip())
        else:
            break

# 수정된 XML 직렬화 후 헤더와 합쳐서 저장
sio = io.StringIO()
tree.write(sio, encoding='unicode', xml_declaration=False)
with open(OUT_XML, 'w', encoding='utf-8') as f:
    for pi in xml_header_lines:
        f.write(pi + '\n')
    f.write(sio.getvalue())
```

**주의사항:**
- `section.remove(element)` 는 element 객체 참조로 동작 → `children = list(section)` 스냅샷 필수
- 공통 경계(제4장) 이후는 항상 포함 → 삭제 범위 계산에서 제외됨
- 같은 범위를 공유하는 담보코드가 있을 경우(예: LK501G + LA916G), 하나라도 가입자 목록에 있으면 해당 범위를 유지
- ET.write() 는 XML 내 Processing Instruction을 유지하지 않음 → 헤더 별도 처리 필요

---

## SKILL-07. 한컴오피스 COM PDF 생성

**목적:** 맞춤약관 XML을 한컴오피스 COM 자동화로 열어 PDF로 저장

**검증 상태:** ✅ 완료 (2026-05-23)

**스크립트:** `generate_pdf_com.py`

**핵심 로직:**
```python
import win32com.client

# COM ProgID 버전별 자동 감지
COM_IDS = [
    "HWPFrame.HwpObject",   # 한컴오피스 2014 이상
    "Hwp.Application",      # 한컴오피스 2010
]
for prog_id in COM_IDS:
    try:
        hwp = win32com.client.Dispatch(prog_id)
        break
    except Exception:
        continue

# 보안 모듈 등록 — 파일 열기 팝업 방지
hwp.RegisterModule("FilePathCheckDLL", "SecurityModule")

# 백그라운드 실행
hwp.XHwpWindows.Item(0).Visible = False

# XML 파일 열기 (HWPML2X: 한글 XML 필터)
hwp.Open(xml_path, "HWPML2X", "forceopen:true")

# PDF 저장 (폰트 서브셋 임베딩, 편집 금지, 300dpi)
pdf_option = "Embedding:1;Security:1;Resolution:300;"
result = hwp.SaveAs(pdf_path, "PDF", pdf_option)
if not result:
    hwp.SaveAs(pdf_path, "PDF", "")   # 옵션 미지원 버전 재시도

hwp.Quit()
```

**PDF 저장 옵션 설명:**

| 옵션 | 값 | 의미 |
|---|---|---|
| Embedding | 1 | 폰트 서브셋 임베딩 (텍스트 검색 가능) |
| Security | 1 | 편집·수정 금지 (법적 문서 보호) |
| Resolution | 300 | 이미지 해상도 300dpi |

**주의사항:**
- `RegisterModule` 은 버전에 따라 없을 수 있음 → try/except 로 무시
- `Visible = False` 설정 전 `XHwpWindows.Item(0)` 이 없으면 오류 → 실행 환경에 따라 생략 가능
- PDF 옵션 문자열은 버전마다 지원 범위가 다름 → 실패 시 빈 문자열(`""`)로 재시도
- 한컴오피스가 미설치 상태이면 COM Dispatch 자체가 실패 → 설치 여부 사전 확인 필요

---

*생성일: 2026-05-23 | 새 스킬 확립 시 이 파일에 추가*
