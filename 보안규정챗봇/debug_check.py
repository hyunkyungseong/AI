"""
PDF 텍스트 추출 진단 스크립트
문제 원인 파악용 — 확인 후 삭제해도 됩니다.
"""

import pdfplumber
import os

PDF_PATH = "data/ISMS-01-18_개인정보보호 내부관리계획_v6.6.pdf"

print("=" * 60)
print("PDF 텍스트 추출 진단")
print("=" * 60)

if not os.path.exists(PDF_PATH):
    print("❌ PDF 파일을 찾을 수 없습니다.")
else:
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"총 페이지 수: {len(pdf.pages)}\n")
        total_text = ""
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            total_text += text
            print(f"--- {i+1}페이지 (글자 수: {len(text)}) ---")
            print(text[:300] if text else "⚠️  텍스트 없음 (이미지 기반 페이지일 수 있음)")
            print()

        print("=" * 60)
        print(f"전체 추출 글자 수: {len(total_text)}")
        if len(total_text) < 100:
            print("❌ 텍스트가 거의 없습니다. PDF가 스캔 이미지일 가능성이 높습니다.")
        else:
            # 암호 관련 키워드 검색
            keywords = ["암호", "비밀번호", "패스워드", "password"]
            print("\n[암호 관련 키워드 검색 결과]")
            for kw in keywords:
                count = total_text.count(kw)
                print(f"  '{kw}' 발견 횟수: {count}")
