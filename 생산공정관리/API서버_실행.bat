@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo API 서버(FastAPI)를 시작합니다...
echo 정상 여부 확인: 브라우저에서 http://localhost:8000/health 접속 (DB 연결까지 확인됨)
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
py -3.12 scripts/api.py
pause
