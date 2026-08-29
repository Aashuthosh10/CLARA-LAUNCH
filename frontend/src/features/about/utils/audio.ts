/**
 * Web Audio Synthesizer for CLARA's luminous interactive sound design.
 * Creates smooth, pure-tone feedback (sine/triangle waves with smooth ADSR curves)
 * without external audio files.
 */

let audioCtx: AudioContext | null = null;
let isAudioEnabled = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setAudioEnabled(enabled: boolean) {
  isAudioEnabled = enabled;
  if (enabled) {
    getAudioContext();
    playChime(528, 0.15, 0.04);
  }
}

export function getAudioEnabled(): boolean {
  return isAudioEnabled;
}

export function playTone(freq = 528, type: OscillatorType = 'sine', duration = 0.18, volume = 0.03) {
  if (!isAudioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Graceful fallback
  }
}

export function playChime(freq = 528, duration = 0.25, volume = 0.03) {
  playTone(freq, 'sine', duration, volume);
}

export function playHoverChime() {
  playChime(659.25, 0.15, 0.02);
}

export function playHarmonicChord() {
  if (!isAudioEnabled) return;
  const notes = [528, 660, 792];
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playChime(freq, 0.35, 0.025);
    }, idx * 70);
  });
}

export function playNodeSelectChime() {
  if (!isAudioEnabled) return;
  playChime(440, 0.12, 0.03);
  setTimeout(() => playChime(660, 0.16, 0.035), 60);
  setTimeout(() => playChime(880, 0.22, 0.03), 120);
}

export function playStepChime(stepIndex: number) {
  if (!isAudioEnabled) return;
  const scale = [440, 493.88, 523.25, 587.33, 659.25, 783.99, 880];
  const freq = scale[stepIndex % scale.length];
  playChime(freq, 0.25, 0.03);
}

export function playPipelineStepSound(step: number) {
  playStepChime(step);
}

export function playVoiceWaveTone() {
  if (!isAudioEnabled) return;
  playChime(432, 0.35, 0.025);
  setTimeout(() => playChime(528, 0.35, 0.02), 120);
}

export function playClaraPulse() {
  if (!isAudioEnabled) return;
  playChime(220, 0.35, 0.025);
  setTimeout(() => playChime(277.18, 0.25, 0.025), 80);
}

export function playCinematicIntroSound() {
  if (!isAudioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Ambient sub-harmonic swell
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.2);
    subGain.gain.setValueAtTime(0.001, ctx.currentTime);
    subGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.4);
    subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start();
    subOsc.stop(ctx.currentTime + 1.8);

    // Amethyst crystalline chords
    const chordNotes = [528, 660, 792, 1056];
    chordNotes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 'sine', 0.8, 0.025);
      }, 300 + idx * 120);
    });

    // Final sparkle glint
    setTimeout(() => {
      playTone(1320, 'triangle', 0.4, 0.02);
      playTone(1760, 'sine', 0.5, 0.015);
    }, 1100);
  } catch {
    // fallback
  }
}

export function playGlintSound() {
  if (!isAudioEnabled) return;
  playTone(1760, 'sine', 0.25, 0.02);
  setTimeout(() => playTone(2112, 'sine', 0.2, 0.015), 50);
}

