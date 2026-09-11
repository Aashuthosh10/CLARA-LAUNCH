#!/usr/bin/env bash
# Map ILITEK main touchscreen to the main panel.
#
# On GNOME Wayland (this kiosk): real HID devices are NOT visible to xinput
# (only xwayland-touch). Mapping must use:
#   gsettings org.gnome.desktop.peripherals.touchscreen:.../output
# with EDID [vendor, product, serial] for the main monitor.
#
# On native X11 sessions: also run xinput map-to-output when ILITEK appears.
#
# WaveShare face touch stays ignored via udev (not enabled here).
set -euo pipefail

KIOSK_CFG="${XDG_CONFIG_HOME:-$HOME/.config}/clara-kiosk"
GEOM="$KIOSK_CFG/display-geometry.env"
LOG="$KIOSK_CFG/map-main-touch.log"
mkdir -p "$KIOSK_CFG"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG"; }

MAIN_OUT="${CLARA_MAIN_CONNECTOR:-HDMI-2}"
if [[ -f "$GEOM" ]]; then
  # shellcheck disable=SC1090
  source "$GEOM"
  MAIN_OUT="${CLARA_MAIN_CONNECTOR:-$MAIN_OUT}"
fi

export DISPLAY="${DISPLAY:-:0}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/bus}"

# ILITEK USB ids (from /proc/bus/input/devices)
TS_PATH="/org/gnome/desktop/peripherals/touchscreens/222a:0001/"

# Resolve EDID vendor/product/serial for MAIN_OUT from monitors.xml (active layout) or gdctl
resolve_edid() {
  python3 - "$MAIN_OUT" <<'PY'
import sys, re, xml.etree.ElementTree as ET
from pathlib import Path
connector = sys.argv[1]
# Prefer latest matching configuration in monitors.xml
mon = Path.home() / ".config" / "monitors.xml"
vendor = product = serial = ""
if mon.exists():
    try:
        root = ET.fromstring(mon.read_text())
        # Walk configurations in reverse so the newest matching layout wins
        configs = list(root.findall("configuration"))
        for conf in reversed(configs):
            for lm in conf.findall("logicalmonitor"):
                for m in lm.findall("monitor"):
                    spec = m.find("monitorspec")
                    if spec is None:
                        continue
                    conn = (spec.findtext("connector") or "").strip()
                    if conn != connector:
                        continue
                    vendor = (spec.findtext("vendor") or "").strip()
                    product = (spec.findtext("product") or "").strip()
                    serial = (spec.findtext("serial") or "").strip()
                    if vendor and product:
                        print(f"{vendor}\t{product}\t{serial}")
                        raise SystemExit(0)
    except SystemExit:
        raise
    except Exception:
        pass
# Fallback known live EDID for RTK 24" main
if connector in ("HDMI-2", "HDMI-A-2"):
    print("RTK\tRTK FHD\tJ257M96B00FL")
    raise SystemExit(0)
print("\t\t")
PY
}

map_gnome_edid() {
  local vendor product serial
  IFS=$'\t' read -r vendor product serial < <(resolve_edid)
  if [[ -z "$vendor" || -z "$product" ]]; then
    log "ERROR: could not resolve EDID for $MAIN_OUT"
    return 1
  fi
  local out_val
  out_val=$(python3 -c "import sys; v,p,s=sys.argv[1:4]; print([v,p,s])" "$vendor" "$product" "$serial")
  log "GNOME touchscreen map 222a:0001 → output $out_val (connector $MAIN_OUT)"
  gsettings set "org.gnome.desktop.peripherals.touchscreen:${TS_PATH}" output "$out_val"
  local got
  got=$(gsettings get "org.gnome.desktop.peripherals.touchscreen:${TS_PATH}" output)
  log "gsettings now: $got"
  echo "CLARA_MAIN_TOUCH_EDID_VENDOR=$vendor" >"$KIOSK_CFG/main-touch-map.env"
  echo "CLARA_MAIN_TOUCH_EDID_PRODUCT=$product" >>"$KIOSK_CFG/main-touch-map.env"
  echo "CLARA_MAIN_TOUCH_EDID_SERIAL=$serial" >>"$KIOSK_CFG/main-touch-map.env"
  echo "CLARA_MAIN_TOUCH_OUTPUT=$MAIN_OUT" >>"$KIOSK_CFG/main-touch-map.env"
  echo "CLARA_MAIN_TOUCH_MAPPED_AT=$(date -Is)" >>"$KIOSK_CFG/main-touch-map.env"
}

map_xinput_if_native() {
  if ! command -v xinput >/dev/null 2>&1; then
    # Best-effort install for native X11 hosts
    if command -v pkexec >/dev/null 2>&1; then
      pkexec apt-get install -y xinput >>"$LOG" 2>&1 || true
    fi
  fi
  command -v xinput >/dev/null 2>&1 || return 0

  # Under Xwayland, only xwayland-touch exists — skip map-to-output
  if xinput list --name-only 2>/dev/null | grep -q '^xwayland-touch'; then
    if ! xinput list --name-only 2>/dev/null | grep -qi ILITEK; then
      log "Xwayland session: no native ILITEK in xinput (expected); relying on GNOME EDID map"
      return 0
    fi
  fi

  local id name=""
  mapfile -t IDS < <(xinput list --id-only 2>/dev/null || true)
  for i in "${IDS[@]:-}"; do
    name="$(xinput list --name-only "$i" 2>/dev/null || true)"
    if [[ "$name" == "ILITEK ILITEK-TP" || "$name" == *ILITEK* ]]; then
      id="$i"
      break
    fi
  done
  [[ -n "${id:-}" ]] || return 0

  if xrandr --query 2>/dev/null | grep -qE "^${MAIN_OUT} connected"; then
    log "X11: xinput map-to-output id=$id ($name) → $MAIN_OUT"
    xinput map-to-output "$id" "$MAIN_OUT" >>"$LOG" 2>&1 || log "WARNING: map-to-output failed"
    echo "CLARA_MAIN_TOUCH_XINPUT_ID=$id" >>"$KIOSK_CFG/main-touch-map.env"
  fi
}

log "=== map main touch start ==="
map_gnome_edid
map_xinput_if_native
log "=== map main touch done ==="
echo "Mapped ILITEK → $MAIN_OUT (GNOME EDID + optional xinput)"
