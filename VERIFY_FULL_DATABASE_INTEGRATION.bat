@echo off
setlocal
cd /d "%~dp0CafeKiosk-Backend"
echo ======================================================
echo  CafeKiosk V18 - Verify Full MySQL Integration
echo ======================================================
echo.
node verify-full-mysql-integration.js
if errorlevel 1 (
 echo.
 echo Verification failed. Run CONFIGURE_MYSQL_CONNECTION.bat and then MIGRATE_SAMPLE_DATA_TO_MYSQL.bat.
)
echo.
pause
