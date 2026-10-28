@echo off
rem Cài đặt phòng thí nghiệm (chạy MỘT lần). Bấm đúp tệp này.
chcp 65001 >nul
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (set PY=py -3) else (set PY=python)
if not exist ".venv\Scripts\python.exe" (
  echo Tao moi truong ao .venv ...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo Khong tao duoc moi truong ao. Hay cai Python 3.12 tu python.org ^(tick "Add python.exe to PATH"^).
    pause
    exit /b 1
  )
)
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r lab\requirements.txt
".venv\Scripts\python.exe" -m lab kiem-tra --thu
pause
