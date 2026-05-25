"""
검색 결과 진단 스크립트
"""

from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
VECTORSTORE_DIR = "vectorstore"

print("모델 로딩 중...")
embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
vectorstore = FAISS.load_local(VECTORSTORE_DIR, embeddings, allow_dangerous_deserialization=True)

question = "암호정책이 어떻게 되지"
print(f"\n질문: {question}")
print("=" * 60)

docs = vectorstore.similarity_search(question, k=4)
for i, doc in enumerate(docs):
    print(f"\n[검색 결과 {i+1}]")
    print(doc.page_content)
    print("-" * 40)
