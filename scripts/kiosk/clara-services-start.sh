#!/usr/bin/env bash
# Start CLARA host processes (not in Docker): backend + frontend + facial-display.
# Idempotent: skips launch if the port is already listening.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Prefer explicit CLARA_ROOT. When this script is copied into ~/.local/bin,
# dirname/../.. is $HOME — never treat that as the repo.
if [[ -n "${CLARA_ROOT:-}" && -d "${CLARA_ROOT}" ]]; then
  ROOT="$CLARA_ROOT"
elif [[ "$SCRIPT_DIR" == */scripts/kiosk ]]; then
  ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
elif [[ -x "$HOME/CLARA_LAUNCH/CLARA-LAUNCH/.venv/bin/python" ]]; then
  ROOT="$HOME/CLARA_LAUNCH/CLARA-LAUNCH"
elif [[ -x "/home/clara/CLARA_LAUNCH/CLARA-LAUNCH/.venv/bin/python" ]]; then
  ROOT="/home/clara/CLARA_LAUNCH/CLARA-LAUNCH"
else
  ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/clara-kiosk"
mkdir -p "$LOG_DIR"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG_DIR/services.log"; }

port_open() {
  local port="$1"
  ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port" && return 0
  # fallback
  python3 - "$port" <<'PY'
import socket,sys
p=int(sys.argv[1]); s=socket.socket(); s.settimeout(0.5)
try:
  s.connect(("127.0.0.1",p)); sys.exit(0)
except Exception:
  sys.exit(1)
PY
}

wait_http() {
  local url="$1" name="$2" tries="${3:-90}"
  local i
  for i in $(seq 1 "$tries"); do
    if curl -fsS -o /dev/null --max-time 2 "$url"; then
      log "$name ready: $url"
      return 0
    fi
    sleep 2
  done
  log "ERROR: $name not ready after ${tries} tries: $url"
  return 1
}

export PATH="$ROOT/.node/bin:${PATH:-}"
export CLARA_ROOT="$ROOT"
cd "$ROOT"
log "CLARA_ROOT=$ROOT"

# Backend
if port_open 6969; then
  log "backend already on :6969"
else
  if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
    log "ERROR: missing $ROOT/.venv — run clara-post-docker-deps.sh first"
    exit 1
  fi
  log "starting backend"
  nohup "$ROOT/.venv/bin/python" -m backend.main >>"$LOG_DIR/backend.log" 2>&1 &
  echo $! >"$LOG_DIR/backend.pid"
fi

# Frontend
if port_open 5176; then
  log "frontend already on :5176"
else
  log "starting frontend"
  nohup npm --prefix "$ROOT/frontend" run dev >>"$LOG_DIR/frontend.log" 2>&1 &
  echo $! >"$LOG_DIR/frontend.pid"
fi

# Facial display
if port_open 5177; then
  log "facial-display already on :5177"
else
  log "starting facial-display"
  nohup npm --prefix "$ROOT/facial-display" run dev >>"$LOG_DIR/facial.log" 2>&1 &
  echo $! >"$LOG_DIR/facial.pid"
fi

# Backend must be healthy before we treat the kiosk as ready.
wait_http "http://127.0.0.1:6969/health" "backend" 90
wait_http "http://127.0.0.1:5176/" "frontend" 90
wait_http "http://127.0.0.1:5177/" "facial" 90
log "services start complete"
