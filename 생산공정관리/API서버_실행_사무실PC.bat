@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo API 서버(FastAPI)를 포트 8001로 시작합니다.
echo (이 사무실 PC는 포트 8000번을 다른 프로그램(ibx dashboard)이 이미 쓰고 있어 8001번을 대신 사용합니다)
echo 정상 여부 확인: 브라우저에서 http://localhost:8001/health 접속 (DB 연결까지 확인됨)
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
py -3.12 -m uvicorn scripts.api:app --host 0.0.0.0 --port 8001
pause
