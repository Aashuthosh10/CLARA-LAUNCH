/**
 * TEXT SUCCESS != AUDIO SUCCESS.
 * Generated assistant text must commit even while TTS is pending or has failed.
 */

export const ANSWER_TTS_WATCHDOG_MS = 20_000;

export function showThinkingOverlay(isProcessing: boolean): boolean {
  return isProcessing === true;
}

export function shouldCommitAnswerMessages(hasMessages: boolean): boolean {
  return hasMessages === true;
}

export function shouldFocusAssistantAnswer(opts: {
  isCardTurn: boolean;
  isProcessing: boolean;
}): boolean {
  return !opts.isCardTurn && opts.isProcessing !== true;
}

export function shouldRecoverAudioPendingWatchdog(opts: {
  audioPending: boolean;
  elapsedMs: number;
  watchdogMs?: number;
}): boolean {
  if (!opts.audioPending) return false;
  return opts.elapsedMs >= (opts.watchdogMs ?? ANSWER_TTS_WATCHDOG_MS);
}
