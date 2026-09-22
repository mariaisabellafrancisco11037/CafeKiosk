@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo  CafeKiosk - MySQL + LAN / Tablet Start
echo ===============================================
echo.
echo MySQL Server must be running first.
echo This project connects directly to MySQL Server; XAMPP is NOT required.
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
    echo Backend npm install failed.
    pause
    exit /b 1
  )
  cd /d "%~dp0"
)

if not exist "node_modules\socket.io" (
  echo Installing root dependencies required by the realtime server...
  call npm install
  if errorlevel 1 (
    echo Root npm install failed.
    pause
    exit /b 1
  )
)

echo TIP: For the first V18 run, use MIGRATE_SAMPLE_DATA_TO_MYSQL.bat once before starting.
echo.
echo Checking MySQL connection...
cd /d "%~dp0CafeKiosk-Backend"
node test-mysql-connection.js
if errorlevel 1 (
  echo.
  echo CafeKiosk was NOT started because MySQL is not connected.
  echo Run CONFIGURE_MYSQL_CONNECTION.bat first.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting CafeKiosk...
echo The server listens on 0.0.0.0:5000.
echo Use the LAN IP printed below for your tablet.
echo Do NOT use 127.0.0.1 or localhost on the tablet.
echo.
node server.js
pause
