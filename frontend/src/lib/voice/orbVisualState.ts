/**
 * ChatScreen orb visual state — shared by manual tap and auto-listen.
 * Local HTMLAudioElement / SpeechRecognition win over sticky payload.isSpeaking.
 */

export type OrbVisualState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'ready'
  | 'completed';

export type ResolveOrbVisualStateInput = {
  isPlayingBackendAudio: boolean;
  isCampusSpeaking: boolean;
  audioPending: boolean;
  audioPendingTimedOut: boolean;
  isProcessing: boolean;
  /** Browser Web Speech Recognition active (manual or auto-listen). */
  speechListening: boolean;
  propIsListening: boolean;
  pendingListening: boolean;
  /** Prior-frame local speaking latch (for speaking → completed). */
  wasLocallySpeaking: boolean;
  currentOrbState: OrbVisualState;
  hasGreeted: boolean;
  showUnmuteHint: boolean;
};

export function isLocallySpeakingForOrb(input: {
  isPlayingBackendAudio: boolean;
  isCampusSpeaking: boolean;
}): boolean {
  return Boolean(input.isPlayingBackendAudio) || Boolean(input.isCampusSpeaking);
}

export function isActivelyListeningForOrb(input: {
  speechListening: boolean;
  propIsListening: boolean;
  pendingListening: boolean;
}): boolean {
  return (
    Boolean(input.speechListening) ||
    Boolean(input.propIsListening) ||
    Boolean(input.pendingListening)
  );
}

/**
 * Priority (authoritative for SiriOrb via ChatOrbControl):
 * 1. Local TTS / campus audio playing → speaking
 * 2. audioPending / isProcessing → processing
 * 3. SpeechRecognition (or optimistic pending) active → listening
 * 4. Just finished local speaking → completed
 * 5. Persist completed / ready / idle
 *
 * Sticky backend isSpeaking is intentionally NOT consulted here.
 */
export function resolveOrbVisualState(
  input: ResolveOrbVisualStateInput,
): { next: OrbVisualState; nowLocallySpeaking: boolean } {
  const nowLocallySpeaking = isLocallySpeakingForOrb(input);

  if (nowLocallySpeaking) {
    return { next: 'speaking', nowLocallySpeaking: true };
  }
  if (input.audioPending && !input.audioPendingTimedOut) {
    return { next: 'processing', nowLocallySpeaking: false };
  }
  if (input.isProcessing) {
    return { next: 'processing', nowLocallySpeaking: false };
  }
  if (isActivelyListeningForOrb(input)) {
    return { next: 'listening', nowLocallySpeaking: false };
  }
  if (input.wasLocallySpeaking) {
    return { next: 'completed', nowLocallySpeaking: false };
  }
  if (input.currentOrbState === 'completed') {
    return { next: 'completed', nowLocallySpeaking: false };
  }
  if (input.hasGreeted && !input.showUnmuteHint) {
    return { next: 'ready', nowLocallySpeaking: false };
  }
  return { next: 'idle', nowLocallySpeaking: false };
}
