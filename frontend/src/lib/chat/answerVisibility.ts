/**
 * TEXT SUCCESS != AUDIO SUCCESS.
 * Presentation waits for required speech, but never deadlocks:
 * audioUnavailable or the watchdog still commits text.
 */

export const ANSWER_TTS_WATCHDOG_MS = 20_000;

export function showThinkingOverlay(opts: {
  isProcessing: boolean;
  audioPending?: boolean;
  audioUnavailable?: boolean;
  watchdogRecovered?: boolean;
}): boolean {
  if (opts.audioUnavailable || opts.watchdogRecovered) return false;
  if (opts.isProcessing) return true;
  if (opts.audioPending) return true;
  return false;
}

export function shouldCommitAnswerMessages(opts: {
  hasMessages: boolean;
  audioPending?: boolean;
  audioUnavailable?: boolean;
  audioReady?: boolean;
  watchdogRecovered?: boolean;
}): boolean {
  if (!opts.hasMessages) return false;
  if (opts.audioUnavailable || opts.audioReady || opts.watchdogRecovered) return true;
  if (opts.audioPending) return false;
  return true;
}

export function shouldFocusAssistantAnswer(opts: {
  isCardTurn: boolean;
  isProcessing: boolean;
  audioPending?: boolean;
}): boolean {
  if (opts.isCardTurn) return false;
  if (opts.isProcessing || opts.audioPending) return false;
  return true;
}

export function shouldRecoverAudioPendingWatchdog(opts: {
  audioPending: boolean;
  elapsedMs: number;
  watchdogMs?: number;
}): boolean {
  if (!opts.audioPending) return false;
  return opts.elapsedMs >= (opts.watchdogMs ?? ANSWER_TTS_WATCHDOG_MS);
}
