# =====================================================
# gen_secrets.ps1
# Membaca file .env lalu menulis src/secrets.h
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\gen_secrets.ps1
# =====================================================

param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

$out = "src\secrets.h"
$vars = @{}

if (Test-Path -LiteralPath $EnvFile) {

  Get-Content -LiteralPath $EnvFile -Encoding UTF8 | ForEach-Object {

    $line = $_.Trim()

    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {

      $idx = $line.IndexOf("=")

      $key = $line.Substring(0, $idx).Trim()
      $val = $line.Substring($idx + 1).Trim()

      $vars[$key] = $val
    }
  }

} else {

  Write-Host "[WARN] $EnvFile tidak ditemukan. Menggunakan nilai kosong."
}

function Get-Val($name, $def) {
  if ($vars.ContainsKey($name)) { return $vars[$name] }
  return $def
}

function Esc($s) {
  return ($s -replace '"', '\"')
}

$lines = @(
  "// ===========================================================",
  "// File ini DIGENERATE OTOMATIS oleh scripts\gen_secrets.ps1",
  "// dari .env. JANGAN di-edit manual. JANGAN di-commit.",
  "// ===========================================================",
  "#pragma once",
  ""
)

$lines += @(
  "#define SECRET_WIFI_SSID  `"$(Esc $(Get-Val 'WIFI_SSID' ''))`"",
  "#define SECRET_WIFI_PASS  `"$(Esc $(Get-Val 'WIFI_PASS' ''))`"",
  "#define SECRET_MQTT_HOST  `"$(Esc $(Get-Val 'MQTT_HOST' ''))`"",
  "#define SECRET_MQTT_PORT  $(Get-Val 'MQTT_PORT' '8883')",
  "#define SECRET_MQTT_USER  `"$(Esc $(Get-Val 'MQTT_USER' ''))`"",
  "#define SECRET_MQTT_PASS  `"$(Esc $(Get-Val 'MQTT_PASS' ''))`"",
  "#define SECRET_DEVICE_ID  `"$(Esc $(Get-Val 'DEVICE_ID' 'iot_default'))`"",
  ""
)

$h = $lines -join [Environment]::NewLine

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) $out),
  $h,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "[OK] $out berhasil dibuat dari $EnvFile"