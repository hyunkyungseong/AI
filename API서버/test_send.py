"""
공정관리시스템 → API서버 전송 테스트
실행: python test_send.py
"""
import urllib.request
import json

API_URL = "http://localhost:8000/process"
API_KEY = "JyEUA5iqJIt-fF7_EOZ9kBCbsvi_WnE7RsEp1HOFAcI"

# ── 전송할 테스트 데이터 5건 ──────────────────────────────────
테스트데이터 = [
    {"process_no": "P-2024-101", "worker": "홍길동", "product_code": "PROD-A", "quantity": 150, "status": "완료"},
    {"process_no": "P-2024-102", "worker": "김철수", "product_code": "PROD-B", "quantity":  80, "status": "불량"},
    {"process_no": "P-2024-103", "worker": "이영희", "product_code": "PROD-A", "quantity": 200, "status": "완료"},
    {"process_no": "P-2024-104", "worker": "박민준", "product_code": "PROD-C", "quantity":  60, "status": "보류"},
    {"process_no": "P-2024-105", "worker": "최수진", "product_code": "PROD-B", "quantity": 175, "status": "완료"},
]

print("=" * 55)
print("  공정관리 API 서버 전송 테스트 (5건)")
print("=" * 55)

for i, 데이터 in enumerate(테스트데이터, 1):

    # ── 실제 HTTP 전문 출력 ───────────────────────────────────
    body = json.dumps(데이터, ensure_ascii=False).encode("utf-8")
    print(f"\n[{i}번째 요청 전문]")
    print(f"POST /process HTTP/1.1")
    print(f"Host: localhost:8000")
    print(f"Content-Type: application/json")
    print(f"X-API-Key: {API_KEY}")
    print(f"")
    print(json.dumps(데이터, ensure_ascii=False, indent=2))

    # ── 실제 전송 ─────────────────────────────────────────────
    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
        },
        method="POST",
    )

    try:
        res = urllib.request.urlopen(req, timeout=5)
        응답 = json.loads(res.read().decode())
        print(f"\n[{i}번째 응답]")
        print(f"HTTP/1.1 200 OK")
        print(json.dumps(응답, ensure_ascii=False, indent=2))
    except urllib.error.HTTPError as e:
        print(f"\n[{i}번째 오류] HTTP {e.code}")
        print(e.read().decode())

    print("-" * 55)

print("\n✅ 전송 완료")
