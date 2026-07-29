#Requires -Version 5.1
<#
.SYNOPSIS
  API ve Web servislerini Windows Service olarak kaydeder.

.DESCRIPTION
  Iki servis olusur:
    EntanterTakipAPI  - REST API      (:3001)
    EntanterTakipWeb  - Web arayuzu   (:3000)

  Her ikisi de sunucu acilisinda OTOMATIK baslar ve cokme durumunda
  yeniden baslatilir. services.msc uzerinden yonetilebilirler.

.NOTES
  YONETICI olarak calistirilmalidir.
#>
$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== 4/5  Windows servisleri ===' -ForegroundColor Cyan
Write-Host ''

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'Bu script YONETICI olarak calistirilmalidir.' -ForegroundColor Red
    Write-Host 'PowerShell''i sag tik > "Yonetici olarak calistir" ile acin.'
    exit 1
}

$deployRoot  = Split-Path -Parent $PSScriptRoot
$servicesJs  = Join-Path $deployRoot 'service\services.cjs'
$apiEntry    = Join-Path $deployRoot 'app\api\dist\server.js'
$webEntry    = Join-Path $deployRoot 'static-server.mjs'

foreach ($required in @($servicesJs, $apiEntry, $webEntry)) {
    if (-not (Test-Path $required)) {
        Write-Host "Gerekli dosya bulunamadi: $required" -ForegroundColor Red
        Write-Host 'Deploy paketi eksik gorunuyor.'
        exit 1
    }
}

# node-windows, deploy paketiyle birlikte gelen API node_modules'unde bulunur.
$nodeModules = Join-Path $deployRoot 'app\api\node_modules'
if (-not (Test-Path (Join-Path $nodeModules 'node-windows'))) {
    Write-Host 'node-windows paketi bulunamadi.' -ForegroundColor Red
    Write-Host "Beklenen konum: $nodeModules\node-windows"
    exit 1
}

$env:NODE_PATH = $nodeModules

Write-Host 'Servisler kaydediliyor...'
Push-Location $deployRoot
try {
    & node $servicesJs install
    if ($LASTEXITCODE -ne 0) { throw "Servis kaydi basarisiz (cikis kodu $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

Start-Sleep -Seconds 6

Write-Host ''
Write-Host '--- Servis durumlari ---' -ForegroundColor Cyan
Get-Service -Name 'EntanterTakip*' -ErrorAction SilentlyContinue |
    Select-Object Name, Status, StartType | Format-Table -AutoSize

Write-Host ''
Write-Host 'Simdi calistirin:  .\05-firewall.ps1'
Write-Host 'Kaldirmak icin  :  node service\services.cjs uninstall'
