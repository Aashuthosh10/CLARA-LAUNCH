/**
 * Voice interaction diagnostics façade (kiosk telemetry).
 *
 * Playback uses ephemeral `Audio` instances in ChatScreen rather than a
 * singleton voice hook module; expose only honest, typed signals here.
 */
export interface VoiceAudioDiagnostics {
  /** True when dedicated global voice instrumentation exists (future use). */
  instrumented: false;
}

export function getAudioDiagnostics(): VoiceAudioDiagnostics {
  return { instrumented: false };
}
