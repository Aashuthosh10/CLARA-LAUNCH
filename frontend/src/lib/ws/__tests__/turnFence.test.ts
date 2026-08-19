import { describe, expect, it } from 'vitest';
import {
  TURN_FENCE_PENDING,
  adoptTurnOwner,
  applyTurnFence,
  shouldApplyUnitBackedPlan,
  shouldIgnorePayloadTurn,
} from '../turnFence';

describe('turn fence', () => {
  it('rejects stale previous-turn audio while PENDING and accepts the new turn', () => {
    const fenced = applyTurnFence('turn-a', { kind: 'intercept' });
    expect(fenced).toBe(TURN_FENCE_PENDING);
    expect(shouldIgnorePayloadTurn(fenced, 'turn-a', 'turn-a')).toBe(true);
    expect(shouldIgnorePayloadTurn(fenced, 'turn-b', 'turn-a')).toBe(false);
    expect(shouldIgnorePayloadTurn(fenced, '', 'turn-a')).toBe(true);
  });

  it('adopts the first identified current-turn id without waiting for isProcessing', () => {
    const owner = adoptTurnOwner(TURN_FENCE_PENDING, 'turn-b', 'turn-a');
    expect(owner).toBe('turn-b');
    expect(shouldIgnorePayloadTurn(owner, 'turn-a', 'turn-a')).toBe(true);
    expect(shouldIgnorePayloadTurn(owner, 'turn-b', 'turn-a')).toBe(false);
  });

  it('does not adopt stale turn-a while PENDING after barge-in', () => {
    expect(adoptTurnOwner(TURN_FENCE_PENDING, 'turn-a', 'turn-a')).toBe(TURN_FENCE_PENDING);
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

  it('allows the new turn plan while PENDING and still rejects the previous plan', () => {
    expect(
      shouldApplyUnitBackedPlan({
        activeTurnId: TURN_FENCE_PENDING,
        planTurnId: 'turn-a',
        previousTurnId: 'turn-a',
      }),
    ).toBe(false);
    expect(
      shouldApplyUnitBackedPlan({
        activeTurnId: TURN_FENCE_PENDING,
        planTurnId: 'turn-b',
        previousTurnId: 'turn-a',
      }),
    ).toBe(true);
  });

  it('null owner still allows greeting payloads', () => {
    expect(shouldIgnorePayloadTurn(null, 'greeting_opening')).toBe(false);
  });
});
