/**
 * Relative energy gate using analyser RMS (visual analyser already running).
 * Conservative: only blocks when we have a warm ambient baseline AND
 * the sustained signal never rises meaningfully above it during the listen window.
 *
 * Does NOT claim speaker ID. Does NOT replace SpeechRecognition.
 */

export type AmbientSample = {
  smoothedRms: number;
  isSilent: boolean;
};

export function createAmbientBaselineTracker() {
  let baseline = 0;
  let samples = 0;
  let peakDuringListen = 0;
  let calibrated = false;

  return {
    /** Call during settle / early listen to learn room floor. */
    observeAmbient(sample: AmbientSample) {
      const rms = Math.max(0, sample.smoothedRms || 0);
      samples += 1;
      baseline = baseline === 0 ? rms : baseline * 0.85 + rms * 0.15;
      if (samples >= 8) calibrated = true;
    },
    /** Call while recognition is active. */
    observeListen(sample: AmbientSample) {
      const rms = Math.max(0, sample.smoothedRms || 0);
      if (rms > peakDuringListen) peakDuringListen = rms;
    },
    resetListenPeak() {
      peakDuringListen = 0;
    },
    /**
     * If calibrated and peak never exceeded ambient by margin, treat as NO_INPUT
     * even if Web Speech returned a spurious transcript.
     */
    looksLikeAmbientOnly(opts?: { margin?: number; minPeak?: number }): boolean {
      if (!calibrated) return false;
      const margin = opts?.margin ?? 0.045;
      const minPeak = opts?.minPeak ?? 0.02;
      if (peakDuringListen < minPeak) return true;
      return peakDuringListen < baseline + margin;
    },
    snapshot() {
      return { baseline, peakDuringListen, calibrated, samples };
    },
    reset() {
      baseline = 0;
      samples = 0;
      peakDuringListen = 0;
      calibrated = false;
    },
  };
}
