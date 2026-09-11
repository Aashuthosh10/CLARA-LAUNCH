#!/usr/bin/env bash
# Dump kiosk-relevant host facts into the repo for the agent / operator.
# Run as user clara (in a graphical session):
#   bash scripts/kiosk/clara-kiosk-inspect.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${ROOT}/scripts/kiosk/.inspect-out.txt"
mkdir -p "$(dirname "$OUT")"
{
  echo "=== timestamp ==="; date -Is
  echo "=== user ==="; id; whoami
  echo "=== session ==="
  echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE-}"
  echo "XDG_CURRENT_DESKTOP=${XDG_CURRENT_DESKTOP-}"
  echo "DISPLAY=${DISPLAY-}"
  echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY-}"
  echo "XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR-}"
  echo "=== gnome ==="; gnome-shell --version 2>&1 || true
  echo "=== default target ==="; systemctl get-default
  echo "=== display-manager ==="; systemctl status display-manager --no-pager 2>&1 | head -20
  echo "=== gdm custom.conf ==="; grep -vE '^\s*#|^$' /etc/gdm3/custom.conf 2>&1 || true
  echo "=== loginctl ==="; loginctl list-sessions --no-legend; loginctl show-user "$(whoami)" 2>&1 | head -40
  echo "=== gdctl show ==="; gdctl show 2>&1 || true
  echo "=== gsettings monitors ==="
  gsettings get org.gnome.desktop.peripherals.touchscreen 2>&1 || true
  echo "=== monitors.xml ==="; ls -la ~/.config/monitors.xml 2>&1; cat ~/.config/monitors.xml 2>&1 || true
  echo "=== xrandr ==="; xrandr --query 2>&1 || true
  echo "=== xinput ==="; xinput list 2>&1 || true
  echo "=== libinput ==="; libinput list-devices 2>&1 || true
  echo "=== /proc/bus/input/devices (touch) ==="
  awk 'BEGIN{RS="";FS="\n"} /Touch|touch|ABS/ {print; print "----"}' /proc/bus/input/devices 2>&1 || true
  echo "=== gsettings idle/lock/suspend/notifications ==="
  for k in \
    org.gnome.desktop.screensaver lock-enabled \
    org.gnome.desktop.screensaver idle-activation-enabled \
    org.gnome.desktop.session idle-delay \
    org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type \
    org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type \
    org.gnome.desktop.notifications show-banners \
    org.gnome.desktop.interface enable-hot-corners
  do
    # shellcheck disable=SC2086
    set -- $k
    schema="$1"; key="$2"
    echo -n "$schema $key = "
    gsettings get "$schema" "$key" 2>&1 || echo "(missing)"
  done
  echo "=== docker ==="
  systemctl is-enabled docker; systemctl is-active docker
  systemctl is-enabled containerd; systemctl is-active containerd
  sg docker -c 'docker compose -f "'"$ROOT"'/docker-compose.yml" ps' 2>&1 || docker compose -f "$ROOT/docker-compose.yml" ps 2>&1
  sg docker -c 'docker inspect -f "{{.Name}} -> {{.HostConfig.RestartPolicy.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}" $(docker ps -aq)' 2>&1 || true
  echo "=== browsers ==="; which google-chrome google-chrome-stable chromium 2>&1; google-chrome-stable --version 2>&1
  echo "=== ports ==="; ss -lntp | grep -E '5432|5176|5177|6969' || true
  echo "=== curl ==="
  for u in http://127.0.0.1:5176/ http://127.0.0.1:5177/ http://127.0.0.1:6969/health; do
    echo -n "$u -> "; curl -s -o /dev/null -w '%{http_code}\n' --max-time 3 "$u" || echo fail
  done
} >"$OUT" 2>&1
echo "Wrote $OUT"
