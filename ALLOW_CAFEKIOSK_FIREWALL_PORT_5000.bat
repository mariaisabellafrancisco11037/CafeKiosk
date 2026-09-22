@echo off
:: Opens TCP port 5000 in Windows Defender Firewall. Requires Administrator.
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo Removing any old CafeKiosk rule...
netsh advfirewall firewall delete rule name="CafeKiosk Port 5000" >nul 2>&1

echo Adding CafeKiosk TCP 5000 rule for Private networks...
netsh advfirewall firewall add rule name="CafeKiosk Port 5000" dir=in action=allow protocol=TCP localport=5000 profile=private

echo.
echo Done. If your current Wi-Fi/hotspot is marked Public in Windows,
echo switch it to Private or create an equivalent Public-profile rule.
echo.
pause
