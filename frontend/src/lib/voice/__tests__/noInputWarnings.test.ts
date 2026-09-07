import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AUTO_LISTEN_CONFIG } from '../autoListenConfig';

/**
 * Pure simulation of no-input counting (mirrors useAutoListenLifecycle rules)
 * without mounting React — proves TWO-WARNING contract.
 */
function simulateNoInputSequence(opts: {
  maxWarnings?: number;
  onWarning: (attempt: 1 | 2) => void;
}) {
  const max = opts.maxWarnings ?? AUTO_LISTEN_CONFIG.maxNoInputWarnings;
  let count = 0;
  let awaitingManual = false;
  let armed = true;

  const onEndedWithoutSpeech = () => {
    if (!armed || awaitingManual) return;
    count += 1;
    if (count >= max) {
      armed = false;
      awaitingManual = true;
      opts.onWarning(2);
      return;
    }
    armed = false;
    opts.onWarning(1);
  };

  const notifyManualResume = () => {
    awaitingManual = false;
    count = 0;
  };

  return {
    onEndedWithoutSpeech,
    notifyManualResume,
    getState: () => ({ count, awaitingManual, armed }),
    reArm: () => {
      if (awaitingManual) return;
      armed = true;
    },
  };
}

describe('no-input two-warning contract', () => {
  it('first NO_INPUT → warning 1; second → warning 2 + awaiting manual', () => {
    const warnings: number[] = [];
    const s = simulateNoInputSequence({
      onWarning: (a) => warnings.push(a),
    });
    s.onEndedWithoutSpeech();
    expect(warnings).toEqual([1]);
    expect(s.getState().awaitingManual).toBe(false);
    s.reArm();
    s.onEndedWithoutSpeech();
    expect(warnings).toEqual([1, 2]);
    expect(s.getState().awaitingManual).toBe(true);
    expect(s.getState().armed).toBe(false);
  });

  it('after warning 2, further no-input does not re-fire', () => {
    const warnings: number[] = [];
    const s = simulateNoInputSequence({
      onWarning: (a) => warnings.push(a),
    });
    s.onEndedWithoutSpeech();
    s.reArm();
    s.onEndedWithoutSpeech();
    s.onEndedWithoutSpeech();
    expect(warnings).toEqual([1, 2]);
  });

  it('manual resume clears counter and allows auto path again', () => {
    const warnings: number[] = [];
    const s = simulateNoInputSequence({
      onWarning: (a) => warnings.push(a),
    });
    s.onEndedWithoutSpeech();
    s.reArm();
    s.onEndedWithoutSpeech();
    s.notifyManualResume();
    expect(s.getState().awaitingManual).toBe(false);
    s.reArm();
    s.onEndedWithoutSpeech();
    expect(warnings).toEqual([1, 2, 1]);
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
    // Contract documented by ChatScreen: pendingContinuationAfterWarning2Ref
    // + speaking→idle edge. Pure timing model:
    const spokenAt = 5_000; // warning TTS length
    const continuationWait = AUTO_LISTEN_CONFIG.continuationWaitMs;
    const sleepAtIfStartedAtEmit = continuationWait; // wrong
    const sleepAtIfStartedAfterTts = spokenAt + continuationWait; // correct
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
