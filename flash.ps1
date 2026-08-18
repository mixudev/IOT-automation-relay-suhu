# =====================================================
# flash.ps1 — generate secrets dari .env lalu build/upload
# Usage:
#   powershell -ExecutionPolicy Bypass -File flash.ps1          # build + upload
#   powershell -ExecutionPolicy Bypass -File flash.ps1 -Target build
# =====================================================

param(
  [string]$Target = "upload"
)

$ErrorActionPreference = "Stop"

# 1) Generate src/secrets.h dari .env
& (Join-Path $PSScriptRoot "scripts\gen_secrets.ps1")

# 2) Temukan executable platformio
$pio = Get-Command platformio -ErrorAction SilentlyContinue

if ($pio) {
  $exe = $pio.Source
} else {
  $exe = Join-Path $env:USERPROFILE ".platformio\penv\Scripts\platformio.exe"
}

# 3) PlatformIO: "run" tanpa target = build saja.
#    Target valid: upload, buildfs, clean, size, dll.
if ($Target -eq "build") {

  Write-Host "[BUILD] platformio run"
  & $exe run

} else {

  Write-Host "[BUILD] platformio run --target $Target"
  & $exe run --target $Target
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERROR] build gagal."
  exit 1
}

exit 0