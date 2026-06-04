@echo off
cd /d "d:\AI\생산공정관리"

echo [1단계] 데이터 전처리 중...
python scripts/preprocess.py
if %errorlevel% neq 0 (
    echo 전처리 오류 발생. 종료합니다.
    pause
    exit /b 1
)

echo.
echo [2단계] 실행 중인 Streamlit 종료 중...
taskkill /f /im streamlit.exe >nul 2>&1

echo [3단계] 대시보드를 시작합니다...
echo 브라우저에서 http://localhost:8501 로 접속하세요.
echo 종료하려면 이 창을 닫으세요.
streamlit run scripts/app.py
pause
