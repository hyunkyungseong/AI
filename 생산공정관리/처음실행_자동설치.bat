@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ====================================
echo  생산공정관리 대시보드 시작
echo ====================================
echo.

echo [1단계] Python 3.12 확인 중...
py -3.12 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python 3.12가 없습니다. 자동 설치를 시작합니다.
    echo  인터넷 연결이 필요하며 3~5분 소요됩니다.
    echo.

    echo  설치 파일 다운로드 중...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe' -OutFile '%TEMP%\python-3.12.9-amd64.exe' -UseBasicParsing"
    if %errorlevel% neq 0 (
        echo.
        echo  다운로드 실패. 인터넷 연결을 확인하세요.
        pause
        exit /b 1
    )

    echo  Python 설치 중...
    "%TEMP%\python-3.12.9-amd64.exe" /passive InstallAllUsers=0 PrependPath=1 Include_launcher=1
    if %errorlevel% neq 0 (
        echo.
        echo  Python 설치 실패. 관리자에게 문의하세요.
        pause
        exit /b 1
    )

    del "%TEMP%\python-3.12.9-amd64.exe" >nul 2>&1

    :: 설치된 Python 경로를 현재 세션에 즉시 적용 (py -3.12 명령어 바로 사용 가능)
    set "PATH=%LOCALAPPDATA%\Programs\Python\Launcher\;%LOCALAPPDATA%\Programs\Python\Python312\;%LOCALAPPDATA%\Programs\Python\Python312\Scripts\;%PATH%"

    echo  Python 3.12 설치 완료
    echo.
)
echo  Python 3.12 확인 완료

echo.
echo [2단계] 필요한 패키지 확인 중...
py -3.12 -c "import streamlit, pandas, plotly, openpyxl" >nul 2>&1
if %errorlevel% neq 0 (
    echo  패키지를 설치합니다. 최초 1회만 진행되며 1~3분 소요됩니다...
    py -3.12 -m pip install streamlit==1.58.0 pandas plotly openpyxl
    if %errorlevel% neq 0 (
        echo.
        echo  패키지 설치 실패. 인터넷 연결을 확인 후 다시 실행하세요.
        pause
        exit /b 1
    )
    echo  패키지 설치 완료
) else (
    echo  패키지 확인 완료
)

echo.
echo [3단계] 8501 포트 사용 중인 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8501 "') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo  포트 정리 완료

echo.
echo [4단계] 대시보드를 시작합니다...
echo  브라우저에서 http://localhost:8501 로 접속하세요.
echo  종료하려면 이 창을 닫으세요.
echo.
py -3.12 -m streamlit run scripts/app.py
pause
