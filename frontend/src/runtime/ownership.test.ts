import { describe, expect, it, beforeEach } from 'vitest';
import {
  assertLivePresentationOwnership,
  assertRuntimeOwnership,
} from './ownership';
import {
  patchConversationRuntime,
  resetConversationRuntime,
} from './conversationRuntimeStore';

describe('assertRuntimeOwnership', () => {
  beforeEach(() => {
    resetConversationRuntime();
  });

  it('rejects a stale presentation id when runtime has a different active presentation', () => {
    patchConversationRuntime({
      turnId: 'turn-a',
      activePresentationId: 'pres-live',
    });
    expect(
      assertRuntimeOwnership({
        presentationId: 'pres-stale',
        turnId: 'turn-a',
      }),
    ).toBe(false);
  });
});

describe('assertLivePresentationOwnership', () => {
  beforeEach(() => {
    resetConversationRuntime();
  });

  it('accepts the active presentation when runtime presentation id matches', () => {
    patchConversationRuntime({
      turnId: 'turn-a',
      activePresentationId: 'pres-live',
    });
    expect(
      assertLivePresentationOwnership({
        snapshotPresentationId: 'pres-live',
        loadedTurnId: 'turn-a',
      }),
    ).toBe(true);
  });

  it('accepts the active presentation when runtime activePresentationId is still null (load race)', () => {
    patchConversationRuntime({
      turnId: 'turn-a',
      activePresentationId: null,
    });
    expect(
      assertLivePresentationOwnership({
        snapshotPresentationId: 'pres-live',
        loadedTurnId: 'turn-a',
      }),
    ).toBe(true);
  });

  it('rejects a stale turn even if presentation id is unset', () => {
    patchConversationRuntime({
      turnId: 'turn-b',
      activePresentationId: null,
    });
    expect(
      assertLivePresentationOwnership({
        snapshotPresentationId: 'pres-a',
        loadedTurnId: 'turn-a',
      }),
    ).toBe(false);
  });

  it('rejects a foreign presentation id', () => {
    patchConversationRuntime({
      turnId: 'turn-a',
      activePresentationId: 'pres-new',
    });
    expect(
      assertLivePresentationOwnership({
        snapshotPresentationId: 'pres-old',
        loadedTurnId: 'turn-a',
      }),
    ).toBe(false);
  });
});
