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
  /** Backend reset is enqueued on the outbound dispatcher (accepted while CONNECTING). */
  sendBackendResetPayload: () => boolean;
  /** Force route + payload to sleep on the client websocket adapter. */
  applyClientSleepUi: () => void;
  /** Last step: increments root runtime session key — full React teardown of kiosk subtree. */
  scheduleFullRuntimeRemount: () => void;
};

/** Returns whether the reset envelope was accepted by the outbound dispatcher. */
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
