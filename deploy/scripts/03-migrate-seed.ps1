#Requires -Version 5.1
<#
.SYNOPSIS
  Veritabani semasini olusturur (migration) ve baslangic verisini yukler (seed).

.DESCRIPTION
  Her iki adim da IDEMPOTENT'tir; guncelleme sonrasi tekrar calistirmak guvenlidir.
  Migration'lar uygulanmis olanlari atlar, seed var olan kayda dokunmaz.
#>
$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== 3/5  Sema ve baslangic verisi ===' -ForegroundColor Cyan
Write-Host ''

$deployRoot = Split-Path -Parent $PSScriptRoot
$apiRoot    = Join-Path $deployRoot 'app\api'

if (-not (Test-Path (Join-Path $apiRoot '.env'))) {
    Write-Host 'API .env dosyasi yok. Once .\02-configure.ps1 calistirin.' -ForegroundColor Red
    exit 1
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($null -eq $node) {
    Write-Host 'node bulunamadi. Once deploy\installers\ altindaki Node.js MSI ile kurun.' -ForegroundColor Red
    exit 1
}
Write-Host "node: $node  ($(& node --version))"

Push-Location $apiRoot
try {
    Write-Host ''
    Write-Host '--- Migration ---' -ForegroundColor Cyan
    & node 'dist\db\migrate.js'
    if ($LASTEXITCODE -ne 0) { throw "Migration basarisiz (cikis kodu $LASTEXITCODE)" }

    Write-Host ''
    Write-Host '--- Seed ---' -ForegroundColor Cyan
    & node 'dist\db\seed.js'
    if ($LASTEXITCODE -ne 0) { throw "Seed basarisiz (cikis kodu $LASTEXITCODE)" }

    Write-Host ''
    Write-Host 'Veritabani hazir.' -ForegroundColor Green
    Write-Host ''
    Write-Host 'YUKARIDAKI YONETICI PAROLASINI NOT EDIN.' -ForegroundColor Yellow
    Write-Host 'Ilk giriste degistirilmesi ZORUNLUDUR; degistirilmeden'
    Write-Host 'sistemin diger boumleri kullanilamaz.'
    Write-Host ''
    Write-Host 'Simdi calistirin:  .\04-install-services.ps1  (Yonetici olarak)'
}
finally {
    Pop-Location
}
