/**
 * Auto-listen / session-wait timeouts for kiosk UX.
 * Override via Vite env without scattering magic numbers in ChatScreen.
 */

function envMs(name: string, fallback: number): number {
  const raw = Number(import.meta.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function envMsAny(names: string[], fallback: number): number {
  for (const name of names) {
    const raw = Number(import.meta.env[name]);
    if (Number.isFinite(raw) && raw > 0) return raw;
  }
  return fallback;
}

export const AUTO_LISTEN_CONFIG = {
  /** After last TTS clip ends, wait before arming recognition. */
  postTtsSettleMs: envMs('VITE_AUTO_LISTEN_SETTLE_MS', 650),
  /** No meaningful speech after name prompt → SleepScreen (if still auto-armed). */
  nameWaitMs: envMs('VITE_AUTO_LISTEN_NAME_WAIT_MS', 45_000),
  /** No meaningful speech after a normal answer → closing prompt. */
  normalInactivityMs: envMsAny(
    ['VITE_AUTO_LISTEN_NORMAL_WAIT_MS', 'VITE_AUTO_LISTEN_NORMAL_MS'],
    35_000,
  ),
  /** No meaningful speech after closing prompt → SleepScreen. */
  closingWaitMs: envMs('VITE_AUTO_LISTEN_CLOSING_WAIT_MS', 20_000),
  /** Gap before restarting one-shot browser recognition after soft no-speech. */
  recognitionRestartGapMs: envMs('VITE_AUTO_LISTEN_RESTART_GAP_MS', 280),
  /**
   * Optional delay before speaking a no-input warning (after mic stop).
   * Default 0 — warning TTS is the user-facing pacing.
   */
  warningDelayMs: envMs('VITE_AUTO_LISTEN_WARNING_DELAY_MS', 0),
  /**
   * After second no-input warning (mic off, session alive): wait for orb tap.
   * If no tap → SleepScreen.
   */
  continuationWaitMs: envMs('VITE_AUTO_LISTEN_CONTINUATION_WAIT_MS', 20_000),
  /** Max automatic no-input failures before mic-off + orb instruction. */
  maxNoInputWarnings: 2,
} as const;

export type AutoListenWaitMode = 'name' | 'normal' | 'closing';
