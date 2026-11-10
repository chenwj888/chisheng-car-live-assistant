@echo off
chcp 936 >nul
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
ping -n 3 127.0.0.1 >nul
exit /b 0
