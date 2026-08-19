/** Active while a new user_message has been sent but no current-turn id is claimed yet. */
export const TURN_FENCE_PENDING = '__turn_fence_pending__';

export type TurnFenceEvent =
  | { kind: 'intercept' }
  | { kind: 'isProcessing'; turnId: string }
  | { kind: 'clear' };

export function applyTurnFence(current: string | null, event: TurnFenceEvent): string | null {
  if (event.kind === 'intercept') return TURN_FENCE_PENDING;
  if (event.kind === 'clear') return null;
  const next = event.turnId.trim();
  return next.length > 0 ? next : current;
}

/**
 * Ignore payload unless it belongs to the fenced/active turn.
 * Null owner allows greeting/home.
 *
 * While PENDING, reject the previous turn (stale) but do not reject the
 * next identified turn_id — the caller must adopt it as owner.
 */
export function shouldIgnorePayloadTurn(
  activeTurnId: string | null | undefined,
  payloadTurnId: string | null | undefined,
  previousTurnId?: string | null | undefined,
): boolean {
  if (!activeTurnId) return false;
  const tid = (payloadTurnId || '').trim();
  if (activeTurnId === TURN_FENCE_PENDING) {
    if (!tid) return true;
    const prev = (previousTurnId || '').trim();
    if (prev && tid === prev) return true;
    return false;
  }
  if (!tid) return false;
  return tid !== activeTurnId;
}

export function adoptTurnOwner(
  currentOwner: string | null | undefined,
  payloadTurnId: string | null | undefined,
  previousTurnId?: string | null | undefined,
): string | null {
  if (currentOwner !== TURN_FENCE_PENDING) {
    return currentOwner ?? null;
  }
  if (shouldIgnorePayloadTurn(currentOwner, payloadTurnId, previousTurnId)) {
    return TURN_FENCE_PENDING;
  }
  const tid = (payloadTurnId || '').trim();
  return tid.length > 0 ? tid : TURN_FENCE_PENDING;
}

export function shouldApplyUnitBackedPlan(opts: {
  activeTurnId: string | null | undefined;
  planTurnId: string | null | undefined;
  audioPending?: boolean;
  previousTurnId?: string | null;
}): boolean {
  const planId = (opts.planTurnId || '').trim();
  if (!planId) return false;
  if (shouldIgnorePayloadTurn(opts.activeTurnId, planId, opts.previousTurnId)) return false;
  if (opts.activeTurnId === TURN_FENCE_PENDING) return true;
  return planId === opts.activeTurnId;
}
