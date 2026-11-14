@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM 사무실 PC 전용 API 서버 재시작 - 포트 8001만 종료 후 다시 시작합니다.
REM 포트 8000은 다른 프로그램 ibx dashboard가 쓰므로 절대 건드리지 않습니다.

echo [1단계] 실행 중인 API 서버(포트 8001) 종료 중...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } ; Write-Host '종료 완료' } else { Write-Host '실행 중인 서버가 없습니다 (건너뜀)' }"

timeout /t 2 /nobreak >nul

echo [2단계] API 서버(FastAPI)를 포트 8001로 새로 시작합니다...
echo 정상 여부 확인: 브라우저에서 http://localhost:8001/health 접속 (DB 연결까지 확인됨)
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요. (창을 닫으면 직원들도 데이터를 못 불러옴)
py -3.12 -m uvicorn scripts.api:app --host 0.0.0.0 --port 8001
pause
