#Requires -Version 5.1
<#
.SYNOPSIS
  Veritabani yedegi alir; istege bagli olarak gunluk zamanlanmis gorev kurar.

.DESCRIPTION
  Yedekleme ILK KURULUMDA yapilandirilmalidir, sonraya birakilmamalidir.
  Zimmet gecmisi geri getirilemez bir veridir.

.EXAMPLE
  .\backup.ps1                 # tek seferlik yedek al
  .\backup.ps1 -RegisterTask   # her gun 22:00'de otomatik yedek kur
#>
param(
  [string]$DbName        = 'entanter_takip',
  [string]$DbUser        = 'entanter',
  [string]$PgHost        = 'localhost',
  [int]   $PgPort        = 5432,
  [string]$BackupDir     = '',
  [int]   $RetentionDays = 30,
  [switch]$RegisterTask,
  [string]$TaskTime      = '22:00'
)

$ErrorActionPreference = 'Stop'

$deployRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    $BackupDir = Join-Path $deployRoot 'backups'
}

# --- Zamanlanmis gorev kur ---------------------------------------------
if ($RegisterTask) {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host 'Gorev kaydi icin YONETICI yetkisi gerekir.' -ForegroundColor Red
        exit 1
    }

    $taskName = 'EntanterTakip-Yedekleme'
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -BackupDir `"$BackupDir`" -RetentionDays $RetentionDays"
    $trigger  = New-ScheduledTaskTrigger -Daily -At $TaskTime
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd

    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
        -Settings $settings -RunLevel Highest -User 'SYSTEM' `
        -Description 'Envanter ve Zimmet Takip - gunluk veritabani yedegi' | Out-Null

    Write-Host "[+] Zamanlanmis gorev kuruldu: $taskName (her gun $TaskTime)" -ForegroundColor Green
    Write-Host "    Yedek klasoru: $BackupDir"
    Write-Host ''
    Write-Host 'ONEMLI: Yedekleri duzenli olarak BASKA bir diske/sunucuya kopyalayin.' -ForegroundColor Yellow
    Write-Host 'Ayni diskteki yedek, disk arizasinda ise yaramaz.'
    exit 0
}

# --- Yedek al -----------------------------------------------------------
$pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
          Sort-Object FullName -Descending | Select-Object -First 1

if ($null -eq $pgDump) {
    Write-Host 'pg_dump.exe bulunamadi.' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Parola .env icindeki DATABASE_URL'den okunur; boylece iki yerde tutulmaz.
$envPath = Join-Path $deployRoot 'app\api\.env'
if (-not (Test-Path $envPath)) {
    Write-Host "API .env bulunamadi: $envPath" -ForegroundColor Red
    exit 1
}

$dbLine = Select-String -LiteralPath $envPath -Pattern '^DATABASE_URL=' | Select-Object -First 1
if ($null -eq $dbLine) {
    Write-Host '.env icinde DATABASE_URL yok.' -ForegroundColor Red
    exit 1
}

$connectionString = $dbLine.Line -replace '^DATABASE_URL=', ''
try {
    $uri = [System.Uri]$connectionString
    $userInfo = $uri.UserInfo.Split(':')
    $DbUser = [System.Uri]::UnescapeDataString($userInfo[0])
    $env:PGPASSWORD = [System.Uri]::UnescapeDataString($userInfo[1])
    $PgHost = $uri.Host
    $PgPort = $uri.Port
    $DbName = $uri.AbsolutePath.TrimStart('/')
}
catch {
    Write-Host 'DATABASE_URL cozumlenemedi.' -ForegroundColor Red
    exit 1
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file  = Join-Path $BackupDir "$DbName-$stamp.dump"

try {
    # -Fc : sikistirilmis custom format; pg_restore ile secmeli geri yukleme yapilabilir.
    & $pgDump.FullName -h $PgHost -p $PgPort -U $DbUser -d $DbName -Fc -f $file
    if ($LASTEXITCODE -ne 0) { throw "pg_dump basarisiz (cikis kodu $LASTEXITCODE)" }

    $sizeMb = [math]::Round((Get-Item $file).Length / 1MB, 2)
    Write-Host "[+] Yedek alindi: $file  ($sizeMb MB)" -ForegroundColor Green

    # --- Eski yedekleri temizle ----------------------------------------
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    $old = Get-ChildItem -Path $BackupDir -Filter '*.dump' |
           Where-Object { $_.LastWriteTime -lt $cutoff }

    foreach ($item in $old) {
        Remove-Item $item.FullName -Force
        Write-Host "[-] Silindi (>$RetentionDays gun): $($item.Name)" -ForegroundColor DarkGray
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
