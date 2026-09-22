@echo off
setlocal
cd /d "%~dp0"
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CafeKiosk-Backend\configure-email-invitations.ps1"
if errorlevel 1 (
  echo.
  echo Configuration FAILED. Read the message above.
) else (
  echo.
  echo Configuration complete. Restart CafeKiosk before testing an invitation.
)
echo.
pause
endlocal
