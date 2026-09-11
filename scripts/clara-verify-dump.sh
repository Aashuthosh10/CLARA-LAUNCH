#!/usr/bin/env bash
# Dump Docker/CLARA verification into the repo so the agent can read it.
# Prefer: bash scripts/clara-verify-dump.sh
# Uses `sg docker` so a fresh login is not required after usermod -aG docker.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/scripts/.verify-out.txt"
cd "$ROOT"

run_docker() {
  if docker info >/dev/null 2>&1; then
    "$@"
  elif command -v sg >/dev/null 2>&1 && getent group docker >/dev/null; then
    sg docker -c "$*"
  else
    sudo docker "$@"
  fi
}

{
  echo "=== timestamp ==="
  date -Is
  echo "=== user/groups ==="
  id
  echo "=== docker versions ==="
  docker --version
  docker compose version
  echo "=== systemctl docker ==="
  systemctl is-enabled docker || true
  systemctl is-active docker || true
  echo "=== compose config ==="
  if docker info >/dev/null 2>&1; then
    docker compose config >/dev/null && echo OK || echo FAIL
  else
    sg docker -c 'docker compose config >/dev/null && echo OK || echo FAIL'
  fi
  echo "=== compose ps ==="
  if docker info >/dev/null 2>&1; then docker compose ps; else sg docker -c 'docker compose ps'; fi
  echo "=== docker ps ==="
  if docker info >/dev/null 2>&1; then docker ps -a; else sg docker -c 'docker ps -a'; fi
  echo "=== health/restart ==="
  if docker info >/dev/null 2>&1; then
    docker inspect -f '{{.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} status={{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}}' $(docker ps -aq) 2>/dev/null || true
  else
    sg docker -c 'docker inspect -f "{{.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} status={{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}}" $(docker ps -aq)' 2>/dev/null || true
  fi
  echo "=== volumes ==="
  if docker info >/dev/null 2>&1; then docker volume ls; else sg docker -c 'docker volume ls'; fi
  echo "=== pgvector extension ==="
  if docker info >/dev/null 2>&1; then
    docker exec clara-postgres psql -U clara_user -d clara_db -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector';" 2>&1 || true
  else
    sg docker -c 'docker exec clara-postgres psql -U clara_user -d clara_db -c "SELECT extname, extversion FROM pg_extension WHERE extname='"'"'vector'"'"';"' 2>&1 || true
  fi
  echo "=== pg tables ==="
  if docker info >/dev/null 2>&1; then
    docker exec clara-postgres psql -U clara_user -d clara_db -c '\dt' 2>&1 || true
  else
    sg docker -c "docker exec clara-postgres psql -U clara_user -d clara_db -c '\dt'" 2>&1 || true
  fi
  echo "=== logs tail ==="
  if docker info >/dev/null 2>&1; then docker compose logs --tail=50 2>&1 || true
  else sg docker -c 'docker compose logs --tail=50' 2>&1 || true
  fi
  echo "=== curl ports ==="
  curl -sI http://127.0.0.1:5176 2>&1 | head -5 || true
  curl -sI http://127.0.0.1:5177 2>&1 | head -5 || true
  curl -sI http://127.0.0.1:6969/health 2>&1 | head -5 || true
  echo "=== listen ports ==="
  ss -lntp | grep -E '5432|5176|5177|6969' || true
  echo "=== node/python ==="
  node -v; npm -v
  if [[ -x .venv/bin/python ]]; then
    .venv/bin/python -c 'import fastapi,pgvector; print("backend_imports_ok")' 2>&1 || true
  fi
} >"$OUT" 2>&1
echo "Wrote $OUT"
