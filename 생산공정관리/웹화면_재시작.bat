@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

echo [1단계] 실행 중인 웹 화면(포트 3000) 종료 중...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } ; Write-Host '종료 완료' } else { Write-Host '실행 중인 화면이 없습니다 (건너뜀)' }"

timeout /t 1 /nobreak >nul

echo [2단계] 웹 화면(Next.js)을 새로 시작합니다...
echo 정상 여부 확인: 브라우저에서 http://localhost:3000 접속
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
npm run dev
pause
