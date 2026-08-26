/**
 * K1 visitor-session identity and session-scoped language persistence.
 *
 * Persistence is visitor-session scoped (sessionStorage): it survives an
 * accidental page refresh and React remounts within the same tab, but is
 * deterministically cleared when the visitor session ends (End Session,
 * Back to Sleep, idle timeout, explicit reset) or when the kiosk tab closes.
 * Nothing leaks across kiosk visitors via permanent storage.
 *
 * Stored values are canonical codes only; invalid or obsolete values fail
 * safely to "language not selected".
 */

import { parseLanguageCode, type LanguageCode } from './languageCodes';

const VISITOR_ID_KEY = 'clara_visitor_id';
const VISITOR_LANGUAGE_KEY = 'clara_visitor_language';
const WELCOME_DONE_KEY = 'clara_visitor_welcome_done';

function safeGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable — in-memory-only continuity */
  }
}

function safeRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Idempotently ensure an active visitor session exists; returns its id. */
export function beginVisitorSession(): string {
  const existing = safeGet(VISITOR_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  safeSet(VISITOR_ID_KEY, id);
  return id;
}

export function getVisitorSessionId(): string | null {
  return safeGet(VISITOR_ID_KEY);
}

/** Store the selected canonical code for the active visitor session. */
export function setVisitorLanguage(code: LanguageCode): void {
  if (!getVisitorSessionId()) beginVisitorSession();
  safeSet(VISITOR_LANGUAGE_KEY, code);
}

/**
 * Read the stored canonical code. Invalid or obsolete values fail closed
 * to null ("language not selected"), never silently to English.
 */
export function getVisitorLanguage(): LanguageCode | null {
  return parseLanguageCode(safeGet(VISITOR_LANGUAGE_KEY));
}

export function markWelcomeCompleted(): void {
  if (!getVisitorSessionId()) return;
  safeSet(WELCOME_DONE_KEY, '1');
}

export function isWelcomeCompleted(): boolean {
  if (!getVisitorSessionId()) return false;
  return safeGet(WELCOME_DONE_KEY) === '1';
}

/**
 * Deterministic new-visitor boundary: clears the visitor identity, the
 * selected language and the welcome-completed marker together.
 */
export function endVisitorSession(): void {
  safeRemove(VISITOR_ID_KEY);
  safeRemove(VISITOR_LANGUAGE_KEY);
  safeRemove(WELCOME_DONE_KEY);
}
