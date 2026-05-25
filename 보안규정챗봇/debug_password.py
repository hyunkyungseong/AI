"""
PDF 내 암호 관련 내용 직접 확인
"""
import pdfplumber

PDF_PATH = "data/ISMS-01-18_개인정보보호 내부관리계획_v6.6.pdf"
KEYWORDS = ["암호", "비밀번호", "패스워드"]

with pdfplumber.open(PDF_PATH) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        for kw in KEYWORDS:
            if kw in text:
                # 키워드 앞뒤 150자 출력
                idx = 0
                while True:
                    idx = text.find(kw, idx)
                    if idx == -1:
                        break
                    start = max(0, idx - 100)
                    end = min(len(text), idx + 150)
                    print(f"\n[{i+1}페이지 / 키워드: '{kw}']")
                    print(text[start:end])
                    print("-" * 50)
                    idx += 1
