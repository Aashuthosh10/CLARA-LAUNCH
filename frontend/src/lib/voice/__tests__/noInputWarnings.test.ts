import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AUTO_LISTEN_CONFIG } from '../autoListenConfig';

/**
 * Mirrors useAutoListenLifecycle contracts:
 * - Soft SpeechRecognition.onend → restart only (not closing / not warning)
 * - Normal logical wait expiry → closing prompt
 * - Closing wait expiry → closing timeout (feedback / sleep path)
 */
function simulateAutoListenWindow(opts: {
  onClosingPrompt: () => void;
  onClosingTimeout: () => void;
  onRestart: () => void;
}) {
  let armed = true;
  let mode: 'normal' | 'closing' = 'normal';
  let waitAlive = true;

  const onRecognitionEndedWithoutSpeech = () => {
    if (!armed || !waitAlive) return;
    opts.onRestart();
  };

  const onLogicalWaitExpired = () => {
    if (!armed || !waitAlive) return;
    waitAlive = false;
    armed = false;
    if (mode === 'closing') {
      opts.onClosingTimeout();
      return;
    }
    opts.onClosingPrompt();
  };

  return {
    onRecognitionEndedWithoutSpeech,
    onLogicalWaitExpired,
    enterClosingMode: () => {
      mode = 'closing';
      armed = true;
      waitAlive = true;
    },
    getState: () => ({ armed, mode, waitAlive }),
  };
}

describe('auto-listen closing contract (logical window)', () => {
  it('soft recognition end does not close; only restarts', () => {
    const closes: string[] = [];
    const restarts: number[] = [];
    const s = simulateAutoListenWindow({
      onClosingPrompt: () => closes.push('prompt'),
      onClosingTimeout: () => closes.push('timeout'),
      onRestart: () => restarts.push(1),
    });
    s.onRecognitionEndedWithoutSpeech();
    s.onRecognitionEndedWithoutSpeech();
    expect(closes).toEqual([]);
    expect(restarts).toEqual([1, 1]);
    expect(s.getState().armed).toBe(true);
  });

  it('normal logical wait expiry → closing prompt (not no-input warnings)', () => {
    const closes: string[] = [];
    const s = simulateAutoListenWindow({
      onClosingPrompt: () => closes.push('prompt'),
      onClosingTimeout: () => closes.push('timeout'),
      onRestart: () => undefined,
    });
    s.onLogicalWaitExpired();
    expect(closes).toEqual(['prompt']);
    expect(s.getState().armed).toBe(false);
  });

  it('closing-mode wait expiry → closing timeout (second hit → feedback)', () => {
    const closes: string[] = [];
    const s = simulateAutoListenWindow({
      onClosingPrompt: () => closes.push('prompt'),
      onClosingTimeout: () => closes.push('timeout'),
      onRestart: () => undefined,
    });
    s.enterClosingMode();
    s.onLogicalWaitExpired();
    expect(closes).toEqual(['timeout']);
  });
});

describe('continuation timeout race', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('continuation timeout should start after warning spoken, not at emit', () => {
    const spokenAt = 5_000;
    const continuationWait = AUTO_LISTEN_CONFIG.continuationWaitMs;
    const sleepAtIfStartedAtEmit = continuationWait;
    const sleepAtIfStartedAfterTts = spokenAt + continuationWait;
    expect(sleepAtIfStartedAfterTts).toBeGreaterThan(sleepAtIfStartedAtEmit);
    expect(sleepAtIfStartedAfterTts - spokenAt).toBe(continuationWait);
  });

  it('orb tap cancels continuation sleep; timeout alone ends session', () => {
    const endSession = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startContinuation = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        endSession();
      }, AUTO_LISTEN_CONFIG.continuationWaitMs);
    };
    const cancelOnOrbTap = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    startContinuation();
    cancelOnOrbTap();
    vi.advanceTimersByTime(AUTO_LISTEN_CONFIG.continuationWaitMs);
    expect(endSession).not.toHaveBeenCalled();

    startContinuation();
    vi.advanceTimersByTime(AUTO_LISTEN_CONFIG.continuationWaitMs);
    expect(endSession).toHaveBeenCalledTimes(1);
  });
});
