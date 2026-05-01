# Safely release CLARA backend port 6969 on Windows.
# - Shows PID + process name
# - Asks for confirmation before kill
# - Verifies whether port was released

$ErrorActionPreference = "Stop"
$port = 6969

Write-Host "Checking CLARA backend port $port..."
$lines = netstat -ano | Select-String ":$port\s+.*LISTENING"

if (-not $lines) {
    Write-Host "Port $port is already free."
    exit 0
}

$pids = $lines | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique
foreach ($procId in $pids) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($null -eq $proc) {
        Write-Host "PID $procId no longer exists."
        continue
    }

    Write-Host "Port $port is held by PID $procId ($($proc.ProcessName))."
    $answer = Read-Host "Kill this process? (y/N)"
    if ($answer -match '^(y|yes)$') {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "Killed PID $procId."
        } catch {
            Write-Host "Failed to kill PID ${procId}: $($_.Exception.Message)"
        }
    } else {
        Write-Host "Skipped PID $procId."
    }
}

Start-Sleep -Milliseconds 500
$left = netstat -ano | Select-String ":$port\s+.*LISTENING"
if ($left) {
    Write-Host "Port $port is still in use."
    exit 1
}

Write-Host "Port $port is free."
exit 0
