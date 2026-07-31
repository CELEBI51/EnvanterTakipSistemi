#Requires -Version 5.1
<#
.SYNOPSIS
  API icin .env dosyasini uretir ve JWT gizli anahtarlarini RASTGELE olusturur.

.DESCRIPTION
  Repoda sabit bir gizli anahtar BULUNMAZ; her kurulumda burada uretilir.
  Var olan bir .env dosyasinin uzerine yazmadan once yedegini alir.
#>
param(
  [string]$DbName   = 'entanter_takip',
  [string]$DbUser   = 'entanter',
  [string]$PgHost   = 'localhost',
  [int]   $PgPort   = 5432,
  [int]   $ApiPort  = 3001,
  [int]   $WebPort  = 3000
)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== 2/5  Yapilandirma ===' -ForegroundColor Cyan
Write-Host ''

$deployRoot = Split-Path -Parent $PSScriptRoot
$apiRoot    = Join-Path $deployRoot 'app\api'
$envPath    = Join-Path $apiRoot '.env'

if (-not (Test-Path $apiRoot)) {
    Write-Host "Uygulama klasoru bulunamadi: $apiRoot" -ForegroundColor Red
    Write-Host 'Deploy paketi eksik gorunuyor.'
    exit 1
}

# --- Sunucunun yerel ag adresi -----------------------------------------
$detected = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
             Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
             Select-Object -First 1).IPAddress

Write-Host "Bu sunucunun tespit edilen yerel IP adresi: $detected"
$serverAddress = Read-Host "Kullanicilarin tarayiciya yazacagi adres [$detected]"
if ([string]::IsNullOrWhiteSpace($serverAddress)) { $serverAddress = $detected }

# --- Veritabani parolasi ------------------------------------------------
$dbSecure = Read-Host "'$DbUser' veritabani kullanicisinin parolasi" -AsSecureString
$dbPlain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
              [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbSecure))

# URL icinde ozel karakterler bozulmasin.
$dbEncoded = [System.Uri]::EscapeDataString($dbPlain)

# --- Rastgele gizli anahtarlar -----------------------------------------
function New-Secret {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$accessSecret  = New-Secret
$refreshSecret = New-Secret

# --- Ilk yonetici parolasi ---------------------------------------------
Write-Host ''
Write-Host 'Ilk yonetici hesabinin parolasi bos birakilirsa sistem rastgele uretip ekrana yazar.'
$adminSecure = Read-Host 'Ilk yonetici parolasi (bos = otomatik uret)' -AsSecureString
$adminPlain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                 [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecure))

# --- .env yaz -----------------------------------------------------------
if (Test-Path $envPath) {
    $backup = "$envPath.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
    Copy-Item $envPath $backup
    Write-Host "[=] Mevcut .env yedeklendi: $backup" -ForegroundColor Yellow
}

$content = @"
# Bu dosya 02-configure.ps1 tarafindan uretildi.
# $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ICINDE GIZLI ANAHTARLAR VAR - kopyalamayin, paylasmayin.

NODE_ENV=production
HOST=0.0.0.0
PORT=$ApiPort

DATABASE_URL=postgresql://$DbUser`:$dbEncoded@$PgHost`:$PgPort/$DbName
DB_POOL_MAX=10

JWT_ACCESS_SECRET=$accessSecret
JWT_REFRESH_SECRET=$refreshSecret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7

# Frontend ayri portta calistigi icin TAM ESLESMELI origin listesi zorunlu.
CORS_ORIGINS=http://$serverAddress`:$WebPort

# Intranet HTTP; TLS yok. Cookie'nin Secure bayragini kontrol eder.
USE_HTTPS=false

LOG_LEVEL=info

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=$adminPlain
SEED_ADMIN_FULLNAME=Sistem Yoneticisi
"@

Set-Content -LiteralPath $envPath -Value $content -Encoding utf8
Write-Host "[+] .env olusturuldu: $envPath" -ForegroundColor Green

# --- Frontend adres kontrolu -------------------------------------------
$webIndex = Join-Path $deployRoot 'app\web\index.html'
if (Test-Path $webIndex) {
    $expectedApi = "http://$serverAddress`:$ApiPort"
    Write-Host ''
    Write-Host 'ONEMLI:' -ForegroundColor Yellow
    Write-Host "  Frontend, API adresini BUILD sirasinda icine gomer."
    Write-Host "  Bu kurulum icin dogru deger:  VITE_API_URL=$expectedApi"
    Write-Host '  Build baska bir adresle alindiysa arayuz API''ye ulasamaz;'
    Write-Host '  bu durumda gelistirme makinesinde yeniden build alin.'
}

$dbPlain = $null; $adminPlain = $null
[GC]::Collect()

Write-Host ''
Write-Host 'Simdi calistirin:  .\03-migrate-seed.ps1'
