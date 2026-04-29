/**
 * Atomic hard-reset choreography for kiosk session lifecycle (Home = full reboot).
 * Single entrypoint avoids split-brain cleanup when multiple subsystems participate.
 */

export type HardResetTransactionDeps = {
  bumpWsSessionFloor: () => void;
  resetLanguageToDefault: () => void;
  resetKioskSnapshot: () => void;
  forceKioskSemanticSleep: () => void;
  clearAppOwnedGates: () => void;
  /** Backend reset MUST be attempted; caller may reconcile if false. */
  sendBackendResetPayload: () => boolean;
  /** Force route + payload to sleep on the client websocket adapter. */
  applyClientSleepUi: () => void;
  /** Last step: increments root runtime session key — full React teardown of kiosk subtree. */
  scheduleFullRuntimeRemount: () => void;
};

/** Returns whether backend reset envelope was dispatched on an OPEN socket (best-effort telemetry). */
export function runHardResetTransaction(d: HardResetTransactionDeps): boolean {
  d.bumpWsSessionFloor();
  d.resetLanguageToDefault();
  d.resetKioskSnapshot();
  d.forceKioskSemanticSleep();
  d.clearAppOwnedGates();
  const sent = d.sendBackendResetPayload();
  d.applyClientSleepUi();
  d.scheduleFullRuntimeRemount();
  return sent;
}
