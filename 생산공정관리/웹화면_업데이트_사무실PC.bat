@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

REM 사무실 PC 전용 — 수정본(frontend 폴더)을 복사한 뒤 이 파일을 더블클릭하면
REM 기존 화면 종료 → 패키지 설치 → 조립(build) → 운영 모드 재실행까지 한 번에 진행합니다.

if not exist ".env.local" (
  echo [경고] frontend\.env.local 파일이 없습니다. API 서버 주소를 못 찾아 데이터가 안 나올 수 있습니다.
  echo        내용 예시: FASTAPI_URL=http://127.0.0.1:8001
  echo.
)

echo [1단계] 실행 중인 웹 화면(포트 3000) 종료 중...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } ; Write-Host '종료 완료' } else { Write-Host '실행 중인 화면이 없습니다 (건너뜀)' }"
timeout /t 1 /nobreak >nul

echo.
echo [2단계] 패키지 설치 중... (처음에는 수 분 걸릴 수 있습니다)
call npm install
if errorlevel 1 (
  echo [오류] 패키지 설치에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)

echo.
echo [3단계] 화면 조립(build) 중... (1~3분 정도 걸립니다)
call npm run build
if errorlevel 1 (
  echo [오류] 조립에 실패했습니다. 이 창의 빨간 오류 내용을 캡처해서 전달해 주세요.
  pause
  exit /b 1
)

echo.
echo [4단계] 웹 화면(운영 모드)을 포트 3000으로 시작합니다.
echo 이 PC에서 확인  : http://localhost:3000
echo 직원 PC에서 접속: http://192.168.30.201:3000
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요. (창을 닫으면 직원들도 접속 불가)
call npm run start -- -H 0.0.0.0 -p 3000
pause
