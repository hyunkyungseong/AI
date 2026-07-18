@echo off
cd /d "%~dp0"

echo 실행 중인 Streamlit 종료 중...
taskkill /f /im streamlit.exe >nul 2>&1

echo 대시보드를 시작합니다...
echo 브라우저에서 http://localhost:8501 로 접속하세요.
echo 종료하려면 이 창을 닫으세요.
py -3.14 -m streamlit run scripts/app.py
pause
