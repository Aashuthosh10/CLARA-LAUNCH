import { beforeEach, describe, expect, it } from 'vitest';
import {
  beginVisitorSession,
  endVisitorSession,
  getVisitorLanguage,
  getVisitorSessionId,
  isWelcomeCompleted,
  markWelcomeCompleted,
  setVisitorLanguage,
} from '../visitorSession';

/** Minimal sessionStorage shim (visitorSession reads window.sessionStorage). */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

describe('K1 visitor session lifecycle', () => {
  beforeEach(() => {
    (globalThis as any).window = { sessionStorage: new MemoryStorage() };
    endVisitorSession();
  });

  it('initial state has no visitor and no selected language', () => {
    expect(getVisitorSessionId()).toBeNull();
    expect(getVisitorLanguage()).toBeNull();
    expect(isWelcomeCompleted()).toBe(false);
  });

  it('wake begins a stable visitor identity', () => {
    const id = beginVisitorSession();
    expect(beginVisitorSession()).toBe(id);
    expect(getVisitorSessionId()).toBe(id);
  });

  it('stores and restores the canonical code across a simulated refresh', () => {
    beginVisitorSession();
    setVisitorLanguage('kn');
    expect(getVisitorLanguage()).toBe('kn');
    // Simulated refresh: same tab storage, fresh module consumers still read kn.
    expect((globalThis as any).window.sessionStorage.getItem('clara_visitor_language')).toBe('kn');
  });

  it('invalid or obsolete stored language fails safe to not-selected', () => {
    beginVisitorSession();
    (globalThis as any).window.sessionStorage.setItem('clara_visitor_language', 'kn-IN');
    expect(getVisitorLanguage()).toBeNull();
    (globalThis as any).window.sessionStorage.setItem('clara_visitor_language', 'Kannada');
    expect(getVisitorLanguage()).toBeNull();
  });

  it('welcome completion requires an active visitor session', () => {
    markWelcomeCompleted();
    expect(isWelcomeCompleted()).toBe(false);
    beginVisitorSession();
    markWelcomeCompleted();
    expect(isWelcomeCompleted()).toBe(true);
  });

  it('end of visitor session clears language, identity and welcome state', () => {
    beginVisitorSession();
    setVisitorLanguage('kn');
    markWelcomeCompleted();
    endVisitorSession();
    expect(getVisitorSessionId()).toBeNull();
    expect(getVisitorLanguage()).toBeNull();
    expect(isWelcomeCompleted()).toBe(false);
  });

  it('the next visitor does not inherit the previous language', () => {
    beginVisitorSession();
    setVisitorLanguage('kn');
    markWelcomeCompleted();
    endVisitorSession(); // Back to Sleep / End Session / timeout / reset
    beginVisitorSession(); // next visitor taps
    expect(getVisitorLanguage()).toBeNull();
    expect(isWelcomeCompleted()).toBe(false);
  });
});
