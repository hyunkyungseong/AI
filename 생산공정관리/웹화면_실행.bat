@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

echo 웹 화면(Next.js)을 시작합니다...
echo 정상 여부 확인: 브라우저에서 http://localhost:3000 접속
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
npm run dev
pause
