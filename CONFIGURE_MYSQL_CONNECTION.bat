@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo  CafeKiosk - Configure MySQL Connection
echo ======================================================
echo.
echo This will ask for the SAME MySQL credentials used by Workbench.
echo Your password will be saved only in this project's .env file.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  pause
  exit /b 1
)

if not exist "CafeKiosk-Backend\node_modules\mysql2" (
  echo Installing backend dependencies...
  cd /d "%~dp0CafeKiosk-Backend"
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
  cd /d "%~dp0"
)

node CafeKiosk-Backend\configure-mysql.js
if errorlevel 1 (
  echo.
  echo MySQL setup failed. Nothing was changed.
  pause
  exit /b 1
)

echo.
echo MySQL connection is ready.
pause
