export type ChatUiLock = 'CARD' | 'TEXT' | 'IDLE';

/**
 * CARD UI lock setter. Must never call itself — the previous ChatScreen
 * implementation recursed and crashed the kiosk (RangeError).
 */
export function engageCardUiLockState(
  ownerTurnId: string,
  fallbackTurnId?: string | null,
): { lock: 'CARD'; turnId: string } {
  const tid =
    ownerTurnId.trim() ||
    (typeof fallbackTurnId === 'string' ? fallbackTurnId.trim() : '') ||
    'ui-local';
  return { lock: 'CARD', turnId: tid };
}
