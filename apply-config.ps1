# =========================================================================
# SCRIPT DONG BO TOAN BO CAU HINH TU MASTER_CONFIG.json VAO DU AN
# Cach dung: Chuot phai chon "Run with PowerShell" hoac go .\apply-config.ps1
# =========================================================================

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = Get-Location }
$configPath = Join-Path $scriptDir "MASTER_CONFIG.json"

if (-not (Test-Path $configPath)) {
    Write-Host "[ERROR] Khong tim thay file: $configPath" -ForegroundColor Red
    exit 1
}

Write-Host ">>> Dang doc cau hinh tu MASTER_CONFIG.json..." -ForegroundColor Cyan
$jsonContent = Get-Content -Raw -Path $configPath -Encoding UTF8
$config = $jsonContent | ConvertFrom-Json

# 1. CAP NHAT FILE .env
$envLines = @(
    "# Tu dong tao tu MASTER_CONFIG.json luc $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "VITE_FIREBASE_API_KEY=$($config.firebase.apiKey)",
    "VITE_FIREBASE_AUTH_DOMAIN=$($config.firebase.authDomain)",
    "VITE_FIREBASE_PROJECT_ID=$($config.firebase.projectId)",
    "VITE_FIREBASE_STORAGE_BUCKET=$($config.firebase.storageBucket)",
    "VITE_FIREBASE_MESSAGING_SENDER_ID=$($config.firebase.messagingSenderId)",
    "VITE_FIREBASE_APP_ID=$($config.firebase.appId)",
    "",
    "VITE_GAS_API_URL=$($config.googleAppsScript.webAppUrl)",
    "VITE_GAS_API_SECRET=$($config.googleAppsScript.apiSecret)"
)

$envPath = Join-Path $scriptDir ".env"
[System.IO.File]::WriteAllLines($envPath, $envLines, [System.Text.Encoding]::UTF8)
Write-Host "[OK] Da cap nhat: .env" -ForegroundColor Green

# 2. CAP NHAT FILE src/config/vietqr.js
$vietQrLines = @(
    "/**",
    " * Cau hinh VietQR tu dong sinh tu MASTER_CONFIG.json",
    " */",
    "export const VIETQR_CONFIG = {",
    "  bankId: `"$($config.bankingVietQR.bankId)`",",
    "  accountNo: `"$($config.bankingVietQR.accountNo)`",",
    "  accountName: `"$($config.bankingVietQR.accountName)`",",
    "  template: `"$($config.bankingVietQR.template)`",",
    "};",
    "",
    "export const buildVietQrUrl = ({ amount = 0, transferDescription = `"`" }) => {",
    "  const { bankId, accountNo, template, accountName } = VIETQR_CONFIG;",
    "  const encodedDesc = encodeURIComponent(transferDescription.trim().slice(0, 50));",
    "  const encodedName = encodeURIComponent(accountName);",
    "  return `"https://img.vietqr.io/image/`" + bankId + `"-`" + accountNo + `"-`" + template + `".png?amount=`" + amount + `"&addInfo=`" + encodedDesc + `"&accountName=`" + encodedName;",
    "};",
    "",
    "export default VIETQR_CONFIG;"
)

$vietQrPath = Join-Path $scriptDir "src\config\vietqr.js"
[System.IO.File]::WriteAllLines($vietQrPath, $vietQrLines, [System.Text.Encoding]::UTF8)
Write-Host "[OK] Da cap nhat: src/config/vietqr.js" -ForegroundColor Green

# 3. CAP NHAT FILE src/config/appConfig.js
$appConfigLines = @(
    "/**",
    " * Thong tin trung tam tu dong sinh tu MASTER_CONFIG.json",
    " */",
    "export const CENTER_CONFIG = {",
    "  centerName: `"$($config.centerInformation.centerName)`",",
    "  adminEmail: `"$($config.centerInformation.adminEmail)`",",
    "  managementReportEmail: `"$($config.centerInformation.managementReportEmail)`",",
    "};",
    "",
    "export default CENTER_CONFIG;"
)

$appConfigPath = Join-Path $scriptDir "src\config\appConfig.js"
[System.IO.File]::WriteAllLines($appConfigPath, $appConfigLines, [System.Text.Encoding]::UTF8)
Write-Host "[OK] Da cap nhat: src/config/appConfig.js" -ForegroundColor Green

Write-Host ""
Write-Host ">>> HOAN TAT DONG BO CAU HINH CHO TOAN BO DU AN!" -ForegroundColor Yellow
Write-Host "Tat ca file da san sang de deploy len Internet."
