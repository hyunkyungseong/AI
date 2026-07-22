@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1단계] 실행 중인 API 서버(포트 8000) 종료 중...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } ; Write-Host '종료 완료' } else { Write-Host '실행 중인 서버가 없습니다 (건너뜀)' }"

timeout /t 1 /nobreak >nul

echo [2단계] API 서버(FastAPI)를 새로 시작합니다...
echo 정상 여부 확인: 브라우저에서 http://localhost:8000/health 접속 (DB 연결까지 확인됨)
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
py -3.12 scripts/api.py
pause
