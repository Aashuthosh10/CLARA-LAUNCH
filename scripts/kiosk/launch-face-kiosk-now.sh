#!/usr/bin/env bash
# Manually launch ONLY the facial Chrome --kiosk window (no title bar).
# Usage:
#   bash scripts/kiosk/launch-face-kiosk-now.sh [X] [Y] [W] [H]
# Example (secondary to the right of 1600x900 main):
#   bash scripts/kiosk/launch-face-kiosk-now.sh 1600 0 1600 900
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
GEOM="${XDG_CONFIG_HOME:-$HOME/.config}/clara-kiosk/display-geometry.env"
PROFILE="${XDG_CONFIG_HOME:-$HOME/.config}/clara-chrome-face"
FACE_URL="${CLARA_FACE_URL:-http://127.0.0.1:5177/?kiosk=1&bridge=1}"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/clara-kiosk"
mkdir -p "$PROFILE" "$LOG_DIR"

X="${1:-}"; Y="${2:-}"; W="${3:-}"; H="${4:-}"
if [[ -z "$X" && -f "$GEOM" ]]; then
  # shellcheck disable=SC1090
  source "$GEOM"
  if [[ -n "${CLARA_FACE_POS:-}" && -n "${CLARA_FACE_SIZE:-}" ]]; then
    X="${CLARA_FACE_POS%%,*}"; Y="${CLARA_FACE_POS##*,}"
    W="${CLARA_FACE_SIZE%%,*}"; H="${CLARA_FACE_SIZE##*,}"
  fi
fi
X="${X:-1600}"; Y="${Y:-0}"; W="${W:-1600}"; H="${H:-900}"

CHROME_BIN=""
for c in google-chrome-stable google-chrome chromium; do
  if command -v "$c" >/dev/null 2>&1; then CHROME_BIN="$(command -v "$c")"; break; fi
done
[[ -n "$CHROME_BIN" ]] || { echo "Chrome not found"; exit 1; }

# Ensure facial vite is up
bash "$ROOT/scripts/kiosk/clara-services-start.sh"

pkill -f -- "--user-data-dir=$PROFILE" 2>/dev/null || true
sleep 0.5

echo "Launching face kiosk at ${X},${Y} size ${W}x${H}"
"$CHROME_BIN" \
  --user-data-dir="$PROFILE" \
  --class=ClaraKioskFace \
  --no-first-run \
  --no-default-browser-check \
  --disable-session-crashed-bubble \
  --disable-notifications \
  --autoplay-policy=no-user-gesture-required \
  --ozone-platform=x11 \
  --window-position="${X},${Y}" \
  --window-size="${W}x${H}" \
  --kiosk \
  --app="$FACE_URL" \
  >>"$LOG_DIR/chrome-face.log" 2>&1 &
echo $! | tee "$LOG_DIR/chrome-face.pid"
echo "No title bar / no min max close (--kiosk). Lip-sync via face-bridge."
