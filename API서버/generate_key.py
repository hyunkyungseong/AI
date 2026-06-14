"""
마스터 키 생성 도구 — 최초 1회만 실행하세요.
생성된 secret.key 파일은 안전한 곳에 따로 보관하세요 (USB 등).
"""
from cryptography.fernet import Fernet
from pathlib import Path

KEY_FILE = Path(__file__).parent / "secret.key"

if KEY_FILE.exists():
    print("⚠️  secret.key 가 이미 존재합니다. 덮어쓰면 기존 암호화된 값을 복호화할 수 없게 됩니다.")
    answer = input("새로 생성하시겠습니까? (yes 입력 시 생성): ")
    if answer.strip().lower() != "yes":
        print("취소되었습니다.")
        exit()

key = Fernet.generate_key()
KEY_FILE.write_bytes(key)
print(f"✅ 마스터 키가 생성되었습니다: {KEY_FILE}")
print("⚠️  이 파일을 USB 등 별도 장소에 백업해 두세요!")
