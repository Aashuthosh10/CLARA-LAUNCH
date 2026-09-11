#!/usr/bin/env bash
# Finalize CLARA kiosk host configuration. Run as user clara:
#   bash scripts/kiosk/clara-kiosk-finalize.sh
# Will prompt for sudo where needed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
USER_NAME="$(id -un)"
HOME_DIR="$(getent passwd "$USER_NAME" | cut -d: -f6)"
UNIT_DIR="$HOME_DIR/.config/systemd/user"
AUTO_DIR="$HOME_DIR/.config/autostart"
BIN_DIR="$HOME_DIR/.local/bin"
LOG_DIR="${XDG_STATE_HOME:-$HOME_DIR/.local/state}/clara-kiosk"
KIOSK_CFG="$HOME_DIR/.config/clara-kiosk"
REPORT="$ROOT/scripts/kiosk/.pre-reboot-validation.txt"

mkdir -p "$UNIT_DIR" "$AUTO_DIR" "$BIN_DIR" "$LOG_DIR" "$KIOSK_CFG"

echo "==> Sync launchers"
bash "$ROOT/scripts/kiosk/sync-user-bin.sh"

echo "==> graphical.target + GDM enable"
if [[ "$(systemctl get-default)" != "graphical.target" ]]; then
  sudo systemctl set-default graphical.target
fi
# Ubuntu 26 uses gdm.service (gdm3 package)
sudo systemctl enable gdm.service 2>/dev/null || sudo systemctl enable gdm3.service 2>/dev/null || true
sudo systemctl enable docker.service
sudo systemctl enable containerd.service

echo "==> GNOME kiosk lockdown (as $USER_NAME)"
bash "$ROOT/scripts/kiosk/clara-kiosk-gnome-lockdown.sh"

echo "==> Disable WaveShare mini/face touch (udev)"
sudo -E bash "$ROOT/scripts/kiosk/clara-disable-face-touch.sh"

echo "==> Ensure GDM auto-login for $USER_NAME"
GDM_CONF=/etc/gdm3/custom.conf
if [[ -f "$GDM_CONF" ]]; then
  if ! grep -qE "^AutomaticLoginEnable\s*=\s*true" "$GDM_CONF" \
     || ! grep -qE "^AutomaticLogin\s*=\s*$USER_NAME\s*$" "$GDM_CONF"; then
    sudo cp -a "$GDM_CONF" "$GDM_CONF.bak.clara.$(date +%s)"
    sudo python3 - "$GDM_CONF" "$USER_NAME" <<'PY'
import sys
path, user = sys.argv[1], sys.argv[2]
lines = open(path).read().splitlines(True)
out=[]; in_daemon=False; seen_e=False; seen_u=False
for line in lines:
    if line.strip().startswith('[daemon]'):
        in_daemon=True; out.append(line); continue
    if in_daemon and line.strip().startswith('['):
        if not seen_e: out.append('AutomaticLoginEnable=true\n')
        if not seen_u: out.append(f'AutomaticLogin={user}\n')
        in_daemon=False
    if in_daemon and line.strip().startswith('AutomaticLoginEnable'):
        out.append('AutomaticLoginEnable=true\n'); seen_e=True; continue
    if in_daemon and line.strip().startswith('AutomaticLogin') and 'Enable' not in line.split('=')[0]:
        out.append(f'AutomaticLogin={user}\n'); seen_u=True; continue
    out.append(line)
if in_daemon:
    if not seen_e: out.append('AutomaticLoginEnable=true\n')
    if not seen_u: out.append(f'AutomaticLogin={user}\n')
open(path,'w').writelines(out)
PY
  fi
fi

echo "==> systemd --user units for host CLARA apps (backend/frontend/face)"
# Backend
cat > "$UNIT_DIR/clara-backend.service" <<EOF
[Unit]
Description=CLARA FastAPI backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
Environment=PATH=$ROOT/.venv/bin:/usr/bin
ExecStart=$ROOT/.venv/bin/python -m backend.main
Restart=on-failure
RestartSec=3
StandardOutput=append:$LOG_DIR/backend.log
StandardError=append:$LOG_DIR/backend.log

[Install]
WantedBy=default.target
EOF

cat > "$UNIT_DIR/clara-frontend.service" <<EOF
[Unit]
Description=CLARA Vite frontend :5176
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT/frontend
Environment=PATH=/usr/bin
ExecStart=/usr/bin/npm run dev
Restart=on-failure
RestartSec=3
StandardOutput=append:$LOG_DIR/frontend.log
StandardError=append:$LOG_DIR/frontend.log

[Install]
WantedBy=default.target
EOF

cat > "$UNIT_DIR/clara-facial.service" <<EOF
[Unit]
Description=CLARA facial-display Vite :5177
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT/facial-display
Environment=PATH=/usr/bin
ExecStart=/usr/bin/npm run dev
Restart=on-failure
RestartSec=3
StandardOutput=append:$LOG_DIR/facial.log
StandardError=append:$LOG_DIR/facial.log

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable clara-backend.service clara-frontend.service clara-facial.service
systemctl --user start clara-backend.service clara-frontend.service clara-facial.service || true
# Linger so user services survive if needed before session — optional for autologin
loginctl enable-linger "$USER_NAME" 2>/dev/null || sudo loginctl enable-linger "$USER_NAME" || true

echo "==> Single GNOME autostart for Chrome kiosk only (services via systemd --user)"
cat > "$AUTO_DIR/clara-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=CLARA Kiosk
Comment=Launch CLARA Chrome kiosk after GNOME login
Exec=$BIN_DIR/clara-kiosk-start
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
OnlyShowIn=GNOME;Unity;
EOF

# Refresh monitor detection
bash "$ROOT/scripts/kiosk/clara-kiosk-inspect.sh" || true

# Update kiosk start to prefer systemctl --user for services
# (already starts via clara-services-start; keep as fallback)

echo "==> Docker compose ensure up"
cd "$ROOT"
if docker info >/dev/null 2>&1; then
  docker compose up -d
else
  sg docker -c 'docker compose up -d'
fi

echo "==> Write validation report"
{
  echo "=== PRE-REBOOT VALIDATION $(date -Is) ==="
  echo "Ubuntu: $(. /etc/os-release; echo $PRETTY_NAME)"
  echo "Kernel: $(uname -r)"
  echo "GNOME: $(gnome-shell --version 2>/dev/null)"
  echo "Session: $XDG_SESSION_TYPE / $XDG_CURRENT_DESKTOP"
  echo "graphical.target: $(systemctl get-default)"
  echo "gdm enabled: $(systemctl is-enabled gdm.service 2>/dev/null || systemctl is-enabled gdm3 2>/dev/null || echo unknown)"
  echo "gdm active: $(systemctl is-active gdm.service 2>/dev/null || echo unknown)"
  echo "auto-login: $(grep -E '^AutomaticLogin' /etc/gdm3/custom.conf | tr '\n' ' ')"
  echo "docker enabled/active: $(systemctl is-enabled docker)/$(systemctl is-active docker)"
  echo "containerd enabled/active: $(systemctl is-enabled containerd)/$(systemctl is-active containerd)"
  echo
  echo "=== Compose ==="
  if docker info >/dev/null 2>&1; then docker compose ps; else sg docker -c 'docker compose ps'; fi
  echo
  echo "=== Restart policies ==="
  if docker info >/dev/null 2>&1; then
    docker inspect -f '{{.Name}} -> {{.HostConfig.RestartPolicy.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' $(docker ps -aq) 2>/dev/null || true
  else
    sg docker -c 'docker inspect -f "{{.Name}} -> {{.HostConfig.RestartPolicy.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}" $(docker ps -aq)' 2>/dev/null || true
  fi
  echo
  echo "=== Endpoints ==="
  for u in http://127.0.0.1:5432 http://127.0.0.1:6969/health http://127.0.0.1:5176/ http://127.0.0.1:5177/; do
    if [[ "$u" == *5432 ]]; then
      python3 -c 'import socket;s=socket.socket();s.settimeout(2);s.connect(("127.0.0.1",5432));print("5432 OPEN")' 2>&1 || echo "5432 FAIL"
    else
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$u" || echo fail)
      echo "$u -> $code"
    fi
  done
  echo
  echo "=== Displays ==="
  cat "$KIOSK_CFG/display-geometry.env" 2>/dev/null || true
  echo "DRM:"
  for f in /sys/class/drm/*/status; do echo "  $f: $(cat "$f")"; done
  echo
  echo "=== gsettings sample ==="
  gsettings get org.gnome.desktop.screensaver lock-enabled 2>&1 || true
  gsettings get org.gnome.desktop.session idle-delay 2>&1 || true
  gsettings get org.gnome.desktop.notifications show-banners 2>&1 || true
  echo
  echo "=== user units ==="
  systemctl --user is-enabled clara-backend clara-frontend clara-facial 2>&1 || true
  systemctl --user is-active clara-backend clara-frontend clara-facial 2>&1 || true
  echo
  echo "=== autostart ==="
  cat "$AUTO_DIR/clara-kiosk.desktop"
  echo
  echo "=== Browser ==="
  command -v google-chrome-stable; google-chrome-stable --version
} | tee "$REPORT"

echo
echo "Wrote $REPORT"
echo "DONE finalize."
