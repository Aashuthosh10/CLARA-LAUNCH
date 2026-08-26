param(
    [int]$PollSeconds = 10
)

# Keep CLARA's local services running for the signed-in kiosk user.
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectRoot "temp\runtime-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectRoot

function Test-DockerReady {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

if (-not (Test-DockerReady)) {
    $dockerDesktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
        throw "Docker Desktop was not found at $dockerDesktop"
    }
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 60 -and -not (Test-DockerReady); $attempt++) {
        Start-Sleep -Seconds 2
    }
}

if (-not (Test-DockerReady)) {
    throw "Docker Desktop did not become ready within two minutes."
}

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed with exit code $LASTEXITCODE"
}

$python = Join-Path $ProjectRoot "backend\.venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
    throw "Backend virtual environment is missing: $python"
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$components = @(
    @{
        Name = "backend"
        Port = 6969
        FilePath = $python
        Arguments = @("-m", "backend.main")
        WorkingDirectory = $ProjectRoot
    },
    @{
        Name = "frontend"
        Port = 5176
        FilePath = $npm
        Arguments = @("run", "dev")
        WorkingDirectory = (Join-Path $ProjectRoot "frontend")
    },
    @{
        Name = "facial-display"
        Port = 5177
        FilePath = $npm
        Arguments = @("run", "dev")
        WorkingDirectory = (Join-Path $ProjectRoot "facial-display")
    }
)

$managed = @{}

while ($true) {
    foreach ($component in $components) {
        $name = $component.Name
        $process = $managed[$name]
        if ($process -and -not $process.HasExited) {
            continue
        }

        $listener = Get-NetTCPConnection -State Listen -LocalPort $component.Port -ErrorAction SilentlyContinue
        if ($listener) {
            continue
        }

        $managed[$name] = Start-Process -FilePath $component.FilePath -ArgumentList $component.Arguments -WorkingDirectory $component.WorkingDirectory -RedirectStandardOutput (Join-Path $LogDir "$name.out.log") -RedirectStandardError (Join-Path $LogDir "$name.err.log") -WindowStyle Hidden -PassThru
    }

    Start-Sleep -Seconds $PollSeconds
}
