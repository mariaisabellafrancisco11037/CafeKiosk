$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
$exampleFile = Join-Path $projectRoot '.env.example'

if (-not (Test-Path $envFile)) {
    if (Test-Path $exampleFile) {
        Copy-Item $exampleFile $envFile
    } else {
        New-Item -ItemType File -Path $envFile | Out-Null
    }
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $lines = @(Get-Content $envFile -ErrorAction SilentlyContinue)
    $escapedKey = [regex]::Escape($Key)
    $found = $false
    $updated = foreach ($line in $lines) {
        if ($line -match "^$escapedKey=") {
            $found = $true
            "$Key=$Value"
        } else {
            $line
        }
    }
    if (-not $found) {
        $updated += "$Key=$Value"
    }
    Set-Content -Path $envFile -Value $updated -Encoding UTF8
}

Write-Host ''
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ' CafeKiosk - Configure Staff Invitation Email' -ForegroundColor Cyan
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'The invitation link must NOT use localhost.' -ForegroundColor Yellow
Write-Host 'For same Wi-Fi/hotspot, use your laptop IPv4, e.g. http://192.168.137.1:5000'
Write-Host 'For invitations usable from anywhere, enter your HTTPS deployed/tunnel URL.'
Write-Host 'Leave Public URL blank only if you want CafeKiosk to auto-detect your LAN IPv4.'
Write-Host ''

$publicUrl = (Read-Host 'Public CafeKiosk URL').Trim()
$smtpHost = (Read-Host 'SMTP Host [smtp.gmail.com]').Trim()
if (-not $smtpHost) { $smtpHost = 'smtp.gmail.com' }
$smtpPort = (Read-Host 'SMTP Port [465]').Trim()
if (-not $smtpPort) { $smtpPort = '465' }
$smtpSecure = (Read-Host 'Use secure TLS? [true]').Trim()
if (-not $smtpSecure) { $smtpSecure = 'true' }
$smtpUser = (Read-Host 'Sender email address').Trim()
if (-not $smtpUser) { throw 'Sender email is required.' }

$securePassword = Read-Host 'SMTP/App Password (input hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $smtpPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if (-not $smtpPass) { throw 'SMTP/App Password is required.' }

$fromEmail = (Read-Host "From email [$smtpUser]").Trim()
if (-not $fromEmail) { $fromEmail = $smtpUser }
$fromName = (Read-Host 'From name [CafeKiosk]').Trim()
if (-not $fromName) { $fromName = 'CafeKiosk' }

Set-EnvValue 'PUBLIC_APP_URL' $publicUrl
Set-EnvValue 'SMTP_HOST' $smtpHost
Set-EnvValue 'SMTP_PORT' $smtpPort
Set-EnvValue 'SMTP_SECURE' $smtpSecure
Set-EnvValue 'SMTP_USER' $smtpUser
Set-EnvValue 'SMTP_PASS' $smtpPass
Set-EnvValue 'SMTP_FROM_EMAIL' $fromEmail
Set-EnvValue 'SMTP_FROM_NAME' $fromName

Write-Host ''
Write-Host 'Email invitation settings saved to .env.' -ForegroundColor Green
Write-Host 'Restart CafeKiosk before sending an invitation.' -ForegroundColor Green
Write-Host '.env is ignored by Git, so these credentials should not be pushed to GitHub.' -ForegroundColor DarkGray
Write-Host ''
