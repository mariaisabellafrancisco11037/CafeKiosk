@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo  CafeKiosk V18 FIXED - Move Sample Runtime Data to MySQL
echo ======================================================
echo.
echo This is NON-DESTRUCTIVE: it does not DROP your cafekiosk database.
echo Existing matching records are preserved or updated safely.
echo.
echo Fix included:
echo - No more foreign-key failure when cafe-1 is missing.
echo - Uses cafe-1 if it already exists.
echo - Uses the only existing cafe when there is exactly one.
echo - If the database has no cafe at all, restores the original demo parent cafe safely.
echo - If multiple cafes exist, you can choose the target cafe below.
echo.
set /p MIGRATION_CAFE_ID=Target Cafe ID (optional - press Enter for automatic): 
echo.
cd /d "%~dp0CafeKiosk-Backend"
node migrate-sample-data-to-mysql.js
if errorlevel 1 (
  echo.
  echo Migration FAILED. Read the exact reason above.
  echo.
  echo If multiple cafes were listed, run this file again and type the desired cafe_id.
  echo Make sure MySQL is running and CONFIGURE_MYSQL_CONNECTION.bat succeeded.
  pause
  exit /b 1
)
echo.
echo Migration finished successfully.
echo You can now run START_CAFEKIOSK_LAN.bat
pause
