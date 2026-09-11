#!/usr/bin/env bash
# Disable WaveShare mini/face touchscreen; keep ILITEK main touch.
# Run as:
#   sudo -E bash scripts/kiosk/clara-disable-face-touch.sh
#
# Optional env (defaults match live CLARA dual-HDMI layout):
#   CLARA_FACE_CONNECTOR=HDMI-1
#   CLARA_MAIN_CONNECTOR=HDMI-2
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo -E bash $0" >&2
  exit 1
fi

REAL_USER="${SUDO_USER:-clara}"
HOME_DIR="$(getent passwd "$REAL_USER" | cut -d: -f6)"
KIOSK_CFG="$HOME_DIR/.config/clara-kiosk"
GEOM="$KIOSK_CFG/display-geometry.env"
mkdir -p "$KIOSK_CFG"

FACE_OUT="${CLARA_FACE_CONNECTOR:-HDMI-1}"
MAIN_OUT="${CLARA_MAIN_CONNECTOR:-HDMI-2}"
if [[ -f "$GEOM" ]]; then
  # shellcheck disable=SC1090
  source "$GEOM"
  FACE_OUT="${CLARA_FACE_CONNECTOR:-$FACE_OUT}"
  MAIN_OUT="${CLARA_MAIN_CONNECTOR:-$MAIN_OUT}"
fi

RULE=/etc/udev/rules.d/99-clara-touch-map.rules
cat >"$RULE" <<EOF
# CLARA kiosk: map touchscreens; IGNORE face/mini (WaveShare) touch.
# Main ILITEK stays enabled on $MAIN_OUT. Face WaveShare is ignored.

# WaveShare WS170120 → facial panel output (mapping, then ignored below)
ACTION=="add|change", KERNEL=="event*", ENV{ID_VENDOR_ID}=="0eef", ENV{ID_MODEL_ID}=="0005", \\
  ENV{ID_INPUT_TOUCHSCREEN}=="1", ENV{WL_OUTPUT}="$FACE_OUT"

# ILITEK main touch → main panel
ACTION=="add|change", KERNEL=="event*", ENV{ID_VENDOR_ID}=="222a", ENV{ID_MODEL_ID}=="0001", \\
  ENV{ID_INPUT_TOUCHSCREEN}=="1", ENV{WL_OUTPUT}="$MAIN_OUT"

# Disable touch on facial/mini panel (taps must not control the face UI)
ACTION=="add|change", KERNEL=="event*", ENV{ID_VENDOR_ID}=="0eef", ENV{ID_MODEL_ID}=="0005", \\
  ENV{ID_INPUT_TOUCHSCREEN}=="1", ENV{LIBINPUT_IGNORE_DEVICE}="1"

# Backup match by device name (WaveShare mini)
ACTION=="add|change", KERNEL=="event*", ENV{ID_INPUT_TOUCHSCREEN}=="1", \\
  ATTRS{name}=="WaveShare WS170120", ENV{LIBINPUT_IGNORE_DEVICE}="1"
EOF

udevadm control --reload-rules
udevadm trigger --subsystem-match=input --action=change 2>/dev/null || udevadm trigger

cat >"$KIOSK_CFG/TOUCH-README.txt" <<EOF
CLARA kiosk touch policy
========================
Main/lower display (ILITEK ILITEK-TP, 222a:0001): KEEP touch enabled → $MAIN_OUT
Upper/facial mini (WaveShare WS170120, 0eef:0005): DISABLE touch → ignored

Installed rule: $RULE

Reload (if needed):
  sudo udevadm control --reload-rules && sudo udevadm trigger

Verify WaveShare is ignored (LIBINPUT_IGNORE_DEVICE) and ILITEK still works on the main panel.
EOF
chown "$REAL_USER:$REAL_USER" "$KIOSK_CFG/TOUCH-README.txt"

echo "Installed $RULE (face=$FACE_OUT ignored, main=$MAIN_OUT kept)"
echo "Updated $KIOSK_CFG/TOUCH-README.txt"
