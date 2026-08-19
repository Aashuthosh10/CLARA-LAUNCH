/** Active while a new user_message has been sent but isProcessing has not assigned turn_id. */
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

/** Ignore payload unless it belongs to the fenced/active turn. Null owner allows greeting/home. */
export function shouldIgnorePayloadTurn(
  activeTurnId: string | null | undefined,
  payloadTurnId: string | null | undefined,
): boolean {
  if (!activeTurnId) return false;
  if (activeTurnId === TURN_FENCE_PENDING) return true;
  const tid = (payloadTurnId || '').trim();
  if (!tid) return false;
  return tid !== activeTurnId;
}

export function shouldApplyUnitBackedPlan(opts: {
  activeTurnId: string | null | undefined;
  planTurnId: string | null | undefined;
  audioPending?: boolean;
}): boolean {
  const planId = (opts.planTurnId || '').trim();
  if (!planId) return false;
  if (shouldIgnorePayloadTurn(opts.activeTurnId, planId)) return false;
  return planId === opts.activeTurnId;
}
