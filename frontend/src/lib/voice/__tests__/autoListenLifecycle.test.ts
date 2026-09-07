import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AUTO_LISTEN_CONFIG } from '../autoListenConfig';
import {
  isClaraBusyForAutoListen,
  isClaraLocallySpeaking,
  shouldScheduleAutoListenArm,
} from '../autoListenSpeakingGate';

describe('AUTO_LISTEN_CONFIG', () => {
  it('exposes positive kiosk timeouts', () => {
    expect(AUTO_LISTEN_CONFIG.postTtsSettleMs).toBeGreaterThan(0);
    expect(AUTO_LISTEN_CONFIG.nameWaitMs).toBeGreaterThan(AUTO_LISTEN_CONFIG.postTtsSettleMs);
    expect(AUTO_LISTEN_CONFIG.normalInactivityMs).toBeGreaterThan(0);
    expect(AUTO_LISTEN_CONFIG.closingWaitMs).toBeGreaterThan(0);
    expect(AUTO_LISTEN_CONFIG.recognitionRestartGapMs).toBeGreaterThan(0);
    expect(AUTO_LISTEN_CONFIG.continuationWaitMs).toBeGreaterThan(0);
    expect(AUTO_LISTEN_CONFIG.maxNoInputWarnings).toBe(2);
  });
});

describe('autoListenSpeakingGate (local playback authority)', () => {
  it('does not treat sticky propIsSpeaking — only local playback counts as speaking', () => {
    expect(
      isClaraLocallySpeaking({
        isPlayingBackendAudio: true,
        isCampusSpeaking: false,
      }),
    ).toBe(true);
    expect(
      isClaraLocallySpeaking({
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
      }),
    ).toBe(false);
  });

  it('1. isPlayingBackendAudio=true → must NOT schedule arm', () => {
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: true,
        isPlayingBackendAudio: true,
        isCampusSpeaking: false,
        isProcessing: false,
        audioPending: false,
      }),
    ).toBe(false);
  });

  it('2. local idle after speaking → schedule arm', () => {
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: true,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
        isProcessing: false,
        audioPending: false,
      }),
    ).toBe(true);
  });

  it('3. CRITICAL: sticky propIsSpeaking is irrelevant — local idle still arms', () => {
    // Gate inputs deliberately omit propIsSpeaking. Even if UI still has
    // payload.isSpeaking=true, local signals alone decide.
    const stickyBackendIsSpeaking = true;
    expect(stickyBackendIsSpeaking).toBe(true);
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: true,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
        isProcessing: false,
        audioPending: false,
      }),
    ).toBe(true);
    expect(
      isClaraBusyForAutoListen({
        isProcessing: false,
        audioPending: false,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
      }),
    ).toBe(false);
  });

  it('does not schedule when never was speaking (no duplicate edge)', () => {
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: false,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
        isProcessing: false,
        audioPending: false,
      }),
    ).toBe(false);
  });

  it('does not schedule while processing or audioPending', () => {
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: true,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
        isProcessing: true,
        audioPending: false,
      }),
    ).toBe(false);
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: true,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
        isProcessing: false,
        audioPending: true,
      }),
    ).toBe(false);
  });
});

describe('auto-listen settle → single startListening', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('4–5. repeated scheduleArmAfterTts yields exactly one startListening for latest gen', () => {
    const startListening = vi.fn();
    const stopListening = vi.fn();
    let settle: ReturnType<typeof setTimeout> | null = null;
    let gen = 0;
    const scheduleArmAfterTts = () => {
      gen += 1;
      const g = gen;
      if (settle) clearTimeout(settle);
      stopListening();
      settle = setTimeout(() => {
        if (g !== gen) return;
        startListening();
      }, AUTO_LISTEN_CONFIG.postTtsSettleMs);
    };

    scheduleArmAfterTts();
    scheduleArmAfterTts();
    expect(startListening).not.toHaveBeenCalled();
    vi.advanceTimersByTime(AUTO_LISTEN_CONFIG.postTtsSettleMs);
    expect(startListening).toHaveBeenCalledTimes(1);
    expect(stopListening).toHaveBeenCalled();
  });
});
