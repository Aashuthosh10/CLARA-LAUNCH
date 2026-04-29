/** Semantic kiosk states (Stage 3 hardened runtime). */
export enum KioskState {
  OFFLINE = 'OFFLINE',
  SLEEP = 'SLEEP',
  WAKING = 'WAKING',
  LANGUAGE_SELECT = 'LANGUAGE_SELECT',
  GREETING = 'GREETING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  MENU = 'MENU',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
}

export interface KioskSnapshot {
  currentState: KioskState;
  previousState: KioskState | null;
  /** Incremented once per kioskStore.resetSession (Home-aligned hard reset). */
  hardResetEpoch: number;
  /** Canonical UI route id — always SLEEP after resetSession until wake. */
  activeScreen: string;
  /** New-user session onboarding (wake → language gate) — cleared on reset. */
  onboardingCompleted: boolean;
  /** Whether user explicitly picked a kiosk language — cleared on reset. */
  languageSelected: boolean;
  layoutMode: string;
  messages: unknown[];
  activeCards: unknown[] | null;
  currentCardIdx: number;
  activeDepartmentId: string | null;
  orbState: 'idle' | 'listening' | 'processing' | 'speaking';
  isPlayingAudio: boolean;
  isBusy: boolean;
  isMicLocked: boolean;
  hasUserInteracted: boolean;
  sessionId: string | null;
  language: string;
  lastTransitionTimestamp: number;
  /** Cleared every resetSession — kiosk-level interaction guard (wake/chat ownership). */
  interactionLocked: boolean;
  wakeRouteStale: boolean;
}
