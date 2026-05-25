import xml.dom.minidom
import os

# ════════════════════════════════════════════════════════════════
#  ★ 실행 전 input_path 만 실제 원본 XML 경로로 수정하세요
# ════════════════════════════════════════════════════════════════
input_path  = r"C:\D드라이브\다운로드\무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관.xml"

_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
output_path = os.path.join(_BASE, "data", "무배당 흥Good 다이렉트 355 간편건강보험(26.04)_약관_formatted.xml")

print(f"읽는 중: {input_path}")

with open(input_path, "r", encoding="utf-8") as f:
    content = f.read()

print("XML 파싱 및 포맷 변환 중...")

dom = xml.dom.minidom.parseString(content.encode("utf-8"))
pretty_xml = dom.toprettyxml(indent="  ", encoding="utf-8").decode("utf-8")

# toprettyxml이 추가하는 중복 선언 제거
lines = pretty_xml.split("\n")
if lines[0].startswith("<?xml"):
    pretty_xml = "\n".join(lines[1:])

with open(output_path, "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n')
    f.write(pretty_xml)

size = os.path.getsize(output_path)
print(f"완료! 저장 위치: {output_path}")
print(f"파일 크기: {size:,} bytes")
