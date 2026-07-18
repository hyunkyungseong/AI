"""
로그인 인증(JWT) + 당사 생산공정관리시스템 연동용 API 키 검증

- 화면(app.py)이 호출하는 API: 로그인 후 발급된 토큰(Authorization: Bearer <token>)으로 보호
- 당사 생산공정관리시스템이 호출하는 /운영통계자료수신: 사람이 로그인하는 게 아니라 시스템 간 연동이므로
  별도의 고정 API 키(X-API-Key 헤더)로 보호
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError
from fastapi import Header, HTTPException

sys.path.insert(0, str(Path(__file__).parent))
import db_config as cfg

ALGORITHM = "HS256"
TOKEN_유효시간_시간 = 12


def 비밀번호_해시(평문: str) -> str:
    return bcrypt.hashpw(평문.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def 비밀번호_확인(평문: str, 해시: str) -> bool:
    return bcrypt.checkpw(평문.encode("utf-8"), 해시.encode("utf-8"))


def 토큰_발급(사용자명: str) -> str:
    만료 = datetime.now(timezone.utc) + timedelta(hours=TOKEN_유효시간_시간)
    return jwt.encode({"sub": 사용자명, "exp": 만료}, cfg.JWT_SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(default=None)) -> str:
    """Authorization: Bearer <token> 헤더 검증. 화면(app.py)이 호출하는 API 보호용."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")
    token = authorization[len("Bearer "):].strip()
    try:
        payload = jwt.decode(token, cfg.JWT_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰이 유효하지 않거나 만료됐습니다. 다시 로그인해 주세요")
    return payload["sub"]


def verify_api_key(x_api_key: str = Header(default=None)) -> None:
    """X-API-Key 헤더 검증. 당사 생산공정관리시스템 연동(/운영통계자료수신) 보호용."""
    if not x_api_key or x_api_key != cfg.API_KEY:
        raise HTTPException(status_code=401, detail="API 키가 유효하지 않습니다")
