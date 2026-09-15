#!/usr/bin/env bash
# Copy latest kiosk scripts into ~/.local/bin (run as user clara).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$HOME/.local/bin"
mkdir -p "$BIN"
install -m 0755 "$ROOT/scripts/kiosk/clara-services-start.sh" "$BIN/clara-services-start.sh"
install -m 0755 "$ROOT/scripts/kiosk/clara-kiosk-start.sh" "$BIN/clara-kiosk-start.sh"
install -m 0755 "$ROOT/scripts/kiosk/clara-kiosk-gnome-lockdown.sh" "$BIN/clara-kiosk-gnome-lockdown.sh"
install -m 0755 "$ROOT/scripts/kiosk/clara-disable-face-touch.sh" "$BIN/clara-disable-face-touch.sh"
install -m 0755 "$ROOT/scripts/kiosk/clara-map-main-touch.sh" "$BIN/clara-map-main-touch.sh"
cat > "$BIN/clara-kiosk-start" <<EOF
#!/usr/bin/env bash
export CLARA_ROOT="$ROOT"
exec bash "$BIN/clara-kiosk-start.sh" "\$@"
EOF
chmod 0755 "$BIN/clara-kiosk-start"
cat > "$BIN/clara-services-start" <<EOF
#!/usr/bin/env bash
export CLARA_ROOT="$ROOT"
exec bash "$BIN/clara-services-start.sh" "\$@"
EOF
chmod 0755 "$BIN/clara-services-start"
echo "Synced launchers to $BIN"
