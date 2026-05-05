import { useCallback, useEffect, useMemo, useRef } from 'react';

export type FaceEmotion = 'neutral' | 'happy' | 'focused' | 'confused';

export type ClaraSpeechEvent = {
  type: 'clara_speech';
  turnId: string;
  sentences: string[];
  durationsMs: number[];
  emotion: FaceEmotion;
};

export type ClaraThinkingEvent = { type: 'clara_thinking'; turnId: string };
export type ClaraInterruptEvent = { type: 'clara_interrupt'; turnId: string };
export type ClaraIdleEvent = { type: 'clara_idle'; turnId: string };

type Incoming = ClaraSpeechEvent | ClaraThinkingEvent | ClaraInterruptEvent | ClaraIdleEvent;
type FaceReady = { type: 'face_ready' };

/** localhost vs 127.0.0.1 must match or postMessage delivery succeeds but listener rejects. */
function isAllowedMainOrigin(origin: string, expected: string): boolean {
  if (origin === expected) return true;
  try {
    const a = new URL(origin);
    const e = new URL(expected);
    if (a.protocol !== e.protocol || a.port !== e.port) return false;
    const loopback = (h: string) => h === 'localhost' || h === '127.0.0.1';
    return loopback(a.hostname) && loopback(e.hostname);
  } catch {
    return false;
  }
}

function normalizeEmotion(value: unknown): FaceEmotion {
  if (value === 'happy' || value === 'focused' || value === 'confused' || value === 'neutral') return value;
  if (value === 'calm' || value === 'idle') return 'neutral';
  return 'neutral';
}

function isIncoming(value: unknown): value is Incoming {
  if (!value || typeof value !== 'object') return false;
  const data = value as {
    type?: unknown;
    turnId?: unknown;
    sentences?: unknown;
    durationsMs?: unknown;
    totalMs?: unknown;
    emotion?: unknown;
    emotionHint?: unknown;
  };
  if (data.type === 'clara_thinking') return typeof data.turnId === 'string';
  if (data.type === 'clara_interrupt' || data.type === 'clara_idle') return typeof data.turnId === 'string';
  if (data.type !== 'clara_speech' || typeof data.turnId !== 'string' || !Array.isArray(data.sentences)) {
    return false;
  }
  const sentences = data.sentences.filter((sentence): sentence is string => typeof sentence === 'string');
  const legacyTotalMs = typeof data.totalMs === 'number' && Number.isFinite(data.totalMs) ? data.totalMs : 0;
  const rawDurations = Array.isArray(data.durationsMs) ? data.durationsMs : [];
  const durationsMs = sentences.map((sentence, idx) => {
    const duration = rawDurations[idx];
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) return Math.round(duration);
    if (legacyTotalMs > 0 && sentences.length > 0) return Math.round(legacyTotalMs / sentences.length);
    return Math.max(600, sentence.length * 40);
  });
  data.sentences = sentences;
  data.durationsMs = durationsMs;
  data.emotion = normalizeEmotion(data.emotion ?? data.emotionHint);
  return true;
}

export function useParentChannel() {
  const expectedParentOrigin = import.meta.env.VITE_MAIN_ORIGIN || 'http://localhost:5176';
  const latestSpeechRef = useRef<ClaraSpeechEvent | null>(null);
  const listenersRef = useRef({
    speech: new Set<(e: ClaraSpeechEvent) => void>(),
    thinking: new Set<(e: ClaraThinkingEvent) => void>(),
    interrupt: new Set<(e: ClaraInterruptEvent) => void>(),
    idle: new Set<(e: ClaraIdleEvent) => void>(),
  });
  const postReady = useCallback(() => {
    if (!window.opener) return;
    const msg: FaceReady = { type: 'face_ready' };
    window.opener.postMessage(msg, expectedParentOrigin);
  }, [expectedParentOrigin]);

  /** Parent queues speech until face_ready — must signal on load or messages never flush (deadlock). */
  useEffect(() => {
    postReady();
  }, [postReady]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isAllowedMainOrigin(event.origin, expectedParentOrigin)) return;
      if (!isIncoming(event.data)) return;

      const data = event.data;
      switch (data.type) {
        case 'clara_speech':
          latestSpeechRef.current = data;
          listenersRef.current.speech.forEach((l) => l(data));
          break;
        case 'clara_thinking':
          listenersRef.current.thinking.forEach((l) => l(data));
          break;
        case 'clara_interrupt':
          listenersRef.current.interrupt.forEach((l) => l(data));
          break;
        case 'clara_idle':
          listenersRef.current.idle.forEach((l) => l(data));
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [expectedParentOrigin, postReady]);

  const onSpeech = useCallback((cb: (e: ClaraSpeechEvent) => void) => {
    listenersRef.current.speech.add(cb);
    return () => listenersRef.current.speech.delete(cb);
  }, []);
  const onThinking = useCallback((cb: (e: ClaraThinkingEvent) => void) => {
    listenersRef.current.thinking.add(cb);
    return () => listenersRef.current.thinking.delete(cb);
  }, []);
  const onInterrupt = useCallback((cb: (e: ClaraInterruptEvent) => void) => {
    listenersRef.current.interrupt.add(cb);
    return () => listenersRef.current.interrupt.delete(cb);
  }, []);
  const onIdle = useCallback((cb: (e: ClaraIdleEvent) => void) => {
    listenersRef.current.idle.add(cb);
    return () => listenersRef.current.idle.delete(cb);
  }, []);

  return useMemo(
    () => ({
      expectedParentOrigin,
      latestSpeechRef,
      onSpeech,
      onThinking,
      onInterrupt,
      onIdle,
    }),
    [expectedParentOrigin, onSpeech, onThinking, onInterrupt, onIdle],
  );
}
