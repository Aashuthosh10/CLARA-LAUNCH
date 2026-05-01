# Start CLARA backend on port 6969. Run from project root.
# This script does NOT auto-kill unknown processes on the port.
# If the port is occupied, run scripts/kill-backend-port.ps1 first.

$ErrorActionPreference = "Stop"
# Script lives in scripts/; project root is one level up.
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

# Read PORT from .env (default 6969)
$port = 6969
if (Test-Path ".env") {
    $line = Get-Content ".env" | Where-Object { $_ -match '^\s*PORT\s*=\s*(\d+)' } | Select-Object -First 1
    if ($line -match 'PORT\s*=\s*(\d+)') { $port = [int]$matches[1] }
}

Write-Host "Backend port: $port (from .env or default 6969)"
Write-Host "Checking if port $port is in use..."

$listeners = netstat -ano | Select-String ":\s*$port\s+.*LISTENING"
if ($listeners) {
    $pids = $listeners | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique
    Write-Host "Port $port is already in use by PID(s): $($pids -join ', ')"
    Write-Host "To safely release it with confirmation, run:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/kill-backend-port.ps1"
    Write-Host "Then re-run this script."
    exit 1
}

$venvPython = Join-Path $ProjectRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    # Try one more location (root .venv)
    $venvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        Write-Error "Virtual env not found. Run: python -m venv backend\.venv && .\backend\.venv\Scripts\pip install -r backend\requirements\requirements.txt"
    }
}

Write-Host "Starting backend at http://0.0.0.0:$port ..."
$env:PORT = $port
# Run as module so `backend` package resolves from project root.
& $venvPython -m backend.main
