"""
.env 파일의 DB_USER, DB_PASSWORD를 암호화하는 도구.
서버 실행 전에 한 번 실행하세요.
이미 암호화된 값(ENC: 로 시작)은 건너뜁니다.
"""
from cryptography.fernet import Fernet
from pathlib import Path

KEY_FILE = Path(__file__).parent / "secret.key"
ENV_FILE = Path(__file__).parent / ".env"

if not KEY_FILE.exists():
    print("❌ secret.key 파일이 없습니다. generate_key.py 를 먼저 실행하세요.")
    exit()

key = KEY_FILE.read_bytes()
fernet = Fernet(key)

lines = ENV_FILE.read_text(encoding="utf-8").splitlines()
새_lines = []
암호화_항목 = {"DB_USER", "DB_PASSWORD"}
변경_수 = 0

for line in lines:
    if "=" in line and not line.startswith("#"):
        항목, 값 = line.split("=", 1)
        if 항목.strip() in 암호화_항목:
            if 값.strip().startswith("ENC:"):
                print(f"  ⏭  {항목} — 이미 암호화됨, 건너뜀")
                새_lines.append(line)
            else:
                암호화값 = fernet.encrypt(값.strip().encode()).decode()
                새_lines.append(f"{항목.strip()}=ENC:{암호화값}")
                print(f"  ✅ {항목} — 암호화 완료")
                변경_수 += 1
        else:
            새_lines.append(line)
    else:
        새_lines.append(line)

ENV_FILE.write_text("\n".join(새_lines), encoding="utf-8")

if 변경_수 > 0:
    print(f"\n✅ {변경_수}개 항목이 암호화되었습니다.")
else:
    print("\n변경된 항목이 없습니다.")
