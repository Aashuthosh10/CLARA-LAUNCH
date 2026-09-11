#!/usr/bin/env bash
# Detect / force-enable second display (WaveShare mini HDMI) and wire CLARA facial kiosk.
# WaveShare kits expose:
#   - HDMI  → video (must hit a free PC HDMI/DP port)
#   - USB   → touch only (WS170120 already appears when USB is plugged)
#
# Run as:
#   sudo -E bash scripts/kiosk/wire-second-display.sh
# Then (as clara, no sudo):
#   ~/.local/bin/clara-kiosk-start
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REAL_USER="${SUDO_USER:-clara}"
HOME_DIR="$(getent passwd "$REAL_USER" | cut -d: -f6)"
KIOSK_CFG="$HOME_DIR/.config/clara-kiosk"
GEOM="$KIOSK_CFG/display-geometry.env"
LOG="$KIOSK_CFG/wire-second-display.log"
mkdir -p "$KIOSK_CFG"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo -E bash $0" >&2
  exit 1
fi

log "=== DRM connectors before force ==="
for f in /sys/class/drm/card*-*/status; do
  log "$f = $(cat "$f")"
done

log "=== Force detect on all disconnected connectors ==="
for f in /sys/class/drm/card*-*/status; do
  st=$(cat "$f")
  if [[ "$st" == "disconnected" ]]; then
    echo detect >"$f" 2>/dev/null || echo on >"$f" 2>/dev/null || true
  fi
done
sleep 2
udevadm trigger --subsystem-match=drm --action=change 2>/dev/null || true
sleep 1

log "=== DRM connectors after force ==="
CONNECTED=()
for f in /sys/class/drm/card*-*/status; do
  name=$(basename "$(dirname "$f")")
  st=$(cat "$f")
  log "$name = $st (edid=$(wc -c <"$(dirname "$f")/edid") bytes)"
  if [[ "$st" == "connected" ]]; then
    CONNECTED+=("$name")
  fi
done

log "=== USB touch (WaveShare / ILITEK) ==="
lsusb | grep -iE 'WaveShare|ILI|0eef|222a' | tee -a "$LOG" || true

# Prefer user session tools
export DISPLAY="${DISPLAY:-:0}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u "$REAL_USER")}"
if [[ -S "$XDG_RUNTIME_DIR/bus" ]]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
fi

log "=== gdctl / xrandr as $REAL_USER ==="
runuser -u "$REAL_USER" -- env DISPLAY="$DISPLAY" XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  gdctl show 2>&1 | tee "$KIOSK_CFG/gdctl-show.txt" | tee -a "$LOG" || true
runuser -u "$REAL_USER" -- env DISPLAY="$DISPLAY" xrandr --query 2>&1 \
  | tee "$KIOSK_CFG/xrandr.txt" | tee -a "$LOG" || true

# Parse connected outputs from xrandr
mapfile -t XR < <(runuser -u "$REAL_USER" -- env DISPLAY="$DISPLAY" xrandr --query 2>/dev/null \
  | awk '/ connected/{print}' || true)

log "xrandr connected lines: ${#XR[@]}"
for line in "${XR[@]:-}"; do log "  $line"; done

if [[ ${#XR[@]} -lt 2 ]]; then
  cat <<EOF | tee -a "$LOG"

============================================================
SECOND VIDEO OUTPUT STILL NOT DETECTED
============================================================
What Ubuntu sees:
  - Video: only ONE connector with EDID (usually HDMI-1 / RTK 24")
  - Touch: WaveShare WS170120 USB is present (touch-only)
  - HDMI-2 / DP ports: disconnected (0-byte EDID)

WaveShare mini panels need TWO cables:
  1) HDMI  (or HDMI→DP) from the mini panel into a FREE PC video port
  2) USB   from the mini panel into USB (already working for touch)

Software cannot invent a second monitor without a video signal.

Fix physically, then re-run this script:
  - Power ON the mini display
  - Plug mini HDMI into the PC's second HDMI (or DP with adapter)
  - Do NOT use a splitter that only mirrors one EDID
  - In Settings → Displays: Join Displays / Extended (not Mirror)

USB touch alone is NOT enough for a second fullscreen face window.
============================================================
EOF
  exit 2
fi

# Build geometry: lower/main = larger Y or primary; upper/face = other
python3 - "$GEOM" "$KIOSK_CFG/xrandr.txt" <<'PY'
import re, sys
from pathlib import Path
geom_path, xr_path = Path(sys.argv[1]), Path(sys.argv[2])
monitors=[]
for line in xr_path.read_text().splitlines():
    m=re.match(r'^(\S+)\s+connected(?:\s+primary)?\s+(\d+)x(\d+)\+(\d+)\+(\d+)', line)
    if m:
        monitors.append({
            "name": m.group(1),
            "w": int(m.group(2)), "h": int(m.group(3)),
            "x": int(m.group(4)), "y": int(m.group(5)),
            "primary": " primary " in f" {line} ",
        })
if len(monitors) < 2:
    raise SystemExit("parse found <2 monitors")
# Prefer vertical stack: upper=min y, lower=max y
ys=[m["y"] for m in monitors]
if max(ys) != min(ys):
    face=min(monitors, key=lambda m: m["y"])
    main=max(monitors, key=lambda m: m["y"])
else:
    # side-by-side: smaller panel likely face (WaveShare), larger = main
    ordered=sorted(monitors, key=lambda m: m["w"]*m["h"])
    face, main = ordered[0], ordered[-1]
lines=[
    f"CLARA_MAIN_CONNECTOR={main['name']}",
    f"CLARA_MAIN_POS={main['x']},{main['y']}",
    f"CLARA_MAIN_SIZE={main['w']},{main['h']}",
    f"CLARA_FACE_CONNECTOR={face['name']}",
    f"CLARA_FACE_POS={face['x']},{face['y']}",
    f"CLARA_FACE_SIZE={face['w']},{face['h']}",
]
geom_path.write_text("\n".join(lines)+"\n")
print("\n".join(lines))
PY
chown "$REAL_USER:$REAL_USER" "$GEOM"
log "Wrote $GEOM"

# Disable WaveShare face/mini touch; map ILITEK to main (shared helper)
FACE_OUT=$(grep CLARA_FACE_CONNECTOR= "$GEOM" | cut -d= -f2)
MAIN_OUT=$(grep CLARA_MAIN_CONNECTOR= "$GEOM" | cut -d= -f2)
log "Assigning WaveShare touch → $FACE_OUT (ignored) ; ILITEK touch → $MAIN_OUT"
CLARA_FACE_CONNECTOR="$FACE_OUT" CLARA_MAIN_CONNECTOR="$MAIN_OUT" \
  bash "$ROOT/scripts/kiosk/clara-disable-face-touch.sh"
log "Installed face-touch disable via clara-disable-face-touch.sh"

# Sync face window env into frontend .env.local
runuser -u "$REAL_USER" -- python3 - "$ROOT" "$GEOM" <<'PY'
from pathlib import Path
import re, sys
root, geom = Path(sys.argv[1]), Path(sys.argv[2])
env={}
for line in geom.read_text().splitlines():
    if '=' in line:
        k,v=line.split('=',1); env[k]=v
pos=env['CLARA_FACE_POS'].split(',')
size=env['CLARA_FACE_SIZE'].split(',')
path=root/'frontend'/'.env.local'
text=path.read_text() if path.exists() else ''
def upsert(text,key,val):
    if re.search(rf'^{re.escape(key)}=', text, re.M):
        return re.sub(rf'^{re.escape(key)}=.*$', f'{key}={val}', text, count=1, flags=re.M)
    return text.rstrip()+f'\n{key}={val}\n'
for k,v in {
    'VITE_FACE_EXTERNAL_KIOSK':'true',
    'VITE_FACE_BRIDGE_URL':'ws://127.0.0.1:6969/ws/face-bridge?role=main',
    'VITE_FACE_ORIGIN':'http://127.0.0.1:5177',
    'VITE_FACE_WINDOW_LEFT':pos[0],
    'VITE_FACE_WINDOW_TOP':pos[1],
    'VITE_FACE_WINDOW_WIDTH':size[0],
    'VITE_FACE_WINDOW_HEIGHT':size[1],
}.items():
    text=upsert(text,k,v)
path.write_text(text)
print('updated', path)
PY

log "Ensuring GNOME extended layout (join) if gdctl can set"
# Best-effort: do not fail if gdctl layout commands differ by version
runuser -u "$REAL_USER" -- env DISPLAY="$DISPLAY" XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  bash -lc 'gdctl show' >/dev/null 2>&1 || true

log "Launch facial + main kiosk as $REAL_USER"
# Kill old single-profile kiosk if any
pkill -u "$REAL_USER" -f 'clara-chrome-kiosk' 2>/dev/null || true
pkill -u "$REAL_USER" -f 'clara-chrome-main' 2>/dev/null || true
pkill -u "$REAL_USER" -f 'clara-chrome-face' 2>/dev/null || true
sleep 1
bash "$ROOT/scripts/kiosk/sync-user-bin.sh"
runuser -u "$REAL_USER" -- env DISPLAY="$DISPLAY" XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  bash "$HOME_DIR/.local/bin/clara-kiosk-start" || \
runuser -u "$REAL_USER" -- env DISPLAY="$DISPLAY" XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
  bash "$ROOT/scripts/kiosk/clara-kiosk-start.sh"

log "DONE — check both screens. Log: $LOG"
cat "$GEOM"
