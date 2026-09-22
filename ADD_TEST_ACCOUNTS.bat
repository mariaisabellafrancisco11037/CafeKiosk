@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo  CafeKiosk - Add / Reset Sample Login Accounts
echo ======================================================
echo.
echo This DOES NOT delete the cafekiosk database.
echo It only creates or resets these sample accounts:
echo.
echo   Admin: admin / admin123
echo   Staff: staff / staff123
echo.
echo Existing sample admin/staff rows will be reactivated.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  echo Install Node.js or run the project using the same Node.js setup used for CafeKiosk.
  pause
  exit /b 1
)

cd /d "%~dp0CafeKiosk-Backend"
node add-test-accounts.js
if errorlevel 1 (
  echo.
  echo Sample account setup failed.
  pause
  exit /b 1
)

echo.
echo You can now start CafeKiosk and test both accounts.
pause
