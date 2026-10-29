@echo off
rem Mo bao cao lan chay gan nhat trong trinh duyet (de cua so nay mo trong khi xem). Bấm đúp tệp này.
chcp 65001 >nul
cd /d "%~dp0.."
".venv\Scripts\python.exe" -m lab bao-cao
pause
