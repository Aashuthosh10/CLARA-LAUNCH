# Register CLARA's Windows supervisor for the current user and start it now.
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Supervisor = Join-Path $ProjectRoot "scripts\start-clara-windows.ps1"
$TaskName = "CLARA Kiosk Supervisor"
$TaskArguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Supervisor`""

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $TaskArguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Starts Docker and keeps CLARA backend/frontends running after user logon." -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State
