@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo Python was not found.
  echo Install Python 3.10 or newer and enable "Add Python to PATH".
  echo.
  pause
  exit /b 1
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "STAMP=%STAMP%-%RANDOM%"
set "STAGING=%~dp0staging-vendor-%STAMP%"
set "TARGET=%~dp0vendor-%STAMP%"

echo.
echo ============================================
echo   Optional: Edge natural voice component
echo ============================================
echo.
echo This enables the "Edge natural voice" engine.
echo The built-in local / browser voices work without it.
echo.
echo Installing into a new folder, so a running app is not touched...
echo.

python -m pip install --target "%STAGING%" edge-tts
if errorlevel 1 (
  echo.
  echo Installation failed. Common causes:
  echo   1. No access to PyPI;
  echo   2. Corporate network / security software blocking it;
  echo   3. Python version too old.
  echo.
  echo You can still use the built-in local voices.
  echo.
  pause
  exit /b 1
)

echo.
echo Verifying...
python -c "import sys; sys.path.insert(0, r'%STAGING%'); import edge_tts; print('edge-tts installed: ' + getattr(edge_tts, '__version__', 'unknown'))"
if errorlevel 1 (
  echo.
  echo Download completed but import failed. Check the log or use local voices.
  echo.
  pause
  exit /b 1
)

move "%STAGING%" "%TARGET%" >nul
if errorlevel 1 (
  echo.
  echo Could not finalize the install folder. Close the app and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo Done. Restart the app to use the Edge natural voice engine.
echo Installed to: %TARGET%
echo.
pause
exit /b 0
