param(
    [switch]$FailOnDirtyGit,
    [switch]$SkipFrontendBuild,
    [switch]$RunLatencyGate
)

# Run CLARA's software production-readiness checks from the project root.

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

$python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = Join-Path $ProjectRoot "backend\.venv\Scripts\python.exe"
}
if (-not (Test-Path $python)) {
    throw "Python virtual environment not found. Create .venv and install backend requirements first."
}

$summary = [ordered]@{}
$warnings = New-Object System.Collections.Generic.List[string]

function Read-DotEnvValue {
    param(
        [string]$Name,
        [string]$Default
    )

    if (-not (Test-Path ".env")) {
        return $Default
    }
    $line = Get-Content -LiteralPath ".env" |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -First 1
    if (-not $line) {
        return $Default
    }
    $value = ($line -split "=", 2)[1].Trim().Trim('"')
    if ($value) { return $value }
    return $Default
}

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command,
        [switch]$AllowWarning
    )

    Write-Host ""
    Write-Host "==> $Name"
    try {
        & $Command
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "$Name exited with code $LASTEXITCODE"
        }
        $summary[$Name] = "PASS"
    } catch {
        if ($AllowWarning) {
            $summary[$Name] = "WARN"
            $warnings.Add("${Name}: $($_.Exception.Message)") | Out-Null
            Write-Warning $_.Exception.Message
        } else {
            $summary[$Name] = "FAIL"
            Write-Host ""
            Write-Host "Production readiness summary: FAIL"
            Write-Host "$Name failed: $($_.Exception.Message)"
            throw
        }
    }
}

Run-Step "Backend tests" {
    & $python -m pytest backend\tests -q
}

Run-Step "RAG database smoke" {
    & $python backend\tools\test_db_rag.py
}

$ragMinDocuments = [int](Read-DotEnvValue "RAG_MIN_DOCUMENTS" "500")
Run-Step "RAG minimum document gate" {
    & $python -c "from backend.clients.database import get_document_count; import sys; n=get_document_count(); print(f'RAG documents: {n} (minimum: $ragMinDocuments)'); sys.exit(0 if n >= $ragMinDocuments else 1)"
}

Run-Step "Multilingual RAG smoke" {
    & $python -m backend.tools.rag_multilingual_check
}

Run-Step "Frontend typecheck" {
    Push-Location frontend
    try {
        npm run lint
    } finally {
        Pop-Location
    }
}

if ($SkipFrontendBuild) {
    Write-Host ""
    Write-Warning "Skipping frontend production build by request."
    $summary["Frontend production build"] = "WARN"
    $warnings.Add("Frontend production build skipped") | Out-Null
} else {
    Run-Step "Frontend production build" {
        Push-Location frontend
        try {
            npm run build
        } finally {
            Pop-Location
        }
    }
}

Run-Step "Frontend audit high+" {
    Push-Location frontend
    try {
        npm audit --audit-level=high
    } finally {
        Pop-Location
    }
}

Run-Step "Python dependency audit" {
    & $python -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('pip_audit') else 1)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "pip-audit is not installed in this venv. Install with: python -m pip install pip-audit"
    }
    & $python -m pip_audit --progress-spinner off
}

$latencyOutput = "backend\tools\latency_gate_latest.json"
if ($RunLatencyGate) {
    Run-Step "Latency benchmark gate" {
        & $python -m backend.tools.latency_benchmark --turns 20 --label production-check-latency --output $latencyOutput
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            throw "latency benchmark exited with code $LASTEXITCODE"
        }
        $latency = Get-Content -LiteralPath $latencyOutput -Raw | ConvertFrom-Json
        $visibleP95 = [double]$latency.summary.visible_answer_ms.p95
        $audioP95 = [double]$latency.summary.audio_first_ready_ms.p95
        Write-Host ("Latency gate: visible p95={0:n0}ms, audio-first-ready p95={1:n0}ms" -f $visibleP95, $audioP95)
        if ($visibleP95 -gt 1000) {
            throw "visible_answer_ms p95 exceeded 1000ms: $visibleP95"
        }
        if ($audioP95 -gt 3000) {
            throw "audio_first_ready_ms p95 exceeded 3000ms: $audioP95"
        }
    }
} elseif (Test-Path $latencyOutput) {
    try {
        $latency = Get-Content -LiteralPath $latencyOutput -Raw | ConvertFrom-Json
        Write-Host ""
        Write-Host ("Latest latency summary: visible p95={0:n0}ms, audio-first-ready p95={1:n0}ms" -f `
            ([double]$latency.summary.visible_answer_ms.p95), `
            ([double]$latency.summary.audio_first_ready_ms.p95))
    } catch {
        Write-Warning "Could not read latest latency summary: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "==> Git dirty-state audit"
$gitStatus = git status --short
if ($gitStatus) {
    Write-Host $gitStatus
    $summary["Git dirty-state audit"] = if ($FailOnDirtyGit) { "FAIL" } else { "WARN" }
    $warnings.Add("Git working tree has uncommitted changes") | Out-Null
    if ($FailOnDirtyGit) {
        Write-Host ""
        Write-Host "Production readiness summary: FAIL"
        throw "Git working tree is dirty and -FailOnDirtyGit was set."
    }
} else {
    Write-Host "Git working tree is clean."
    $summary["Git dirty-state audit"] = "PASS"
}

Write-Host ""
Write-Host "Production readiness checks:"
foreach ($item in $summary.GetEnumerator()) {
    Write-Host ("- {0}: {1}" -f $item.Key, $item.Value)
}

$hasFailure = $summary.Values -contains "FAIL"
$hasWarning = $summary.Values -contains "WARN"
$finalStatus = if ($hasFailure) { "FAIL" } elseif ($hasWarning) { "DEGRADED" } else { "PASS" }

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:"
    foreach ($warning in $warnings) {
        Write-Host "- $warning"
    }
}

Write-Host ""
Write-Host "Production readiness summary: $finalStatus"
if ($hasFailure) {
    exit 1
}
