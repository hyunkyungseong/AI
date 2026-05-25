"""
보안규정 챗봇 웹 서버
실행: python app.py
접속: http://localhost:5000 또는 http://[PC의 IP주소]:5000
"""

import os
import re
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from kiwipiepy import Kiwi

app = Flask(__name__)

VECTORSTORE_DIR = "vectorstore"
LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "questions.jsonl")
EMBED_MODEL = "jhgan/ko-sroberta-multitask"

os.makedirs(LOG_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 모델 초기화
# ---------------------------------------------------------------------------

print("한국어 형태소 분석기 초기화 중...")
kiwi = Kiwi()

# 문서 색인용: 명사·동사·형용사 포함 (문서 내 의미 있는 형태소 전체)
_DOC_TAGS   = {'NNG', 'NNP', 'NNB', 'VV', 'VA', 'XR', 'SL'}
# 쿼리 검색용: 명사·외래어만 (동사 제외 → "알려줘" 같은 질문 동사가 오매칭 방지)
_QUERY_TAGS = {'NNG', 'NNP', 'NNB', 'SL'}

def korean_tokenize(text: str) -> list:
    """문서 색인용 — 명사·동사·형용사 추출"""
    return [t.form for t in kiwi.tokenize(text) if t.tag in _DOC_TAGS]

CORPUS_STOPWORDS: set = set()  # 문서 로딩 후 자동 계산됨

def korean_tokenize_query(text: str) -> list:
    """BM25 쿼리용 — 명사·외래어만 추출, 코퍼스 불용어 자동 제외"""
    tokens = [t.form for t in kiwi.tokenize(text) if t.tag in _QUERY_TAGS]
    return [t for t in tokens if t not in CORPUS_STOPWORDS]


# ---------------------------------------------------------------------------
# 보안 도메인 동의어 테이블
# 새 동의어 쌍 필요 시 이 테이블에 한 줄 추가
# 향후 사전 학습 FastText 도입 시 대체 예정
# ---------------------------------------------------------------------------
SECURITY_SYNONYMS = {
    "암호":     ["비밀번호", "패스워드"],
    "비밀번호": ["암호", "패스워드"],
    "패스워드": ["암호", "비밀번호"],
    "접근통제": ["접근제어", "권한관리", "접근권한"],
    "접근제어": ["접근통제", "권한관리", "접근권한"],
    "파기":     ["삭제", "폐기", "말소"],
    "삭제":     ["파기", "폐기"],
    "침해":     ["해킹", "유출", "사고"],
    "유출":     ["침해", "노출", "누출"],
    "관리자":   ["담당자", "책임자"],
    "책임자":   ["관리자", "담당자"],
    "계정":     ["사용자", "권한"],
    "접근권한": ["계정", "권한"],
}


def expand_query(question: str) -> str:
    """보안 동의어 테이블로 쿼리 확장 — 사용자 일상어를 문서 용어와 연결"""
    tokens = korean_tokenize(question)
    extra = []
    for token in tokens:
        if token in SECURITY_SYNONYMS:
            extra.extend(SECURITY_SYNONYMS[token])
    if extra:
        return question + " " + " ".join(set(extra))
    return question


print("임베딩 모델 로딩 중...")
embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

if not os.path.exists(VECTORSTORE_DIR):
    raise FileNotFoundError("벡터 저장소가 없습니다. 먼저 'python ingest.py'를 실행해 주세요.")

print("벡터 저장소 로딩 중...")
vectorstore = FAISS.load_local(
    VECTORSTORE_DIR, embeddings, allow_dangerous_deserialization=True
)

print("BM25 키워드 검색 로딩 중...")
with open(os.path.join(VECTORSTORE_DIR, "chunks.json"), "r", encoding="utf-8") as f:
    chunks_data = json.load(f)

docs_for_bm25 = [
    Document(
        page_content=c["text"],
        metadata={"source": c["source"], "title": c["title"], "chapter": c["chapter"]}
    )
    for c in chunks_data
]
bm25_retriever = BM25Retriever.from_documents(docs_for_bm25, preprocess_func=korean_tokenize)
bm25_retriever.k = 4

print("코퍼스 불용어 자동 계산 중...")
_n = len(docs_for_bm25)
_freq: dict = {}
for _d in docs_for_bm25:
    for _t in set(korean_tokenize(_d.page_content)):
        _freq[_t] = _freq.get(_t, 0) + 1
# 전체 조항의 70% 이상에 등장하는 단어 = 변별력 없는 불용어
CORPUS_STOPWORDS = {term for term, cnt in _freq.items() if cnt / _n >= 0.7}
del _n, _freq
print(f"  → 불용어 {len(CORPUS_STOPWORDS)}개 자동 설정 (전체 조항의 70%↑ 등장 단어)")

print("✅ 챗봇 준비 완료!")


# ---------------------------------------------------------------------------
# 유틸 함수
# ---------------------------------------------------------------------------

def clean_text(text: str) -> str:
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


# L2 거리 임계값 — 이 값 이하인 결과만 표시 (낮을수록 엄격)
# 0.8 이하: 매우 유사 / 1.2 이하: 관련 있음 / 그 이상: 관련 없음
SCORE_THRESHOLD = 1.2


RRF_K = 60  # RRF 상수 (일반적으로 60 사용)
STRICT_FAISS_THRESHOLD = 0.8  # BM25 미지원 시 FAISS 단독으로 포함되려면 이 값 이하여야 함


def hybrid_search(question: str):
    """RRF(Reciprocal Rank Fusion) 기반 하이브리드 검색
    - BM25 쿼리: 명사 전용 (동사 오매칭 방지)
    - FAISS 단독 결과는 매우 가까운 경우(≤0.8)만 포함 → 관련 없는 조항 차단
    """
    expanded = expand_query(question)

    # FAISS: 임계값 이하 결과, 점수도 함께 보관
    scored = vectorstore.similarity_search_with_score(expanded, k=8)
    scored.sort(key=lambda x: x[1])
    faiss_hits      = [(doc, rank) for rank, (doc, score) in enumerate(scored)
                       if score <= SCORE_THRESHOLD]
    faiss_score_map = {doc.page_content.strip(): score
                       for doc, score in scored if score <= SCORE_THRESHOLD}

    # BM25: 명사 전용 쿼리로 점수 계산
    tokenized_query = korean_tokenize_query(expanded)
    bm25_scores = bm25_retriever.vectorizer.get_scores(tokenized_query)
    bm25_ranked = sorted(
        enumerate(zip(bm25_retriever.docs, bm25_scores)),
        key=lambda x: x[1][1], reverse=True
    )
    bm25_hits = [(doc, rank) for rank, (doc, score) in bm25_ranked[:8] if score > 0]
    bm25_keys = {doc.page_content.strip() for doc, _ in bm25_hits}

    # RRF 점수 계산
    rrf_scores: dict[str, float] = {}
    doc_map:    dict[str, Document] = {}

    for doc, rank in faiss_hits:
        key = doc.page_content.strip()
        rrf_scores[key] = rrf_scores.get(key, 0) + 1 / (RRF_K + rank)
        doc_map[key] = doc

    for doc, rank in bm25_hits:
        key = doc.page_content.strip()
        rrf_scores[key] = rrf_scores.get(key, 0) + 1 / (RRF_K + rank)
        doc_map[key] = doc

    # FAISS 단독 결과 필터:
    # BM25 매칭이 없으면 FAISS 거리가 매우 가까운 경우(≤ STRICT_FAISS_THRESHOLD)만 허용
    def is_valid(key: str) -> bool:
        if key in bm25_keys:
            return True
        return faiss_score_map.get(key, 999) <= STRICT_FAISS_THRESHOLD

    sorted_keys = sorted(rrf_scores, key=lambda k: rrf_scores[k], reverse=True)
    return [doc_map[k] for k in sorted_keys if is_valid(k)][:5]


# ---------------------------------------------------------------------------
# 라우트
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "질문을 입력해 주세요."}), 400

    try:
        docs = hybrid_search(question)
        results = []
        for doc in docs:
            content = clean_text(doc.page_content)
            if not content:
                continue
            title   = doc.metadata.get("title")   or content.splitlines()[0][:50]
            chapter = doc.metadata.get("chapter") or ""
            results.append({
                "title":   title,
                "chapter": chapter,
                "content": content,
                "source":  doc.metadata.get("source", "")
            })

        _save_log(question, results)
        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": f"오류: {str(e)}"}), 500


def _save_log(question, results):
    log = {
        "timestamp": datetime.now().isoformat(),
        "question":  question,
        "count":     len(results),
        "sources":   list({r["source"] for r in results})
    }
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(log, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    from waitress import serve
    print("서버 시작: http://localhost:5000")
    serve(app, host="0.0.0.0", port=5000)
