"""
[임시용] 맞춤약관 내용 확인용 HTML 생성 + 브라우저 자동 오픈
- 최종 PDF 생성은 한컴오피스 COM 자동화(win32com)로 대체 예정
- 목적: 삭제 후 내용이 어떻게 보이는지 확인용
- 방법: XML → XSLT 변환 → HTML 저장 → 브라우저에서 Ctrl+P 로 PDF 저장
- 추가 설치 불필요 (lxml만 사용)
"""

import os
import re
import webbrowser
from lxml import etree

# ════════════════════════════════════════════════════════════════
#  ★ 경로 설정
# ════════════════════════════════════════════════════════════════
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
XML_PATH = os.path.join(BASE_DIR, "output", "맞춤약관_출력.xml")
XSL_PATH = os.path.join(BASE_DIR, "data",   "무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관.xsl")
OUT_HTML = os.path.join(BASE_DIR, "output", "임시_맞춤약관_출력.html")
# ════════════════════════════════════════════════════════════════


def patch_css(html_str: str) -> str:
    """한컴 전용 CSS 값을 브라우저가 이해하는 표준 값으로 교체"""
    # STYLE 태그 안의 <!-- --> 주석 제거
    # (XML 모드 파싱 시 CSS가 주석으로 처리되어 서식이 적용 안 됨)
    html_str = re.sub(r'(<STYLE[^>]*>)\s*<!--', r'\1', html_str)
    html_str = re.sub(r'-->\s*(</STYLE>)', r'\1', html_str)

    replacements = {
        "SlimThick":   "solid",
        "ThickSlim":   "solid",
        "Thick":       "solid",
        "Slim":        "solid",
        "Dotted":      "dotted",
        "Dashed":      "dashed",
        "None":        "none",
        "Justify":     "justify",
        "Center":      "center",
        "Left":        "left",
        "Right":       "right",
        "Distributed": "justify",
        "letter-spacing: -10%;": "letter-spacing: -0.05em;",
        "letter-spacing: 0%;":   "letter-spacing: 0em;",
    }
    for old, new in replacements.items():
        html_str = html_str.replace(old, new)

    # A4 인쇄 설정 + 한글 폰트 fallback 추가
    extra_css = """
<style>
@media print {
  @page { size: A4; margin: 15mm 12mm; }
  body  { margin: 0; }
}
body  { font-family: '맑은 고딕', 'Malgun Gothic', '굴림', sans-serif;
        max-width: 210mm; margin: auto; padding: 10mm; }
table { border-collapse: collapse; width: 100%; }
td, th { padding: 2px 4px; }
</style>
"""
    html_str = html_str.replace("</HEAD>", extra_css + "</HEAD>", 1)
    return html_str


print("=" * 60)
print("[임시] 맞춤약관 HTML 변환 시작")
print("=" * 60)

# ── 1. XSLT 변환 (XML → HTML) ────────────────────────────────
print("\n[1단계] XSLT 변환 중...")
xml_doc   = etree.parse(XML_PATH)
xsl_doc   = etree.parse(XSL_PATH)
transform = etree.XSLT(xsl_doc)
html_tree = transform(xml_doc)

html_str = str(html_tree)
print(f"  ->변환된 HTML 크기: {len(html_str):,} 바이트")

# ── 2. CSS 호환성 패치 ────────────────────────────────────────
print("\n[2단계] CSS 호환성 패치 중...")
html_str = patch_css(html_str)

# ── 3. HTML 저장 ──────────────────────────────────────────────
print("\n[3단계] HTML 저장 중...")
with open(OUT_HTML, "w", encoding="utf-8") as f:
    f.write(html_str)
file_size_kb = os.path.getsize(OUT_HTML) / 1024
print(f"  ->저장 완료: {OUT_HTML}")
print(f"  ->파일 크기: {file_size_kb:.1f} KB")

# ── 4. 브라우저 자동 오픈 ─────────────────────────────────────
print("\n[4단계] 브라우저에서 열기...")
webbrowser.open("file:///" + OUT_HTML.replace("\\", "/"))

print("\n" + "=" * 60)
print("완료!")
print()
print("[PDF로 저장하려면]")
print("  브라우저에서 Ctrl+P -> '대상: PDF로 저장' 선택")
print()
print("[주의] 이 HTML/PDF는 임시 확인용입니다.")
print("  서식이 원본 한글 문서와 다를 수 있습니다.")
print("  최종본은 한컴오피스 COM(win32com)으로 생성하세요.")
print("=" * 60)
