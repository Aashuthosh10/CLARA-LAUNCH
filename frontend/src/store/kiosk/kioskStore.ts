/**
 * src/store/kiosk/kioskStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized Global Kiosk Store (Stage 3 Hardened).
 *
 * Stage 3 changes:
 * - initKioskSync is guarded against double-call (Risk #8)
 * - Message array is capped at MAX_MESSAGES (Risk #9)
 * - notify() tracks update frequency for diagnostics
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { KioskState, KioskSnapshot } from './types';
import { isValidTransition, mapBackendState } from './stateMachine';
import { getStore as getWSStore } from '../../lib/ws/state';
import { initWatchdog } from '../../lib/kiosk/watchdog';

const IDLE_TIMEOUT_MS = 30000; // 30 seconds
const MAX_MESSAGES = 50;       // Cap message array to prevent unbounded growth

const INITIAL_STATE: KioskSnapshot = {
    currentState: KioskState.SLEEP,
    previousState: null,
    hardResetEpoch: 0,
    activeScreen: 'SLEEP',
    onboardingCompleted: false,
    languageSelected: false,
    layoutMode: 'FULL_TEXT',
    messages: [],
    activeCards: null,
    currentCardIdx: 0,
    activeDepartmentId: null,
    orbState: 'idle',
    isPlayingAudio: false,
    isBusy: false,
    isMicLocked: false,
    hasUserInteracted: false,
    sessionId: null,
    language: 'English',
    lastTransitionTimestamp: Date.now(),
    interactionLocked: false,
    wakeRouteStale: false,
};

let currentSnapshot = { ...INITIAL_STATE };
const listeners = new Set<() => void>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;

// ── Diagnostics counters (read by runtimeDiagnostics.ts) ──────────────────
let _notifyCount = 0;
let _notifyWindowStart = Date.now();

/** Returns notifications-per-second over the last window. */
export function getNotifyRate(): number {
    const elapsed = (Date.now() - _notifyWindowStart) / 1000;
    if (elapsed < 1) return _notifyCount;
    const rate = _notifyCount / elapsed;
    // Reset window periodically
    if (elapsed > 10) {
        _notifyCount = 0;
        _notifyWindowStart = Date.now();
    }
    return rate;
}

function notify() {
    _notifyCount++;
    listeners.forEach(l => l());
}

function startIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (currentSnapshot.currentState === KioskState.SLEEP) return;

    idleTimer = setTimeout(() => {
        if (import.meta.env.DEV) console.log('[KIOSK] Session expired due to inactivity.');
        kioskStore.resetSession();
    }, IDLE_TIMEOUT_MS);
}

export const kioskStore = {
    getSnapshot: () => currentSnapshot,

    subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    /** Returns current subscriber count (for leak detection). */
    getSubscriberCount: () => listeners.size,

    dispatchTransition: (nextState: KioskState, force = false) => {
        const from = currentSnapshot.currentState;
        if (!force && !isValidTransition(from, nextState)) {
            if (import.meta.env.DEV) {
                console.debug(`[KIOSK] Rejected transition: ${from} → ${nextState}`);
            }
            return;
        }

        currentSnapshot = {
            ...currentSnapshot,
            previousState: from,
            currentState: nextState,
            lastTransitionTimestamp: Date.now(),
            activeScreen: nextState === KioskState.SLEEP ? 'SLEEP' :
                nextState === KioskState.LANGUAGE_SELECT ? 'LANGUAGE' :
                    nextState === KioskState.GREETING ? 'WELCOME' :
                        nextState === KioskState.ERROR ? 'ERROR' : 'CHAT',
        };

        if (nextState !== KioskState.LISTENING) {
            currentSnapshot.isMicLocked = false;
        }

        startIdleTimer();
        notify();
    },

    updateContent: (updates: Partial<KioskSnapshot>) => {
        // Cap message array to prevent unbounded growth over long sessions
        if (updates.messages && updates.messages.length > MAX_MESSAGES) {
            updates = { ...updates, messages: updates.messages.slice(-MAX_MESSAGES) };
        }
        currentSnapshot = { ...currentSnapshot, ...updates };
        startIdleTimer();
        notify();
    },

    setOrbState: (state: KioskSnapshot['orbState']) => {
        if (currentSnapshot.orbState === state) return; // Skip no-op updates
        currentSnapshot = { ...currentSnapshot, orbState: state };
        notify();
    },

    setIsPlayingAudio: (playing: boolean) => {
        if (currentSnapshot.isPlayingAudio === playing) return; // Skip no-op updates
        currentSnapshot = { ...currentSnapshot, isPlayingAudio: playing };
        notify();
    },

    poke: () => {
        currentSnapshot = { ...currentSnapshot, hasUserInteracted: true };
        startIdleTimer();
        notify();
    },

    resetSession: () => {
        const hr = currentSnapshot.hardResetEpoch + 1;
        currentSnapshot = { ...INITIAL_STATE, hardResetEpoch: hr, lastTransitionTimestamp: Date.now() };
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = null;
        notify();
    },

    /** Release semantic kiosk locks without clearing full snapshot (recovery). */
    clearSemanticLocks: () => {
        currentSnapshot = {
            ...currentSnapshot,
            interactionLocked: false,
            wakeRouteStale: false,
            isMicLocked: false,
            isBusy: false,
            isPlayingAudio: false,
        };
        notify();
    },
};

// ── initKioskSync (guarded against double-call) ─────────────────────────────

let _syncInitialized = false;

export function initKioskSync(wsUrl: string) {
    if (_syncInitialized) {
        if (import.meta.env.DEV) console.warn('[KIOSK] initKioskSync already called — skipping duplicate.');
        return;
    }
    _syncInitialized = true;

    initWatchdog(); // Start self-healing (Stage 3)

    const wsStore = getWSStore(wsUrl);
    wsStore.subscribe(() => {
        const wsSnap = wsStore.getSnapshot();
        if (!wsSnap.isConnected && currentSnapshot.currentState !== KioskState.OFFLINE) {
            kioskStore.dispatchTransition(KioskState.OFFLINE, true);
        } else if (wsSnap.isConnected && currentSnapshot.currentState === KioskState.OFFLINE) {
            kioskStore.dispatchTransition(KioskState.SLEEP, true);
        }
        const mappedState = mapBackendState(wsSnap.appState);
        if (mappedState !== currentSnapshot.currentState) {
            kioskStore.dispatchTransition(mappedState);
        }
        if (wsSnap.payload && typeof wsSnap.payload === 'object' && wsSnap.payload !== null) {
            const p = wsSnap.payload as Record<string, unknown>;
            const updates: Partial<KioskSnapshot> = {};
            if ('messages' in p && Array.isArray(p.messages)) {
                updates.messages = p.messages;
            }
            if ('showCard' in p && p.showCard) {
                updates.layoutMode = 'SPLIT_CARDS';
            }
            if (Object.keys(updates).length) kioskStore.updateContent(updates);
        }
    });
}
