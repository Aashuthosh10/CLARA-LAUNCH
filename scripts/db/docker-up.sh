#!/usr/bin/env bash
# Start PostgreSQL (Docker) and apply pgvector schema. Idempotent.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and set POSTGRES_PASSWORD." >&2
  exit 1
fi

if ! grep -qE '^[[:space:]]*POSTGRES_PASSWORD=[^[:space:]]' .env; then
  echo "POSTGRES_PASSWORD must be set (non-empty) in .env for docker compose." >&2
  exit 1
fi

# Compose reads ./.env for ${POSTGRES_PASSWORD} etc. in docker-compose.yml
echo "Starting Postgres (docker compose)..."
docker compose up -d postgres

echo "Waiting for Postgres to be healthy..."
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' clara-postgres 2>/dev/null || echo "missing")"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  if [[ "$status" == "missing" ]]; then
    echo "Container clara-postgres not found." >&2
    exit 1
  fi
  sleep 2
done

if [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' clara-postgres 2>/dev/null)" != "healthy" ]]; then
  echo "Postgres did not become healthy in time. Check: docker logs clara-postgres" >&2
  exit 1
fi

POSTGRES_USER="$(grep -E '^[[:space:]]*POSTGRES_USER=' .env | head -1 | cut -d= -f2- | tr -d " \"'" || true)"
POSTGRES_DB="$(grep -E '^[[:space:]]*POSTGRES_DB=' .env | head -1 | cut -d= -f2- | tr -d " \"'" || true)"
POSTGRES_USER="${POSTGRES_USER:-clara_user}"
POSTGRES_DB="${POSTGRES_DB:-clara_db}"

echo "Applying schema (pgvector + college_knowledge, idempotent)..."
docker exec -i clara-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${ROOT}/scripts/db/init_pgvector.sql"

echo "Done. Postgres: 127.0.0.1:5432  user=${POSTGRES_USER}  db=${POSTGRES_DB}"
echo "Ingest RAG data when ready: python -m backend.tools.ingest_college_knowledge_pg"
