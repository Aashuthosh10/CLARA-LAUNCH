#!/usr/bin/env bash
# CLARA post-Docker bring-up: remaining host deps + Postgres/pgvector stack.
# Docker Engine is assumed installed. Run once:
#   sudo bash scripts/clara-post-docker-deps.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run: sudo bash scripts/clara-post-docker-deps.sh" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${REPO_ROOT}"

TARGET_USER="${SUDO_USER:-clara}"
if ! id "${TARGET_USER}" &>/dev/null; then
  TARGET_USER="clara"
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Base tools"
apt-get update -y
apt-get install -y ca-certificates curl git gnupg jq unzip \
  python3-venv python3-pip python3-dev build-essential \
  libpq-dev pkg-config

echo "==> Node.js 20+ (NodeSource if needed)"
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  echo "Node present: $(node -v)"
else
  NODE_MAJOR=0
fi
if [[ "${NODE_MAJOR}" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  echo "Installed: $(node -v) / $(npm -v)"
fi

echo "==> Docker daemon"
systemctl enable --now docker
systemctl is-enabled docker
systemctl is-active docker
docker --version
docker compose version

echo "==> docker group for ${TARGET_USER}"
if id -nG "${TARGET_USER}" | tr ' ' '\n' | grep -qx docker; then
  echo "Already in docker group"
else
  usermod -aG docker "${TARGET_USER}"
  echo "Added ${TARGET_USER} to docker group (new shells need logout/login)"
fi

echo "==> Env check"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi
if ! grep -qE '^[[:space:]]*POSTGRES_PASSWORD=[^[:space:]#]+' .env; then
  GEN="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  if grep -qE '^[[:space:]]*POSTGRES_PASSWORD=' .env; then
    sed -i "s|^[[:space:]]*POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${GEN}|" .env
  else
    echo "POSTGRES_PASSWORD=${GEN}" >> .env
  fi
  echo "Generated POSTGRES_PASSWORD into .env (value not printed)"
fi
chmod 600 .env || true
chown "${TARGET_USER}:${TARGET_USER}" .env || true

echo "==> Compose validate + start postgres"
docker compose config >/dev/null
docker compose up -d
docker compose ps

echo "==> Wait for healthy postgres"
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' clara-postgres 2>/dev/null || echo missing)"
  [[ "$status" == "healthy" ]] && break
  sleep 2
done
status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' clara-postgres 2>/dev/null || echo missing)"
echo "Postgres health: ${status}"
[[ "$status" == "healthy" ]] || { docker compose logs --tail=100 postgres; exit 1; }

POSTGRES_USER="$(grep -E '^[[:space:]]*POSTGRES_USER=' .env | head -1 | cut -d= -f2- | tr -d " \"'" || true)"
POSTGRES_DB="$(grep -E '^[[:space:]]*POSTGRES_DB=' .env | head -1 | cut -d= -f2- | tr -d " \"'" || true)"
POSTGRES_USER="${POSTGRES_USER:-clara_user}"
POSTGRES_DB="${POSTGRES_DB:-clara_db}"

echo "==> Apply pgvector schema"
docker exec -i clara-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${REPO_ROOT}/scripts/db/init_pgvector.sql"
docker exec clara-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"

echo "==> Python venv + backend deps (as ${TARGET_USER})"
runuser -u "${TARGET_USER}" -- bash -lc "
  set -euo pipefail
  cd '${REPO_ROOT}'
  if [[ ! -d .venv ]]; then
    python3 -m venv .venv
  fi
  .venv/bin/pip install -U pip
  .venv/bin/pip install -r backend/requirements/requirements.txt
"

echo "==> Frontend npm deps (as ${TARGET_USER})"
runuser -u "${TARGET_USER}" -- bash -lc "
  set -euo pipefail
  cd '${REPO_ROOT}/frontend'
  if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
"

echo "==> Facial-display uses frontend/node_modules (vite via package.json)"
# facial-display package.json points at ../frontend/node_modules/vite — no separate install required
# unless a local node_modules symlink is expected; create if missing
if [[ ! -e facial-display/node_modules ]]; then
  runuser -u "${TARGET_USER}" -- bash -lc "
    cd '${REPO_ROOT}/facial-display'
    ln -sfn ../frontend/node_modules node_modules
  "
  echo "Linked facial-display/node_modules -> ../frontend/node_modules"
fi

echo "==> Frontend .env.local (WS URL) if missing"
if [[ ! -f frontend/.env.local ]]; then
  if [[ -f frontend/.env.example ]]; then
    runuser -u "${TARGET_USER}" -- cp frontend/.env.example frontend/.env.local
    echo "Created frontend/.env.local from .env.example"
  fi
fi

echo "==> Restart policy check"
docker inspect -f '{{.Name}} -> {{.HostConfig.RestartPolicy.Name}}' $(docker ps -aq)

echo
echo "=== DONE ==="
echo "Docker:     $(docker --version)"
echo "Compose:    $(docker compose version)"
echo "Daemon:     enabled=$(systemctl is-enabled docker) active=$(systemctl is-active docker)"
echo "Postgres:   healthy on 127.0.0.1:5432"
echo "Backend venv + frontend node_modules installed."
echo
echo "Start apps (as ${TARGET_USER}, after re-login if docker group was just added):"
echo "  cd ${REPO_ROOT} && .venv/bin/python -m backend.main"
echo "  cd ${REPO_ROOT}/frontend && npm run dev"
echo "  cd ${REPO_ROOT}/facial-display && npm run dev"
echo
echo "URLs: http://localhost:5176  http://localhost:5177  http://localhost:6969/health"
