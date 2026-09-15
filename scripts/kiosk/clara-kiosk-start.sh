#!/usr/bin/env bash
# CLARA dual-display kiosk launcher (GNOME session).
#
# Face runs as its OWN Chrome --kiosk window (no title bar / min / max / close).
# Lip-sync uses backend /ws/face-bridge (no window.opener required).
set -euo pipefail

ROOT="${CLARA_ROOT:-$HOME/CLARA_LAUNCH/CLARA-LAUNCH}"
if [[ ! -f "$ROOT/docker-compose.yml" ]]; then
  ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fi

LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/clara-kiosk"
LOCK_DIR="${XDG_RUNTIME_DIR:-/tmp}/clara-kiosk"
PROFILE_MAIN="${XDG_CONFIG_HOME:-$HOME/.config}/clara-chrome-main"
PROFILE_FACE="${XDG_CONFIG_HOME:-$HOME/.config}/clara-chrome-face"
GEOMETRY_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/clara-kiosk/display-geometry.env"
MAIN_URL="${CLARA_MAIN_URL:-http://127.0.0.1:5176/?kioskFace=1&faceBridge=1}"
FACE_URL="${CLARA_FACE_URL:-http://127.0.0.1:5177/?kiosk=1&bridge=1}"
CHROME_BIN="${CLARA_CHROME_BIN:-}"

mkdir -p "$LOG_DIR" "$LOCK_DIR" "$(dirname "$GEOMETRY_FILE")" "$PROFILE_MAIN" "$PROFILE_FACE"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG_DIR/kiosk.log"; }

apply_display_brightness() {
  local bright main_conn face_conn
  bright="${CLARA_DISPLAY_BRIGHTNESS:-}"
  if [[ -z "$bright" && -f "$GEOMETRY_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$GEOMETRY_FILE"
    bright="${CLARA_DISPLAY_BRIGHTNESS:-3.0}"
  fi
  bright="${bright:-3.0}"
  CLARA_DISPLAY_BRIGHTNESS="$bright"
  main_conn="${CLARA_MAIN_CONNECTOR:-HDMI-2}"
  face_conn="${CLARA_FACE_CONNECTOR:-HDMI-1}"
  if [[ -f "$GEOMETRY_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$GEOMETRY_FILE"
    main_conn="${CLARA_MAIN_CONNECTOR:-$main_conn}"
    face_conn="${CLARA_FACE_CONNECTOR:-$face_conn}"
    bright="${CLARA_DISPLAY_BRIGHTNESS:-$bright}"
  fi
  if command -v xrandr >/dev/null 2>&1; then
    log "applying display brightness ${bright} on ${main_conn} ${face_conn}"
    xrandr --output "$main_conn" --brightness "$bright" 2>/dev/null || true
    xrandr --output "$face_conn" --brightness "$bright" 2>/dev/null || true
  fi
  if [[ -f "$GEOMETRY_FILE" ]]; then
    if grep -q '^CLARA_DISPLAY_BRIGHTNESS=' "$GEOMETRY_FILE"; then
      sed -i "s/^CLARA_DISPLAY_BRIGHTNESS=.*/CLARA_DISPLAY_BRIGHTNESS=${bright}/" "$GEOMETRY_FILE"
    else
      echo "CLARA_DISPLAY_BRIGHTNESS=${bright}" >>"$GEOMETRY_FILE"
    fi
  fi
}



map_main_touch() {
  local script="$ROOT/scripts/kiosk/clara-map-main-touch.sh"
  if [[ ! -x "$script" ]]; then
    script="${HOME}/.local/bin/clara-map-main-touch.sh"
  fi
  if [[ -x "$script" ]]; then
    log "mapping ILITEK main touch → primary panel"
    bash "$script" >>"$LOG_DIR/kiosk.log" 2>&1 || log "WARNING: main touch map failed (see map-main-touch.log)"
  else
    log "WARNING: clara-map-main-touch.sh not found"
  fi
}


apply_speaker_volume() {
  local vol="${CLARA_SPEAKER_VOLUME:-2.0}"
  if ! command -v wpctl >/dev/null 2>&1; then
    log "WARNING: wpctl not found — cannot set speaker volume"
    return 0
  fi
  log "setting speaker volume to ${vol} (200%=2.0) and unmuting"
  wpctl set-volume @DEFAULT_AUDIO_SINK@ "$vol" 2>/dev/null || true
  wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 2>/dev/null || true
  # Prefer EMEET USB speaker if present
  local sink
  sink=$(wpctl status 2>/dev/null | awk '/Sinks:/{p=1;next} /Sources:/{p=0} p && /EMEET/{gsub(/[^0-9]/,"",$1); print $1; exit}')
  if [[ -n "${sink:-}" ]]; then
    wpctl set-default "$sink" 2>/dev/null || true
    wpctl set-volume "$sink" "$vol" 2>/dev/null || true
    wpctl set-mute "$sink" 0 2>/dev/null || true
    log "EMEET sink ${sink} set to volume ${vol}"
  fi
}

# Brightness + touch map + speaker volume before lock so early exits still apply
apply_display_brightness
map_main_touch
apply_speaker_volume

exec 9>"$LOCK_DIR/start.lock"
if ! flock -n 9; then
  log "another kiosk starter holds the lock — exiting"
  exit 0
fi

# Refresh monitor geometry (best-effort)
if command -v gdctl >/dev/null 2>&1; then
  gdctl show >"${XDG_CONFIG_HOME:-$HOME/.config}/clara-kiosk/gdctl-show.txt" 2>/dev/null || true
fi
if command -v xrandr >/dev/null 2>&1; then
  xrandr --query >"${XDG_CONFIG_HOME:-$HOME/.config}/clara-kiosk/xrandr.txt" 2>/dev/null || true
fi
# Parse xrandr into geometry file when possible
python3 - "$GEOMETRY_FILE" <<'PY' || true
import re, sys
from pathlib import Path
geom = Path(sys.argv[1])
xr_path = geom.parent / "xrandr.txt"
monitors = []
if xr_path.exists():
    for line in xr_path.read_text().splitlines():
        m = re.match(r'^(\S+)\s+connected(?:\s+primary)?\s+(\d+)x(\d+)\+(\d+)\+(\d+)', line)
        if m:
            monitors.append({
                "name": m.group(1),
                "w": int(m.group(2)), "h": int(m.group(3)),
                "x": int(m.group(4)), "y": int(m.group(5)),
                "primary": " primary " in f" {line} ",
            })
if not monitors:
    raise SystemExit(0)
by_y = sorted(monitors, key=lambda m: (m["y"], m["x"]))
if len(by_y) == 1:
    main = by_y[0]
    face = None
else:
    ys = [m["y"] for m in by_y]
    if max(ys) != min(ys):
        face = min(by_y, key=lambda m: m["y"])
        main = max(by_y, key=lambda m: m["y"])
    else:
        main = min(by_y, key=lambda m: m["x"])
        face = max(by_y, key=lambda m: m["x"])
bright = __import__("os").environ.get("CLARA_DISPLAY_BRIGHTNESS", "3.0")
# Keep existing brightness from geom if present and env not set
if "CLARA_DISPLAY_BRIGHTNESS" not in __import__("os").environ and geom.exists():
    for line in geom.read_text().splitlines():
        if line.startswith("CLARA_DISPLAY_BRIGHTNESS="):
            bright = line.split("=", 1)[1].strip() or bright
            break
lines = [
    f"CLARA_MAIN_CONNECTOR={main['name']}",
    f"CLARA_MAIN_POS={main['x']},{main['y']}",
    f"CLARA_MAIN_SIZE={main['w']},{main['h']}",
]
if face:
    lines += [
        f"CLARA_FACE_CONNECTOR={face['name']}",
        f"CLARA_FACE_POS={face['x']},{face['y']}",
        f"CLARA_FACE_SIZE={face['w']},{face['h']}",
    ]
lines.append(f"CLARA_DISPLAY_BRIGHTNESS={bright}")
geom.write_text("\n".join(lines) + "\n")
print("geometry:", *lines, sep="\n")
PY

# Re-apply after geometry refresh (connectors may have changed)
apply_display_brightness
map_main_touch
apply_speaker_volume

if pgrep -f -- "--user-data-dir=$PROFILE_MAIN" >/dev/null 2>&1 \
  || pgrep -f -- "--user-data-dir=$PROFILE_FACE" >/dev/null 2>&1; then
  log "CLARA Chrome kiosk already running — not launching duplicates"
  exit 0
fi

for _ in $(seq 1 90); do
  if [[ -n "${WAYLAND_DISPLAY:-}${DISPLAY:-}" ]]; then break; fi
  sleep 1
done

log "waiting for postgres TCP :5432"
for _ in $(seq 1 90); do
  if python3 -c 'import socket;s=socket.socket();s.settimeout(1);s.connect(("127.0.0.1",5432))' 2>/dev/null; then
    log "postgres up"
    break
  fi
  sleep 2
done

log "ensuring CLARA host services"
# Prefer systemd --user units when available (installed by clara-kiosk-finalize.sh)
if systemctl --user is-enabled clara-backend.service >/dev/null 2>&1; then
  systemctl --user start clara-backend.service clara-frontend.service clara-facial.service || true
else
  bash "$ROOT/scripts/kiosk/clara-services-start.sh"
fi
# Always wait for HTTP readiness (whether systemd or nohup started them)
wait_url() {
  local url="$1" name="$2"
  local i
  for i in $(seq 1 90); do
    if curl -fsS -o /dev/null --max-time 2 "$url"; then
      log "$name ready"
      return 0
    fi
    sleep 2
  done
  log "ERROR: $name not ready: $url"
  return 1
}
wait_url "http://127.0.0.1:6969/health" "backend"
wait_url "http://127.0.0.1:5176/" "frontend"
wait_url "http://127.0.0.1:5177/" "facial"

if [[ -z "$CHROME_BIN" ]]; then
  for c in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then CHROME_BIN="$(command -v "$c")"; break; fi
  done
fi
[[ -n "$CHROME_BIN" ]] || { log "ERROR: Chrome not found"; exit 1; }
log "browser: $CHROME_BIN"

MAIN_POS="0,0"
MAIN_SIZE="1600,900"
FACE_POS=""
FACE_SIZE=""
if [[ -f "$GEOMETRY_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$GEOMETRY_FILE"
  MAIN_POS="${CLARA_MAIN_POS:-$MAIN_POS}"
  MAIN_SIZE="${CLARA_MAIN_SIZE:-$MAIN_SIZE}"
  FACE_POS="${CLARA_FACE_POS:-}"
  FACE_SIZE="${CLARA_FACE_SIZE:-}"
fi

COMMON_ARGS=(
  --no-first-run
  --no-default-browser-check
  --disable-session-crashed-bubble
  --disable-features=TouchpadOverscrollHistoryNavigation,TranslateUI
  --disable-translate
  --disable-notifications
  --disable-popup-blocking
  --autoplay-policy=no-user-gesture-required
  --check-for-update-interval=31536000
  --ozone-platform=x11
  --disable-pinch
  --overscroll-history-navigation=0
)

log "launching MAIN kiosk $MAIN_URL @ $MAIN_POS size $MAIN_SIZE"
# Close flock fd in child so Chrome does not hold start.lock
"$CHROME_BIN" \
  "${COMMON_ARGS[@]}" \
  --user-data-dir="$PROFILE_MAIN" \
  --class=ClaraKioskMain \
  --window-position="${MAIN_POS}" \
  --window-size="${MAIN_SIZE%%,*}x${MAIN_SIZE##*,}" \
  --kiosk \
  --app="$MAIN_URL" \
  >>"$LOG_DIR/chrome-main.log" 2>&1 9>&- &
echo $! >"$LOG_DIR/chrome-main.pid"

if [[ -n "$FACE_POS" && -n "$FACE_SIZE" ]]; then
  log "launching FACE kiosk (no title bar) $FACE_URL @ $FACE_POS size $FACE_SIZE"
  "$CHROME_BIN" \
    "${COMMON_ARGS[@]}" \
    --user-data-dir="$PROFILE_FACE" \
    --class=ClaraKioskFace \
    --window-position="${FACE_POS}" \
    --window-size="${FACE_SIZE%%,*}x${FACE_SIZE##*,}" \
    --kiosk \
    --app="$FACE_URL" \
    >>"$LOG_DIR/chrome-face.log" 2>&1 9>&- &
  echo $! >"$LOG_DIR/chrome-face.pid"
else
  log "WARNING: GNOME currently reports only ONE monitor (see gdctl-show.txt / xrandr.txt)."
  log "For a true secondary face panel: plug in the UPPER display, set Extended mode, then re-run."
  log "Not launching a second --kiosk on the same screen (would cover main)."
fi

log "done — main pid $(cat "$LOG_DIR/chrome-main.pid")"
if [[ -f "$LOG_DIR/chrome-face.pid" ]]; then
  log "face pid $(cat "$LOG_DIR/chrome-face.pid")"
fi
