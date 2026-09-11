#!/usr/bin/env bash
# Install CLARA production kiosk autostart on this Ubuntu/GNOME machine.
# Run as user clara (will sudo when needed):
#   bash scripts/kiosk/clara-kiosk-install.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
USER_NAME="$(id -un)"
HOME_DIR="$(getent passwd "$USER_NAME" | cut -d: -f6)"
LOG_DIR="${XDG_STATE_HOME:-$HOME_DIR/.local/state}/clara-kiosk"
BIN_DIR="$HOME_DIR/.local/bin"
AUTO_DIR="$HOME_DIR/.config/autostart"
KIOSK_CFG="$HOME_DIR/.config/clara-kiosk"
GEOM="$KIOSK_CFG/display-geometry.env"
INSPECT_OUT="$ROOT/scripts/kiosk/.inspect-out.txt"

mkdir -p "$LOG_DIR" "$BIN_DIR" "$AUTO_DIR" "$KIOSK_CFG"

echo "==> CLARA kiosk install (user=$USER_NAME root=$ROOT)"

# --- Inspect dump ---
bash "$ROOT/scripts/kiosk/clara-kiosk-inspect.sh" || true

# --- Phase 2: graphical target ---
if [[ "$(systemctl get-default)" != "graphical.target" ]]; then
  echo "Setting graphical.target"
  sudo systemctl set-default graphical.target
fi
sudo systemctl enable gdm3.service 2>/dev/null || sudo systemctl enable gdm.service 2>/dev/null || true

# --- Phase 3: GDM auto-login (preserve unrelated keys) ---
GDM_CONF=/etc/gdm3/custom.conf
if [[ -f "$GDM_CONF" ]]; then
  if grep -qE '^AutomaticLoginEnable\s*=\s*true' "$GDM_CONF" && grep -qE "^AutomaticLogin\s*=\s*$USER_NAME\s*$" "$GDM_CONF"; then
    echo "GDM auto-login already configured for $USER_NAME"
  else
    echo "Configuring GDM auto-login for $USER_NAME"
    sudo cp -a "$GDM_CONF" "$GDM_CONF.bak.clara.$(date +%s)"
    sudo python3 - "$GDM_CONF" "$USER_NAME" <<'PY'
import sys
path, user = sys.argv[1], sys.argv[2]
text = open(path).read().splitlines(True)
out=[]; in_daemon=False; seen_enable=False; seen_user=False
for line in text:
    if line.strip().startswith('[daemon]'):
        in_daemon=True; out.append(line); continue
    if in_daemon and line.strip().startswith('['):
        if not seen_enable: out.append('AutomaticLoginEnable=true\n')
        if not seen_user: out.append(f'AutomaticLogin={user}\n')
        in_daemon=False
    if in_daemon and line.strip().startswith('AutomaticLoginEnable'):
        out.append('AutomaticLoginEnable=true\n'); seen_enable=True; continue
    if in_daemon and line.strip().startswith('AutomaticLogin') and not line.strip().startswith('AutomaticLoginEnable'):
        out.append(f'AutomaticLogin={user}\n'); seen_user=True; continue
    out.append(line)
if in_daemon:
    if not seen_enable: out.append('AutomaticLoginEnable=true\n')
    if not seen_user: out.append(f'AutomaticLogin={user}\n')
open(path,'w').writelines(out)
PY
  fi
else
  echo "WARNING: $GDM_CONF missing"
fi

# --- Phase 4: GNOME kiosk lockdown (as this user) ---
echo "==> GNOME kiosk lockdown (zoom/switch/idle)"
bash "$ROOT/scripts/kiosk/clara-kiosk-gnome-lockdown.sh"

# --- Phase 5: Docker enable ---
echo "==> Ensure Docker enabled at boot"
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
systemctl is-enabled docker
systemctl is-enabled containerd

# --- Phase 6: Compose up (restart policy already unless-stopped) ---
echo "==> Ensure Postgres container running"
cd "$ROOT"
if docker info >/dev/null 2>&1; then
  docker compose up -d
  docker compose ps
else
  sg docker -c 'docker compose up -d && docker compose ps'
fi

# --- Phase 7: Detect monitors via gdctl ---
echo "==> Detect displays"
python3 - "$GEOM" <<'PY'
import json, os, re, subprocess, sys
geom_path = sys.argv[1]

def run(cmd):
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
    except Exception as e:
        return f"ERR {e}"

gd = run(["gdctl", "show"])
open(os.path.join(os.path.dirname(geom_path), "gdctl-show.txt"), "w").write(gd)

# Parse gdctl show loosely: look for Monitor / Mode / Position lines.
# Example styles vary; also try `gdctl show -v` / JSON if available.
monitors = []
cur = None
for line in gd.splitlines():
    s = line.strip()
    # Connector-like tokens DP-1, HDMI-1, eDP-1, etc.
    m = re.search(r'\b((?:eDP|DP|HDMI|DVI|VGA|USB-C|TypeC)(?:-[A-Z0-9]+)?|\S+)\b.*?(?:connected|Monitor)', s, re.I)
    if re.match(r'^(eDP|DP|HDMI|DVI)-\d+', s):
        if cur: monitors.append(cur)
        cur = {"name": s.split()[0], "raw": s}
        continue
    if cur is None:
        continue
    pm = re.search(r'(\d+)x(\d+)', s)
    if pm and "mode" not in cur:
        cur["w"], cur["h"] = int(pm.group(1)), int(pm.group(2))
    pos = re.search(r'(?:at|pos(?:ition)?)\s*[:=]?\s*(-?\d+)\s*[,x]\s*(-?\d+)', s, re.I)
    if pos:
        cur["x"], cur["y"] = int(pos.group(1)), int(pos.group(2))
    if re.search(r'\bprimary\b', s, re.I):
        cur["primary"] = True
if cur:
    monitors.append(cur)

# Fallback: xrandr
if len(monitors) < 1:
    xr = run(["xrandr", "--query"])
    open(os.path.join(os.path.dirname(geom_path), "xrandr.txt"), "w").write(xr)
    for line in xr.splitlines():
        m = re.match(r'^(\S+)\s+connected(?:\s+primary)?\s+(\d+)x(\d+)\+(\d+)\+(\d+)', line)
        if m:
            monitors.append({
                "name": m.group(1),
                "w": int(m.group(2)), "h": int(m.group(3)),
                "x": int(m.group(4)), "y": int(m.group(5)),
                "primary": " primary " in f" {line} ",
            })

# Classify lower=main (larger y, or primary), upper=face (smaller y)
if not monitors:
    print("WARNING: could not parse monitors — writing safe defaults")
    main = {"name": "UNKNOWN-MAIN", "x": 0, "y": 0, "w": 1920, "h": 1080, "primary": True}
    face = {"name": "UNKNOWN-FACE", "x": 1920, "y": 0, "w": 1920, "h": 1080}
else:
    # Prefer vertical stack: upper has smaller y
    by_y = sorted(monitors, key=lambda m: (m.get("y", 0), m.get("x", 0)))
    if len(by_y) == 1:
        main = by_y[0]
        face = None
    else:
        # If clearly stacked (different y), upper=min y, lower=max y
        ys = [m.get("y", 0) for m in by_y]
        if max(ys) != min(ys):
            face = min(by_y, key=lambda m: m.get("y", 0))
            main = max(by_y, key=lambda m: m.get("y", 0))
        else:
            # Side-by-side: leftmost = main (touch), right = face — operator should verify
            main = min(by_y, key=lambda m: m.get("x", 0))
            face = max(by_y, key=lambda m: m.get("x", 0))

lines = [
    f"CLARA_MAIN_CONNECTOR={main.get('name','')}",
    f"CLARA_MAIN_POS={main.get('x',0)},{main.get('y',0)}",
    f"CLARA_MAIN_SIZE={main.get('w',1920)},{main.get('h',1080)}",
]
if face:
    lines += [
        f"CLARA_FACE_CONNECTOR={face.get('name','')}",
        f"CLARA_FACE_POS={face.get('x',0)},{face.get('y',0)}",
        f"CLARA_FACE_SIZE={face.get('w',1920)},{face.get('h',1080)}",
    ]
open(geom_path, "w").write("\n".join(lines) + "\n")
print("Wrote", geom_path)
print("\n".join(lines))
PY

# Sync face popup geometry into frontend/.env.local (Vite)
python3 - "$ROOT" "$GEOM" <<'PY'
from pathlib import Path
import re, sys
root, geom = Path(sys.argv[1]), Path(sys.argv[2])
env = {}
for line in geom.read_text().splitlines():
    if '=' in line:
        k,v=line.split('=',1); env[k]=v
pos=env.get('CLARA_FACE_POS','1920,0').split(',')
size=env.get('CLARA_FACE_SIZE','1920,1080').split(',')
left, top = pos[0], pos[1]
w, h = size[0], size[1]
path = root/'frontend'/'.env.local'
text = path.read_text() if path.exists() else ''
def upsert(text, key, val):
    if re.search(rf'^{re.escape(key)}=', text, re.M):
        return re.sub(rf'^{re.escape(key)}=.*$', f'{key}={val}', text, count=1, flags=re.M)
    return text.rstrip()+f'\n{key}={val}\n'
for k,v in {
    'VITE_FACE_ORIGIN':'http://127.0.0.1:5177',
    'VITE_WS_URL':'ws://127.0.0.1:6969/ws/clara',
    'VITE_KIOSK_FACE_AUTOLAUNCH':'true',
    'VITE_FACE_WINDOW_LEFT':left,
    'VITE_FACE_WINDOW_TOP':top,
    'VITE_FACE_WINDOW_WIDTH':w,
    'VITE_FACE_WINDOW_HEIGHT':h,
}.items():
    text = upsert(text, k, v)
path.write_text(text)
print('Updated', path)
# facial main origin
fpath = root/'facial-display'/'.env'
ft = fpath.read_text() if fpath.exists() else ''
ft = upsert(ft, 'VITE_MAIN_ORIGIN', 'http://127.0.0.1:5176')
fpath.write_text(ft)
print('Updated', fpath)
PY

# --- Install launcher scripts into ~/.local/bin ---
echo "==> Install launchers"
install -m 0755 "$ROOT/scripts/kiosk/clara-services-start.sh" "$BIN_DIR/clara-services-start.sh"
install -m 0755 "$ROOT/scripts/kiosk/clara-kiosk-start.sh" "$BIN_DIR/clara-kiosk-start.sh"
# Wrapper with fixed ROOT
cat > "$BIN_DIR/clara-kiosk-start" <<EOF
#!/usr/bin/env bash
export CLARA_ROOT="$ROOT"
exec bash "$BIN_DIR/clara-kiosk-start.sh" "\$@"
EOF
chmod 0755 "$BIN_DIR/clara-kiosk-start"

# --- Phase 12: ONE autostart ownership (GNOME only) ---
cat > "$AUTO_DIR/clara-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=CLARA Kiosk
Comment=Start CLARA services and dual-display Chrome kiosk
Exec=$BIN_DIR/clara-kiosk-start
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=3
OnlyShowIn=GNOME;Unity;
EOF
chmod 0644 "$AUTO_DIR/clara-kiosk.desktop"
echo "Wrote $AUTO_DIR/clara-kiosk.desktop"

# --- Phase 8: disable WaveShare mini/face touch ---
echo "==> Touch devices + install WaveShare ignore udev"
if [[ -r /proc/bus/input/devices ]]; then
  awk 'BEGIN{RS="";FS="\n"} tolower($0) ~ /touch|finger|goodix|elan|wacom|waveshare|ilitek/ {print; print "----"}' /proc/bus/input/devices | tee "$KIOSK_CFG/touch-devices.txt" || true
fi
sudo -E bash "$ROOT/scripts/kiosk/clara-disable-face-touch.sh" || {
  echo "WARNING: could not install face-touch udev (need sudo); run later:"
  echo "  sudo -E bash $ROOT/scripts/kiosk/clara-disable-face-touch.sh"
}

echo
echo "=== INSTALL COMPLETE ==="
echo "Inspect:  $INSPECT_OUT"
echo "Geometry: $GEOM"
echo "Launcher: $BIN_DIR/clara-kiosk-start"
echo "Autostart:$AUTO_DIR/clara-kiosk.desktop"
echo "Logs:     $LOG_DIR"
echo
echo "Next:"
echo "  1) Review $GEOM and $KIOSK_CFG/gdctl-show.txt — confirm lower=main, upper=face"
echo "  2) Manually test: $BIN_DIR/clara-kiosk-start"
echo "  3) Tell the agent when ready for reboot test"
echo
echo "CONFIGURATION FILES READY — do not reboot until geometry/touch verified."
