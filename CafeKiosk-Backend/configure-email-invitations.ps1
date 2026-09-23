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
    if (-not $found) { $updated += "$Key=$Value" }
    Set-Content -Path $envFile -Value $updated -Encoding UTF8
}

Write-Host ''
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ' CafeKiosk - Configure Resend Invitations' -ForegroundColor Cyan
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'This helper is for LOCAL testing only.' -ForegroundColor Yellow
Write-Host 'For Railway, put the same values in CafeKiosk > Variables instead.' -ForegroundColor Yellow
Write-Host ''

$publicUrl = (Read-Host 'Public CafeKiosk URL (optional for local testing)').Trim()
$fromEmail = (Read-Host 'Verified Resend sender email, e.g. invites@yourdomain.com').Trim()
if (-not $fromEmail) { throw 'RESEND_FROM_EMAIL is required.' }
$fromName = (Read-Host 'Default sender name [CafeKiosk]').Trim()
if (-not $fromName) { $fromName = 'CafeKiosk' }

$secureApiKey = Read-Host 'Resend API key (input hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if (-not $apiKey) { throw 'RESEND_API_KEY is required.' }

Set-EnvValue 'PUBLIC_APP_URL' $publicUrl
Set-EnvValue 'RESEND_API_KEY' $apiKey
Set-EnvValue 'RESEND_FROM_EMAIL' $fromEmail
Set-EnvValue 'RESEND_FROM_NAME' $fromName

Write-Host ''
Write-Host 'Resend invitation settings saved to .env.' -ForegroundColor Green
Write-Host 'Restart CafeKiosk before sending an invitation.' -ForegroundColor Green
Write-Host '.env is ignored by Git. Never commit the Resend API key.' -ForegroundColor DarkGray
Write-Host ''
