#Requires -Version 5.1
<#
.SYNOPSIS
  Veritabanini ve uygulama kullanicisini olusturur.

.DESCRIPTION
  PostgreSQL'in SUNUCUYA ONCEDEN KURULMUS olmasi gerekir
  (deploy\installers\ klasorundeki installer ile).

  Bu script yalnizca:
    - uygulama rolunu (entanter)
    - veritabanini (entanter_takip)
  olusturur. Var olanlara DOKUNMAZ, tekrar calistirilabilir.

.NOTES
  Yonetici olarak calistirin.
#>
param(
  [string]$DbName        = 'entanter_takip',
  [string]$DbUser        = 'entanter',
  [string]$SuperUser     = 'postgres',
  [string]$PgHost        = 'localhost',
  [int]   $PgPort        = 5432,
  [string]$PsqlPath      = ''
)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== 1/5  Veritabani kurulumu ===' -ForegroundColor Cyan
Write-Host ''

# --- psql.exe bul -------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($PsqlPath)) {
    $candidates = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
                  Sort-Object FullName -Descending
    if ($candidates.Count -eq 0) {
        Write-Host 'psql.exe bulunamadi.' -ForegroundColor Red
        Write-Host 'PostgreSQL kurulu degilse once deploy\installers\ altindaki installer ile kurun.'
        Write-Host 'Kuruluysa yolu parametre ile verin:  .\01-install-db.ps1 -PsqlPath "C:\...\psql.exe"'
        exit 1
    }
    $PsqlPath = $candidates[0].FullName
}
Write-Host "psql       : $PsqlPath"
Write-Host "Sunucu     : $PgHost`:$PgPort"
Write-Host "Veritabani : $DbName"
Write-Host "Kullanici  : $DbUser"
Write-Host ''

# --- Parolalar ----------------------------------------------------------
$superSecure = Read-Host "PostgreSQL '$SuperUser' kullanicisinin parolasi" -AsSecureString
$superPlain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                 [Runtime.InteropServices.Marshal]::SecureStringToBSTR($superSecure))

$appSecure1 = Read-Host "Olusturulacak '$DbUser' kullanicisi icin YENI parola" -AsSecureString
$appSecure2 = Read-Host "Yeni parolayi tekrar girin" -AsSecureString
$appPlain1  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($appSecure1))
$appPlain2  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($appSecure2))

if ($appPlain1 -ne $appPlain2) {
    Write-Host 'Parolalar eslesmedi. Islem iptal edildi.' -ForegroundColor Red
    exit 1
}
if ($appPlain1.Length -lt 12) {
    Write-Host 'Parola en az 12 karakter olmalidir.' -ForegroundColor Red
    exit 1
}

$env:PGPASSWORD = $superPlain

function Invoke-Psql {
    param([string]$Database, [string]$Sql)
    # stderr yonlendirilmiyor; PowerShell 5.1'de native stderr ErrorRecord'a donusur.
    & $PsqlPath -h $PgHost -p $PgPort -U $SuperUser -d $Database -v ON_ERROR_STOP=1 -t -A -c $Sql
}

try {
    # --- Rol -------------------------------------------------------------
    $roleExists = Invoke-Psql -Database 'postgres' -Sql "SELECT 1 FROM pg_roles WHERE rolname = '$DbUser'"
    if ($roleExists -match '1') {
        Write-Host "[=] '$DbUser' rolu zaten var, parolasi guncelleniyor." -ForegroundColor Yellow
        $escaped = $appPlain1.Replace("'", "''")
        Invoke-Psql -Database 'postgres' -Sql "ALTER ROLE `"$DbUser`" WITH LOGIN PASSWORD '$escaped'" | Out-Null
    } else {
        $escaped = $appPlain1.Replace("'", "''")
        Invoke-Psql -Database 'postgres' -Sql "CREATE ROLE `"$DbUser`" WITH LOGIN PASSWORD '$escaped'" | Out-Null
        Write-Host "[+] '$DbUser' rolu olusturuldu." -ForegroundColor Green
    }

    # --- Veritabani ------------------------------------------------------
    $dbExists = Invoke-Psql -Database 'postgres' -Sql "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
    if ($dbExists -match '1') {
        Write-Host "[=] '$DbName' veritabani zaten var, dokunulmadi." -ForegroundColor Yellow
    } else {
        # Turkce siralama ve buyuk/kucuk harf davranisi icin UTF8 sart.
        Invoke-Psql -Database 'postgres' -Sql "CREATE DATABASE `"$DbName`" OWNER `"$DbUser`" ENCODING 'UTF8' TEMPLATE template0" | Out-Null
        Write-Host "[+] '$DbName' veritabani olusturuldu (UTF8)." -ForegroundColor Green
    }

    # Semayi uygulama kullanicisi yonetecek.
    Invoke-Psql -Database $DbName -Sql "GRANT ALL ON SCHEMA public TO `"$DbUser`"" | Out-Null

    Write-Host ''
    Write-Host 'Veritabani hazir.' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Bir sonraki adimda bu baglanti adresini kullanacaksiniz:' -ForegroundColor Cyan
    Write-Host "  postgresql://$DbUser`:<PAROLA>@$PgHost`:$PgPort/$DbName"
    Write-Host ''
    Write-Host 'Simdi calistirin:  .\02-configure.ps1'
}
finally {
    # Parolalari ortamdan ve bellekten temizle.
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $superPlain = $null; $appPlain1 = $null; $appPlain2 = $null
    [GC]::Collect()
}
