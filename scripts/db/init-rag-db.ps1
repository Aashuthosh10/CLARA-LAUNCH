# Initialize or repair CLARA's local PostgreSQL/pgvector RAG database.
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File scripts/db/init-rag-db.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Set-Location $ProjectRoot

function Read-DotEnv {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path $Path)) {
        throw ".env was not found. Copy .env.example to .env and set POSTGRES_PASSWORD first."
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*#' -or $line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            continue
        }
        $key = $matches[1]
        $value = $matches[2].Trim()
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$key] = $value
    }
    return $values
}

function Sql-Literal {
    param([string]$Value)
    return $Value.Replace("'", "''")
}

function Sql-Identifier {
    param([string]$Value)
    return '"' + $Value.Replace('"', '""') + '"'
}

$envValues = Read-DotEnv ".env"
$dbUser = if ($envValues["POSTGRES_USER"]) { $envValues["POSTGRES_USER"] } else { "clara_user" }
$dbName = if ($envValues["POSTGRES_DB"]) { $envValues["POSTGRES_DB"] } else { "clara_db" }
$dbPassword = $envValues["POSTGRES_PASSWORD"]

if (-not $dbPassword) {
    throw "POSTGRES_PASSWORD is empty in .env. Set it before initializing RAG."
}

Write-Host "Starting PostgreSQL container if needed..."
docker compose up -d postgres | Out-Host

Write-Host "Waiting for PostgreSQL health check..."
for ($i = 0; $i -lt 30; $i++) {
    $status = docker inspect -f "{{.State.Health.Status}}" clara-postgres 2>$null
    if ($status -eq "healthy") {
        break
    }
    Start-Sleep -Seconds 2
}

$status = docker inspect -f "{{.State.Health.Status}}" clara-postgres 2>$null
if ($status -ne "healthy") {
    throw "PostgreSQL container did not become healthy. Current status: $status"
}

Write-Host "Aligning database role password with .env..."
$roleSql = "ALTER ROLE $(Sql-Identifier $dbUser) WITH LOGIN PASSWORD '$(Sql-Literal $dbPassword)';"
docker exec clara-postgres psql -U $dbUser -d postgres -v ON_ERROR_STOP=1 -c $roleSql | Out-Host

Write-Host "Ensuring configured database exists..."
$dbExistsSql = "SELECT 1 FROM pg_database WHERE datname = '$(Sql-Literal $dbName)';"
$exists = docker exec clara-postgres psql -U $dbUser -d postgres -tAc $dbExistsSql
if (($exists | Out-String).Trim() -ne "1") {
    docker exec clara-postgres createdb -U $dbUser -O $dbUser -- $dbName | Out-Host
    Write-Host "Created database: $dbName"
} else {
    Write-Host "Database already exists: $dbName"
}

Write-Host "Applying pgvector schema..."
Get-Content -Raw -LiteralPath "scripts\db\init_pgvector.sql" |
    docker exec -i clara-postgres psql -U $dbUser -d $dbName -v ON_ERROR_STOP=1 | Out-Host

Write-Host "RAG database is initialized. Next: python -m backend.tools.ingest_college_knowledge_pg"
