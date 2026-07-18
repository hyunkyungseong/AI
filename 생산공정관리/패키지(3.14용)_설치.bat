@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ====================================
echo  필요한 패키지 설치
echo ====================================
echo.
echo  설치 중... 1~3분 소요됩니다.
echo  (streamlit / pandas / plotly / openpyxl / num2words)
echo.

py -3.14 -m pip install streamlit==1.58.0 pandas==3.0.3 plotly==6.7.0 openpyxl==3.1.5 num2words==0.5.14 Pillow==11.2.1 >"%USERPROFILE%\Desktop\설치오류.log" 2>&1
if %errorlevel% neq 0 (
    echo  ================================
    echo   설치 실패.
    echo   오류 내용이 바탕화면의 "설치오류.log" 파일에 저장되었습니다.
    echo   파일을 담당자에게 전달해 주세요.
    echo  ================================
    echo.
    pause
    exit /b 1
)

del "%USERPROFILE%\Desktop\설치오류.log" >nul 2>&1
echo  설치 완료!
echo  이제 대시보드_실행_3.14.bat 을 더블클릭하면 대시보드가 시작됩니다.
echo.
pause
