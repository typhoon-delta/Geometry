@echo off
rem Chay vong kham pha 7 tieng (tat giua chung thi bam lai tep nay de chay tiep). Bấm đúp tệp này.
chcp 65001 >nul
cd /d "%~dp0.."
".venv\Scripts\python.exe" -m lab chay --gio 7
pause
