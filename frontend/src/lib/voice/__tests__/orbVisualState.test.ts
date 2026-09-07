import { describe, expect, it } from 'vitest';
import { resolveOrbVisualState } from '../orbVisualState';

const base = {
  isPlayingBackendAudio: false,
  isCampusSpeaking: false,
  audioPending: false,
  audioPendingTimedOut: false,
  isProcessing: false,
  speechListening: false,
  propIsListening: false,
  pendingListening: false,
  wasLocallySpeaking: false,
  currentOrbState: 'idle' as const,
  hasGreeted: true,
  showUnmuteHint: false,
};

describe('resolveOrbVisualState', () => {
  it('TEST 1: auto-listen speechListening → listening', () => {
    const r = resolveOrbVisualState({
      ...base,
      speechListening: true,
      currentOrbState: 'completed',
    });
    expect(r.next).toBe('listening');
  });

  it('TEST 2: manual pendingListening → listening (same state)', () => {
    const r = resolveOrbVisualState({
      ...base,
      pendingListening: true,
      currentOrbState: 'completed',
    });
    expect(r.next).toBe('listening');
  });

  it('TEST 3: recognition ends → leaves listening via completed/ready', () => {
    const afterLocalTts = resolveOrbVisualState({
      ...base,
      wasLocallySpeaking: true,
      speechListening: false,
      currentOrbState: 'listening',
    });
    expect(afterLocalTts.next).toBe('completed');

    const idleReady = resolveOrbVisualState({
      ...base,
      wasLocallySpeaking: false,
      speechListening: false,
      currentOrbState: 'ready',
      hasGreeted: true,
    });
    expect(idleReady.next).toBe('ready');
  });

  it('TEST 4: local TTS playing → speaking (not listening)', () => {
    const r = resolveOrbVisualState({
      ...base,
      isPlayingBackendAudio: true,
      speechListening: true, // should not win while local TTS plays
    });
    expect(r.next).toBe('speaking');
  });

  it('TEST 5: sticky backend isSpeaking irrelevant — local idle + speechListening → listening', () => {
    const stickyPayloadIsSpeaking = true;
    expect(stickyPayloadIsSpeaking).toBe(true);
    // resolveOrbVisualState has no propIsSpeaking input by design
    const r = resolveOrbVisualState({
      ...base,
      isPlayingBackendAudio: false,
      speechListening: true,
      currentOrbState: 'speaking',
    });
    expect(r.next).toBe('listening');
  });

  it('processing beats listening when turn is in flight', () => {
    expect(
      resolveOrbVisualState({
        ...base,
        isProcessing: true,
        speechListening: true,
      }).next,
    ).toBe('processing');
  });
});
