#!/usr/bin/env bash
# GNOME kiosk lockdown: no zoom, no window switching, no swipe-to-overview,
# no idle dim / night light.
# Run as the kiosk user (clara), not as root.
set -euo pipefail

gs() { gsettings set "$@" 2>/dev/null || true; }
empty='@as []'

echo "==> Idle / lock / notifications / hot corners"
gs org.gnome.desktop.screensaver lock-enabled false
gs org.gnome.desktop.screensaver idle-activation-enabled false
gs org.gnome.desktop.session idle-delay 0
gs org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
gs org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing'
gs org.gnome.settings-daemon.plugins.power idle-dim false
gs org.gnome.desktop.notifications show-banners false
gs org.gnome.desktop.lockdown disable-lock-screen true
gs org.gnome.desktop.interface enable-hot-corners false
gs org.gnome.settings-daemon.plugins.color night-light-enabled false

echo "==> Disable magnifier / zoom"
gs org.gnome.desktop.a11y.applications screen-magnifier-enabled false
gs org.gnome.settings-daemon.plugins.media-keys magnifier "$empty"
gs org.gnome.settings-daemon.plugins.media-keys magnifier-zoom-in "$empty"
gs org.gnome.settings-daemon.plugins.media-keys magnifier-zoom-out "$empty"

echo "==> Lock to a single workspace (blocks swipe workspace switch)"
gs org.gnome.mutter dynamic-workspaces false
gs org.gnome.desktop.wm.preferences num-workspaces 1
gs org.gnome.mutter overlay-key ''

echo "==> Disable Dash-to-Dock workspace scroll / swipe"
gs org.gnome.shell.extensions.dash-to-dock scroll-switch-workspace false
gs org.gnome.shell.extensions.dash-to-dock scroll-action 'do-nothing'

echo "==> Clear window / app switching keybindings"
for key in \
  switch-applications switch-applications-backward \
  switch-windows switch-windows-backward \
  cycle-windows cycle-windows-backward \
  cycle-group cycle-group-backward \
  switch-group switch-group-backward \
  switch-panels switch-panels-backward \
  show-desktop \
  switch-to-workspace-1 switch-to-workspace-2 switch-to-workspace-3 \
  switch-to-workspace-4 switch-to-workspace-5 switch-to-workspace-6 \
  switch-to-workspace-7 switch-to-workspace-8 switch-to-workspace-9 \
  switch-to-workspace-10 switch-to-workspace-11 switch-to-workspace-12 \
  switch-to-workspace-last \
  switch-to-workspace-left switch-to-workspace-right \
  switch-to-workspace-up switch-to-workspace-down \
  move-to-workspace-1 move-to-workspace-2 move-to-workspace-3 \
  move-to-workspace-4 move-to-workspace-5 move-to-workspace-6 \
  move-to-workspace-7 move-to-workspace-8 move-to-workspace-9 \
  move-to-workspace-10 move-to-workspace-11 move-to-workspace-12 \
  move-to-workspace-last \
  move-to-workspace-left move-to-workspace-right \
  move-to-workspace-up move-to-workspace-down
do
  gs org.gnome.desktop.wm.keybindings "$key" "$empty"
done

for key in \
  toggle-application-view toggle-overview \
  shift-overview-up shift-overview-down \
  switch-to-application-1 switch-to-application-2 switch-to-application-3 \
  switch-to-application-4 switch-to-application-5 switch-to-application-6 \
  switch-to-application-7 switch-to-application-8 switch-to-application-9 \
  open-new-window-application-1 open-new-window-application-2 open-new-window-application-3 \
  open-new-window-application-4 open-new-window-application-5 open-new-window-application-6 \
  open-new-window-application-7 open-new-window-application-8 open-new-window-application-9
do
  gs org.gnome.shell.keybindings "$key" "$empty"
done

echo "==> Clear monitor switch / rotate shortcuts"
gs org.gnome.mutter.keybindings switch-monitor "$empty"
gs org.gnome.mutter.keybindings rotate-monitor "$empty"


echo "==> Map ILITEK main touchscreen to main panel (EDID)"
_map=""
for _cand in \
  "${CLARA_ROOT:-}/scripts/kiosk/clara-map-main-touch.sh" \
  "${HOME}/CLARA_LAUNCH/CLARA-LAUNCH/scripts/kiosk/clara-map-main-touch.sh" \
  "${HOME}/.local/bin/clara-map-main-touch.sh"
do
  if [[ -n "$_cand" && -x "$_cand" ]]; then _map="$_cand"; break; fi
done
if [[ -n "$_map" ]]; then
  bash "$_map" || true
else
  gs org.gnome.desktop.peripherals.touchscreen:/org/gnome/desktop/peripherals/touchscreens/222a:0001/ output "['RTK', 'RTK FHD', 'J257M96B00FL']"
fi

echo "==> Lockdown: no user switch / logout"
gs org.gnome.desktop.lockdown disable-user-switching true
gs org.gnome.desktop.lockdown disable-log-out true

echo "GNOME kiosk lockdown applied."
