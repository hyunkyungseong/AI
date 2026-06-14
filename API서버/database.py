import os
import stat
from pathlib import Path
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, text

KEY_FILE = Path(__file__).parent / "secret.key"
ENV_FILE = Path(__file__).parent / ".env"

load_dotenv(ENV_FILE)


def _복호화(값: str) -> str:
    """ENC: 접두사가 있으면 복호화, 없으면 그대로 반환"""
    if 값.startswith("ENC:"):
        key = KEY_FILE.read_bytes()
        return Fernet(key).decrypt(값[4:].encode()).decode()
    return 값


def env잠금():
    """서버 시작 시 .env 파일을 읽기전용으로 잠금"""
    ENV_FILE.chmod(stat.S_IREAD | stat.S_IRGRP | stat.S_IROTH)
    print("🔒 .env 파일이 잠금되었습니다 (읽기전용)")


def env잠금해제():
    """서버 종료 시 .env 파일 잠금 해제"""
    ENV_FILE.chmod(stat.S_IREAD | stat.S_IWRITE)
    print("🔓 .env 파일 잠금이 해제되었습니다")


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")
DB_USER = _복호화(os.getenv("DB_USER", ""))
DB_PASSWORD = _복호화(os.getenv("DB_PASSWORD", ""))

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)


def db_연결_테스트():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
