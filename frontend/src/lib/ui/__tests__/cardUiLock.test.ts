import { describe, expect, it } from 'vitest';
import { engageCardUiLockState } from '../cardUiLock';

describe('engageCardUiLockState', () => {
  it('sets CARD lock without recursion', () => {
    let last: { lock: 'CARD' | 'IDLE'; turnId: string | null } = { lock: 'IDLE', turnId: null };
    for (let i = 0; i < 50; i += 1) {
      last = engageCardUiLockState(`turn-${i}`, last.turnId);
    }
    expect(last.lock).toBe('CARD');
    expect(last.turnId).toBe('turn-49');
  });

  it('uses fallback when owner is blank', () => {
    expect(engageCardUiLockState('  ', 'hod-turn')).toEqual({
      lock: 'CARD',
      turnId: 'hod-turn',
    });
  });

  it('falls back to ui-local when both ids are empty', () => {
    expect(engageCardUiLockState('', null).turnId).toBe('ui-local');
  });
});
