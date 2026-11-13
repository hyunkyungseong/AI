@echo off
chcp 65001 >nul
cd /d "%~dp0frontend"

REM 사무실 PC 전용 — 운영 모드(next start)로 웹 화면 실행
REM 먼저 "웹화면_업데이트_사무실PC.bat"로 조립(build)이 한 번 끝나 있어야 합니다.

if not exist ".next\BUILD_ID" (
  echo [오류] 아직 조립된 화면이 없습니다.
  echo "웹화면_업데이트_사무실PC.bat"을 먼저 더블클릭해 주세요.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo [경고] frontend\.env.local 파일이 없습니다. API 서버 주소를 못 찾아 데이터가 안 나올 수 있습니다.
  echo        내용 예시: FASTAPI_URL=http://127.0.0.1:8001
)

echo 웹 화면(운영 모드)을 포트 3000으로 시작합니다.
echo 이 PC에서 확인  : http://localhost:3000
echo 직원 PC에서 접속: http://192.168.30.201:3000
echo 종료하려면 이 창을 닫거나 Ctrl+C를 누르세요. (창을 닫으면 직원들도 접속 불가)
call npm run start -- -H 0.0.0.0 -p 3000
pause
