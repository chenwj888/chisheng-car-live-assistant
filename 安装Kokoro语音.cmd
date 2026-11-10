@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0kokoro-setup.ps1"
pause
