#!/usr/bin/env bash
# CLARA Ubuntu kiosk — Docker + Postgres/pgvector host prep (idempotent).
# Run as: sudo bash scripts/ubuntu-kiosk-docker-setup.sh
# Scope: official Docker Engine + compose plugin + CLARA postgres service only.
# Frontend/backend/facial-display are host Node/Python apps (not in docker-compose.yml).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/ubuntu-kiosk-docker-setup.sh" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${REPO_ROOT}"

TARGET_USER="${SUDO_USER:-clara}"
if ! id "${TARGET_USER}" &>/dev/null; then
  TARGET_USER="$(logname 2>/dev/null || true)"
fi
if [[ -z "${TARGET_USER}" || "${TARGET_USER}" == "root" ]]; then
  TARGET_USER="clara"
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Phase 2: base packages"
apt-get update -y || { echo "apt-get update failed" >&2; exit 1; }
apt-get install -y ca-certificates curl git gnupg jq unzip || { echo "base package install failed" >&2; exit 1; }

echo "==> Phase 3: Docker Engine (official apt repo)"
# Remove conflicting packages if present (safe; does not touch volumes/data)
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  if dpkg -l "$pkg" 2>/dev/null | grep -q '^ii'; then
    echo "Removing conflicting package: $pkg"
    apt-get remove -y "$pkg" || true
  fi
done
if snap list docker &>/dev/null; then
  echo "ERROR: Snap Docker is installed. Remove it first: sudo snap remove docker" >&2
  exit 1
fi

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

. /etc/os-release
DOCKER_SUITE="${VERSION_CODENAME}"
# Ubuntu 26.04 (resolute) may not be published on download.docker.com yet — fall back to noble.
if ! curl -fsI "https://download.docker.com/linux/ubuntu/dists/${DOCKER_SUITE}/Release" >/dev/null 2>&1; then
  echo "Docker apt suite '${DOCKER_SUITE}' not published; falling back to 'noble'"
  DOCKER_SUITE="noble"
fi

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${DOCKER_SUITE} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

echo "Docker enabled: $(systemctl is-enabled docker)"
echo "Docker active:  $(systemctl is-active docker)"
docker --version
docker compose version

echo "==> Phase 4: non-root docker group for ${TARGET_USER}"
if id -nG "${TARGET_USER}" | tr ' ' '\n' | grep -qx docker; then
  echo "User ${TARGET_USER} already in docker group"
else
  usermod -aG docker "${TARGET_USER}"
  echo "Added ${TARGET_USER} to docker group (logout/login or reboot required for new shells)"
fi

echo "==> Phase 5/6: env + compose validation"
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    echo "Missing .env and .env.example" >&2
    exit 1
  fi
fi

if ! grep -qE '^[[:space:]]*POSTGRES_PASSWORD=[^[:space:]#]+' .env; then
  GEN="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  if grep -qE '^[[:space:]]*POSTGRES_PASSWORD=' .env; then
    sed -i "s|^[[:space:]]*POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${GEN}|" .env
  else
    echo "POSTGRES_PASSWORD=${GEN}" >> .env
  fi
  chown "${TARGET_USER}:${TARGET_USER}" .env 2>/dev/null || true
  chmod 600 .env 2>/dev/null || true
  echo "POSTGRES_PASSWORD was empty — generated a random value and wrote it to .env (not printed)"
fi

docker compose config >/dev/null
echo "docker compose config: OK"

echo "==> Phase 7/8: pull/start postgres"
# No app Dockerfiles in this repo; compose only defines postgres (pull + start).
docker compose up -d
docker compose ps
docker ps

echo "==> Phase 9: wait healthy + apply pgvector schema"
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' clara-postgres 2>/dev/null || echo missing)"
  [[ "$status" == "healthy" ]] && break
  sleep 2
done
status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' clara-postgres 2>/dev/null || echo missing)"
echo "Postgres health: ${status}"
if [[ "$status" != "healthy" ]]; then
  docker compose logs --tail=100 postgres || true
  exit 1
fi

POSTGRES_USER="$(grep -E '^[[:space:]]*POSTGRES_USER=' .env | head -1 | cut -d= -f2- | tr -d " \"'" || true)"
POSTGRES_DB="$(grep -E '^[[:space:]]*POSTGRES_DB=' .env | head -1 | cut -d= -f2- | tr -d " \"'" || true)"
POSTGRES_USER="${POSTGRES_USER:-clara_user}"
POSTGRES_DB="${POSTGRES_DB:-clara_db}"
docker exec -i clara-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "${REPO_ROOT}/scripts/db/init_pgvector.sql"
docker exec clara-postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"
docker volume ls | grep -E 'clara_pgdata|clara' || docker volume ls

echo "==> Phase 10/12: restart policies + final checks"
# docker-compose.yml already has restart: unless-stopped for postgres
docker compose up -d
docker inspect -f '{{.Name}} -> {{.HostConfig.RestartPolicy.Name}}' $(docker ps -aq) 2>/dev/null || true

echo
echo "=== SETUP COMPLETE (Docker / Postgres) ==="
echo "Docker:           $(docker --version)"
echo "Compose:          $(docker compose version)"
echo "Daemon enabled:   $(systemctl is-enabled docker)"
echo "Daemon active:    $(systemctl is-active docker)"
echo "Containers:"
docker compose ps
echo
echo "NOTE: Frontend (:5176), facial-display (:5177), and backend (:6969) are NOT Docker services."
echo "They require host Node.js/Python and are out of this Docker-only setup."
echo "After adding ${TARGET_USER} to docker group, log out/in (or reboot) then:"
echo "  docker run --rm hello-world"
echo "  docker compose -f ${REPO_ROOT}/docker-compose.yml ps"
