/**
 * Auto-listen must track physical local playback, not sticky WS isSpeaking.
 * Backend payload.isSpeaking means "response has/had speech association" — not
 * "HTMLAudioElement is playing right now."
 */

export type LocalSpeakingSignals = {
  isPlayingBackendAudio: boolean;
  isCampusSpeaking: boolean;
};

export type LocalBusySignals = LocalSpeakingSignals & {
  isProcessing: boolean;
  audioPending: boolean;
  thinkingPlaying?: boolean;
};

/** True while CLARA is physically outputting audio on this client. */
export function isClaraLocallySpeaking(s: LocalSpeakingSignals): boolean {
  return Boolean(s.isPlayingBackendAudio) || Boolean(s.isCampusSpeaking);
}

/** Blocks arming / cancels settle while a turn is still in flight locally. */
export function isClaraBusyForAutoListen(s: LocalBusySignals): boolean {
  return (
    Boolean(s.isProcessing) ||
    Boolean(s.audioPending) ||
    isClaraLocallySpeaking(s) ||
    Boolean(s.thinkingPlaying)
  );
}

/**
 * Edge detector: schedule arm only on local speaking → idle.
 * Sticky propIsSpeaking must not appear in these inputs.
 */
export function shouldScheduleAutoListenArm(input: {
  wasLocallySpeaking: boolean;
  isPlayingBackendAudio: boolean;
  isCampusSpeaking: boolean;
  isProcessing: boolean;
  audioPending: boolean;
  suppressed?: boolean;
}): boolean {
  if (input.suppressed) return false;
  const speakingNow = isClaraLocallySpeaking(input);
  if (speakingNow || input.isProcessing || input.audioPending) return false;
  return Boolean(input.wasLocallySpeaking);
}
