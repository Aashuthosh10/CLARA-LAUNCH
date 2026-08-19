/** Ownership validation — reject only. */

import { OwnershipTokens } from './types';
import { getConversationRuntime } from './conversationRuntimeStore';
import { pushRuntimeEvent } from './diagnostics';

export function assertRuntimeOwnership(expected: OwnershipTokens): boolean {
  const snap = getConversationRuntime();
  const checks: Array<[unknown, unknown]> = [
    [expected.generation, snap.generation],
    [expected.turnId, snap.turnId],
    [expected.presentationId, snap.activePresentationId],
    [expected.sessionId, snap.sessionId],
    [expected.conversationId, snap.conversationId],
    [expected.language, snap.currentLanguage],
  ];
  for (const [exp, act] of checks) {
    if (exp === undefined || exp === null) continue;
    if (act !== exp) {
      pushRuntimeEvent('OWNERSHIP_REJECT', {
        expected: exp,
        actual: act,
        turnId: snap.turnId,
        presentationId: snap.activePresentationId,
        generation: snap.generation,
        language: snap.currentLanguage,
      });
      return false;
    }
  }
  return true;
}

/**
 * Ownership for the live PresentationEngine snapshot → React card index sync.
 *
 * Accept when the snapshot is the currently loaded presentation/turn.
 * Do not require runtime.activePresentationId to be set — freeze-release and
 * load/patch races can null it while the engine is still the active owner.
 *
 * Reject only a *foreign* turn or a *different* non-null presentation id.
 */
export function assertLivePresentationOwnership(args: {
  snapshotPresentationId: string | null | undefined;
  loadedTurnId: string | null | undefined;
}): boolean {
  const snap = getConversationRuntime();
  const loadedTurn = typeof args.loadedTurnId === 'string' && args.loadedTurnId.trim()
    ? args.loadedTurnId.trim()
    : null;
  const snapshotPid =
    typeof args.snapshotPresentationId === 'string' && args.snapshotPresentationId.trim()
      ? args.snapshotPresentationId.trim()
      : null;

  if (loadedTurn && snap.turnId && loadedTurn !== snap.turnId) {
    pushRuntimeEvent('OWNERSHIP_REJECT', {
      reason: 'stale_turn',
      expected: loadedTurn,
      actual: snap.turnId,
      turnId: snap.turnId,
      presentationId: snap.activePresentationId,
    });
    return false;
  }

  if (
    snapshotPid &&
    snap.activePresentationId &&
    snap.activePresentationId !== snapshotPid
  ) {
    pushRuntimeEvent('OWNERSHIP_REJECT', {
      reason: 'stale_presentation',
      expected: snapshotPid,
      actual: snap.activePresentationId,
      turnId: snap.turnId,
      presentationId: snap.activePresentationId,
    });
    return false;
  }

  return true;
}
