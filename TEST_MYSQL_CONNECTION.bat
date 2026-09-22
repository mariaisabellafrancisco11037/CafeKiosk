@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo  CafeKiosk - Test MySQL Connection
echo ======================================================
echo.

cd /d "%~dp0CafeKiosk-Backend"
node test-mysql-connection.js

echo.
pause
