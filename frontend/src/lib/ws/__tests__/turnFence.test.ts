import { describe, expect, it } from 'vitest';
import {
  TURN_FENCE_PENDING,
  applyTurnFence,
  shouldApplyUnitBackedPlan,
  shouldIgnorePayloadTurn,
} from '../turnFence';

describe('turn fence', () => {
  it('ignores a stale payload after intercept and before isProcessing', () => {
    const fenced = applyTurnFence('turn-a', { kind: 'intercept' });
    expect(fenced).toBe(TURN_FENCE_PENDING);
    expect(shouldIgnorePayloadTurn(fenced, 'turn-a')).toBe(true);
    expect(shouldIgnorePayloadTurn(fenced, 'turn-b')).toBe(true);
  });

  it('3→1 applies only the new turnId after isProcessing assigns it', () => {
    let active = applyTurnFence('turn-3hod', { kind: 'intercept' });
    active = applyTurnFence(active, { kind: 'isProcessing', turnId: 'turn-1hod' });
    expect(active).toBe('turn-1hod');
    expect(shouldIgnorePayloadTurn(active, 'turn-3hod')).toBe(true);
    expect(shouldIgnorePayloadTurn(active, 'turn-1hod')).toBe(false);
    expect(
      shouldApplyUnitBackedPlan({
        activeTurnId: active,
        planTurnId: 'turn-3hod',
        audioPending: false,
      }),
    ).toBe(false);
    expect(
      shouldApplyUnitBackedPlan({
        activeTurnId: active,
        planTurnId: 'turn-1hod',
        audioPending: true,
      }),
    ).toBe(true);
  });

  it('null owner still allows greeting payloads', () => {
    expect(shouldIgnorePayloadTurn(null, 'greeting_opening')).toBe(false);
  });
});
