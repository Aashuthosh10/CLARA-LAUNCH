/**
 * src/store/kiosk/stateMachine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Transition matrix and semantic mapping for the Kiosk State Machine.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { KioskState } from './types';

/**
 * Validates if a transition from 'from' to 'to' is architecturally sound.
 * Prevents UI desync and illegal "jumps" (e.g. SLEEP -> SPEAKING).
 */
export function isValidTransition(from: KioskState, to: KioskState): boolean {
    // Always allow moving to OFFLINE or ERROR
    if (to === KioskState.OFFLINE || to === KioskState.ERROR) return true;

    const matrix: Record<KioskState, KioskState[]> = {
        [KioskState.OFFLINE]: [KioskState.SLEEP],
        [KioskState.SLEEP]: [KioskState.WAKING],
        [KioskState.WAKING]: [KioskState.LANGUAGE_SELECT, KioskState.SLEEP],
        [KioskState.LANGUAGE_SELECT]: [KioskState.GREETING, KioskState.SLEEP],
        [KioskState.GREETING]: [KioskState.LISTENING, KioskState.SLEEP, KioskState.SPEAKING],
        [KioskState.LISTENING]: [KioskState.THINKING, KioskState.SLEEP],
        [KioskState.THINKING]: [KioskState.SPEAKING, KioskState.SLEEP],
        [KioskState.SPEAKING]: [KioskState.LISTENING, KioskState.MENU, KioskState.RESULT, KioskState.SLEEP, KioskState.GREETING],
        [KioskState.MENU]: [KioskState.LISTENING, KioskState.THINKING, KioskState.SLEEP],
        [KioskState.RESULT]: [KioskState.LISTENING, KioskState.THINKING, KioskState.SLEEP, KioskState.MENU],
        [KioskState.ERROR]: [KioskState.SLEEP],
    };

    return matrix[from]?.includes(to) ?? false;
}

/**
 * Maps raw backend 'appState' integers to semantic KioskState.
 */
export function mapBackendState(appState: number): KioskState {
    switch (appState) {
        case 0: return KioskState.SLEEP;
        case 3: return KioskState.LANGUAGE_SELECT;
        case 4: return KioskState.THINKING;
        case 5: return KioskState.SPEAKING;
        default: return KioskState.SLEEP; // Fallback
    }
}
