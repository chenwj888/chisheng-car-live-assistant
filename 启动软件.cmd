@echo off
setlocal
cd /d "%~dp0"

set "PYW="
where pythonw >nul 2>nul && set "PYW=pythonw"
if not defined PYW (
  where pyw >nul 2>nul && set "PYW=pyw"
)
if not defined PYW (
  where python >nul 2>nul && set "PYW=python"
)

if not defined PYW (
  echo.
  echo Python was not found.
  echo Install Python 3.10 or newer and enable "Add Python to PATH".
  echo.
  pause
  exit /b 1
)

start "" "%PYW%" "%~dp0app.py"

rem Wait for the local server, then verify it is alive.
ping -n 4 127.0.0.1 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\health.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Log: %~dp0logs\app.log
  echo Common causes: Python too old, port 8765 in use, or security software blocked it.
  echo.
  if exist "%~dp0logs\app.log" start "" notepad "%~dp0logs\app.log"
  pause
)

exit /b 0
