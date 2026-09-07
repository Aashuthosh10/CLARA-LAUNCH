import { describe, expect, it } from 'vitest';
import { createAmbientBaselineTracker } from '../ambientSpeechGate';

describe('createAmbientBaselineTracker', () => {
  it('does not block before calibration', () => {
    const t = createAmbientBaselineTracker();
    t.observeListen({ smoothedRms: 0.01, isSilent: true });
    expect(t.looksLikeAmbientOnly()).toBe(false);
  });

  it('after quiet baseline, peak near floor → ambient-only', () => {
    const t = createAmbientBaselineTracker();
    for (let i = 0; i < 10; i++) {
      t.observeAmbient({ smoothedRms: 0.02, isSilent: true });
    }
    t.resetListenPeak();
    t.observeListen({ smoothedRms: 0.025, isSilent: true });
    expect(t.looksLikeAmbientOnly()).toBe(true);
  });

  it('sustained peak above baseline → not ambient-only', () => {
    const t = createAmbientBaselineTracker();
    for (let i = 0; i < 10; i++) {
      t.observeAmbient({ smoothedRms: 0.02, isSilent: true });
    }
    t.resetListenPeak();
    t.observeListen({ smoothedRms: 0.12, isSilent: false });
    expect(t.looksLikeAmbientOnly()).toBe(false);
  });
});
