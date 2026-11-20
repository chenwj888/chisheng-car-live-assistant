@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "PYTHONHOME="
set "PYTHONPATH="
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "PYW=%~dp0runtime\python314\pythonw.exe"

if not exist "%PYW%" (
  echo.
  echo Portable Python runtime is missing:
  echo   %PYW%
  echo Please copy the whole folder again.
  echo.
  pause
  exit /b 1
)

start "" "%PYW%" "%~dp0app.py"
ping -n 4 127.0.0.1 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\health.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Log: %~dp0logs\app.log
  echo Check: port 8765 is not occupied, Windows firewall allows local access.
  if exist "%~dp0logs\app.log" start "" notepad "%~dp0logs\app.log"
  pause
)
exit /b 0
