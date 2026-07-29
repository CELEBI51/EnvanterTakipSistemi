#Requires -Version 5.1
<#
.SYNOPSIS
  Web (3000) ve API (3001) portlarini SADECE fabrika yerel agina acar.

.DESCRIPTION
  Kural bilincli olarak "Any" adrese acilmaz. Sistem dis internete kapali
  olsa bile, portlarin tum arayuzlere acilmasi gereksiz bir yuzey olusturur.
  Varsayilan olarak sunucunun kendi alt agi hesaplanir.

.EXAMPLE
  .\05-firewall.ps1 -Subnet 192.168.10.0/24
#>
param(
  [string]$Subnet  = '',
  [int]   $WebPort = 3000,
  [int]   $ApiPort = 3001
)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== 5/5  Guvenlik duvari ===' -ForegroundColor Cyan
Write-Host ''

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'Bu script YONETICI olarak calistirilmalidir.' -ForegroundColor Red
    exit 1
}

# --- Alt agi tespit et --------------------------------------------------
if ([string]::IsNullOrWhiteSpace($Subnet)) {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
          Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
          Select-Object -First 1

    if ($null -eq $ip) {
        Write-Host 'Yerel IP tespit edilemedi. -Subnet parametresi ile elle verin.' -ForegroundColor Red
        exit 1
    }

    $octets = $ip.IPAddress.Split('.')
    $Subnet = "$($octets[0]).$($octets[1]).$($octets[2]).0/$($ip.PrefixLength)"
    Write-Host "Tespit edilen alt ag: $Subnet  (sunucu IP: $($ip.IPAddress))"
    $answer = Read-Host 'Bu alt ag dogru mu? (E/h)'
    if ($answer -match '^[hH]') {
        $Subnet = Read-Host 'Alt agi girin (ornek: 192.168.10.0/24)'
    }
}

Write-Host ''
Write-Host "Portlar $Subnet agina acilacak." -ForegroundColor Cyan

$rules = @(
    @{ Name = 'Entanter Takip - Web'; Port = $WebPort },
    @{ Name = 'Entanter Takip - API'; Port = $ApiPort }
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if ($null -ne $existing) {
        Remove-NetFirewallRule -DisplayName $rule.Name
        Write-Host "[=] Eski kural kaldirildi: $($rule.Name)" -ForegroundColor Yellow
    }

    New-NetFirewallRule `
        -DisplayName  $rule.Name `
        -Direction    Inbound `
        -Action       Allow `
        -Protocol     TCP `
        -LocalPort    $rule.Port `
        -RemoteAddress $Subnet `
        -Profile      Any `
        -Description  'Envanter ve Zimmet Takip - yalnizca fabrika yerel agi' | Out-Null

    Write-Host "[+] $($rule.Name)  ->  TCP $($rule.Port)  ($Subnet)" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Kurulum tamamlandi.' -ForegroundColor Green
Write-Host ''
Write-Host 'DOGRULAMA:' -ForegroundColor Cyan
Write-Host "  1) Sunucuda    : curl http://localhost:$ApiPort/api/health"
Write-Host "  2) Baska bir PC: tarayicida  http://<sunucu-ip>:$WebPort"
Write-Host ''
Write-Host 'Son adim: yedeklemeyi kurun ->  .\backup.ps1 -RegisterTask'
