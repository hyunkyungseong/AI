"""
문서 처리 스크립트 — 장(章) / 조(條) 구조 파싱
data/ 폴더의 PDF, Word 파일을 읽어 벡터 저장소를 만듭니다.
새 문서를 추가하거나 문서가 변경될 때 이 파일을 실행하세요.
"""

import os
import re
import json
import pdfplumber
from docx import Document
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

DATA_DIR = "data"
VECTORSTORE_DIR = "vectorstore"
EMBED_MODEL = "jhgan/ko-sroberta-multitask"

# 장 패턴: 제1장 총칙 / 제 2 장 개인정보 보호조직 등
CHAPTER_RE = re.compile(r'제\s*\d+\s*장\s+[^\n]{2,40}')
# 조 패턴: 제13조 (제목) / 제 1 조 (제목) 등
ARTICLE_RE = re.compile(r'제\s*\d+\s*조\s*[\(（][^\n\)）]{1,40}[\)）]')
# 장/조 통합 분리 패턴
SPLIT_RE   = re.compile(
    r'(제\s*\d+\s*장\s+[^\n]{2,40}|제\s*\d+\s*조\s*[\(（][^\n\)）]{1,40}[\)）])'
)
# 행정/절차 조항 제외 패턴 — 제목 어디서든 키워드가 포함되면 제외
# (목적, 용어정의, 수립/승인, 공표, 시행, 경과조치, 예외적용)
ADMIN_ARTICLE_RE = re.compile(
    r'목적|적용\s*범위|용어\s*정의|수립\s*및\s*승인|내부관리계획.*공표|경과\s*조치|예외\s*적용'
)


def _remove_headers_footers(pages_text: list) -> str:
    """반복 등장하는 머리글·꼬리글·페이지 번호 제거"""
    from collections import Counter

    # 짧은 줄(60자 미만) 중 전체 페이지의 30% 이상에서 반복되는 줄 = 머리글/꼬리글
    all_lines = []
    for page in pages_text:
        all_lines.extend(l.strip() for l in page.split('\n') if l.strip())

    threshold = max(2, len(pages_text) * 0.3)
    repeating = {
        line for line, cnt in Counter(all_lines).items()
        if cnt >= threshold and len(line) < 60
    }

    # 페이지 번호 패턴: "13 / 16", "13/16"
    page_num_re = re.compile(r'^\d+\s*/\s*\d+$')

    cleaned = []
    for page in pages_text:
        for line in page.split('\n'):
            stripped = line.strip()
            if stripped in repeating:
                continue
            if page_num_re.match(stripped):
                continue
            cleaned.append(line)

    return '\n'.join(cleaned)


def load_pdf(path):
    pages_text = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                pages_text.append(extracted)
    return _remove_headers_footers(pages_text)


def load_docx(path):
    doc = Document(path)
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])


def find_content_start(text: str) -> int:
    """
    목차·개정이력을 건너뛰고 실제 본문 시작 위치를 반환.
    제1장이 두 번 이상 나오면 마지막 제1장이 본문 시작.
    한 번만 나오면 그 위치가 본문 시작.
    """
    positions = [m.start() for m in re.finditer(r'제\s*1\s*장\s+[^\n]{2,40}', text)]
    if not positions:
        return 0
    return positions[-1]  # 마지막 제1장 = 실제 본문 시작


def parse_structure(text: str, source: str) -> list:
    """텍스트를 장/조 단위로 파싱 (목차·개정이력 자동 제외)"""

    # 실제 본문 시작 위치부터만 처리
    start = find_content_start(text)
    text  = text[start:]

    parts = SPLIT_RE.split(text)
    articles = []
    current_chapter = ""

    for i in range(1, len(parts), 2):
        header = parts[i].strip()
        body   = parts[i + 1].strip() if i + 1 < len(parts) else ""

        # 장(章) 발견 → 현재 장 업데이트
        if CHAPTER_RE.match(header):
            current_chapter = re.sub(r'\s+', ' ', header)
            continue

        # 조(條) 발견 — 본문 한글 50자 미만 제외
        if len(re.findall(r'[가-힣]', body)) < 50:
            continue

        article_title = re.sub(r'\s+', ' ', header)

        # 행정/절차 조항 제외 (목적, 적용범위, 용어정의, 수립, 공표 등)
        if ADMIN_ARTICLE_RE.search(article_title):
            continue
        articles.append({
            "title":   article_title,
            "chapter": current_chapter,
            "text":    article_title + "\n" + body,
            "source":  source
        })

    return articles


def load_documents():
    all_articles = []
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".pdf") or f.endswith(".docx")]

    if not files:
        print("⚠️  data/ 폴더에 PDF 또는 Word 파일이 없습니다.")
        return all_articles

    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        print(f"  읽는 중: {filename}")
        try:
            text     = load_pdf(filepath) if filename.endswith(".pdf") else load_docx(filepath)
            articles = parse_structure(text, filename)
            print(f"    → {len(articles)}개 조항 파싱 완료")
            all_articles.extend(articles)
        except Exception as e:
            print(f"  ❌ 오류 ({filename}): {e}")

    return all_articles


def create_vectorstore():
    print("=" * 50)
    print("보안규정 문서 처리를 시작합니다...")
    print("=" * 50)

    articles = load_documents()
    if not articles:
        print("처리할 문서가 없습니다.")
        return

    print(f"\n총 {len(articles)}개 조항 로드 완료")
    print("한국어 임베딩 모델 로딩 중...")

    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

    texts     = [a["text"] for a in articles]
    metadatas = [
        {"source": a["source"], "title": a["title"], "chapter": a["chapter"]}
        for a in articles
    ]

    print("벡터 저장소 생성 중...")
    os.makedirs(VECTORSTORE_DIR, exist_ok=True)
    vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadatas)
    vectorstore.save_local(VECTORSTORE_DIR)

    chunks_path = os.path.join(VECTORSTORE_DIR, "chunks.json")
    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print("✅ 완료!")
    print(f"   처리 조항 수: {len(articles)}개")
    print(f"   저장 위치: {VECTORSTORE_DIR}/")
    print("=" * 50)
    print("\n[파싱된 구조]")
    current_ch = ""
    for a in articles:
        if a["chapter"] != current_ch:
            current_ch = a["chapter"]
            print(f"\n  📂 {current_ch}")
        print(f"      └ {a['title']}")


if __name__ == "__main__":
    create_vectorstore()
