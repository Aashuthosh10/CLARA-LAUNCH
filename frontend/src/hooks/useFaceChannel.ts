import { useCallback, useEffect, useMemo, useRef } from 'react';

export type FaceEmotion = 'neutral' | 'happy' | 'focused' | 'confused';

type ClaraSpeech = {
  type: 'clara_speech';
  turnId: string;
  sentences: string[];
  durationsMs: number[];
  emotion: FaceEmotion;
  emotionHint?: 'calm';
};

type ClaraThinking = { type: 'clara_thinking'; turnId: string };
type ClaraInterrupt = { type: 'clara_interrupt'; turnId: string };
type ClaraIdle = { type: 'clara_idle'; turnId: string };

type FaceReady = { type: 'face_ready' };

type PendingMsg = ClaraSpeech | ClaraThinking | ClaraInterrupt | ClaraIdle;

function isFaceReadyMessage(value: unknown): value is FaceReady {
  if (!value || typeof value !== 'object') return false;
  return (value as { type?: unknown }).type === 'face_ready';
}

function isWindowLike(value: unknown): value is Window {
  return Boolean(value) && typeof (value as Window).postMessage === 'function';
}

/** Face runs on localhost vs 127.0.0.1 interchangeably in dev. */
function isFaceWindowOrigin(origin: string, configured: string): boolean {
  if (origin === configured) return true;
  try {
    const a = new URL(origin);
    const b = new URL(configured);
    if (a.protocol !== b.protocol || a.port !== b.port) return false;
    const loopback = (h: string) => h === 'localhost' || h === '127.0.0.1';
    return loopback(a.hostname) && loopback(b.hostname);
  } catch {
    return false;
  }
}

function computeSecondScreenPopupFeatures() {
  const w = 1920;
  const h = 1080;
  // Best-effort multi-monitor positioning.
  // If the OS exposes a secondary monitor, it often sits at +availWidth on the X axis.
  const baseLeft = window.screenX ?? window.screenLeft ?? 0;
  const baseTop = window.screenY ?? window.screenTop ?? 0;
  const left = Math.round(baseLeft + (window.screen?.availWidth ?? w));
  const top = Math.round(baseTop);
  return `popup,width=${w},height=${h},left=${left},top=${top}`;
}

export function useFaceChannel() {
  const faceOrigin = import.meta.env.VITE_FACE_ORIGIN || 'http://localhost:5177';
  const enabled = (import.meta.env.VITE_FACE_DISPLAY || '').toLowerCase() !== 'off';

  const faceWindowRef = useRef<Window | null>(null);
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const resolveReadyRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<PendingMsg[]>([]);

  const flush = useCallback(() => {
    const w = faceWindowRef.current;
    if (!w) return;
    while (queueRef.current.length) {
      const msg = queueRef.current.shift()!;
      w.postMessage(msg, faceOrigin);
    }
  }, [faceOrigin]);

  useEffect(() => {
    if (!enabled) return;
    const onMessage = (event: MessageEvent) => {
      if (!isFaceWindowOrigin(event.origin, faceOrigin)) return;
      if (!isFaceReadyMessage(event.data)) return;
      if (resolveReadyRef.current) resolveReadyRef.current();
      resolveReadyRef.current = null;
      flush();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [enabled, faceOrigin, flush]);

  const ensureReadyPromise = useCallback(() => {
    if (readyPromiseRef.current) return readyPromiseRef.current;
    readyPromiseRef.current = new Promise<void>((resolve) => {
      resolveReadyRef.current = resolve;
    });
    return readyPromiseRef.current;
  }, []);

  const openFaceWindow = useCallback(() => {
    if (!enabled) return false;
    if (faceWindowRef.current && !faceWindowRef.current.closed) return true;
    const url = faceOrigin.includes('?') ? `${faceOrigin}&kiosk=1` : `${faceOrigin}?kiosk=1`;
    const w = window.open(url, 'claraFace', computeSecondScreenPopupFeatures());
    if (!isWindowLike(w)) return false;
    faceWindowRef.current = w;
    readyPromiseRef.current = null;
    resolveReadyRef.current = null;
    ensureReadyPromise();
    return true;
  }, [enabled, ensureReadyPromise, faceOrigin]);

  const post = useCallback(
    (msg: PendingMsg) => {
      if (!enabled) return;
      const w = faceWindowRef.current;
      if (!w || w.closed || resolveReadyRef.current) {
        queueRef.current.push(msg);
        return;
      }
      w.postMessage(msg, faceOrigin);
    },
    [enabled, faceOrigin],
  );

  const postSpeech = useCallback(
    (payload: Omit<ClaraSpeech, 'type'>) => post({ type: 'clara_speech', ...payload }),
    [post],
  );
  const postThinking = useCallback(
    (turnId: string | null | undefined) => {
      const tid = (turnId ?? '').trim();
      if (!tid) return;
      post({ type: 'clara_thinking', turnId: tid });
    },
    [post],
  );
  const postInterrupt = useCallback(
    (turnId: string | null | undefined) => {
      const tid = (turnId ?? '').trim();
      if (!tid) return;
      post({ type: 'clara_interrupt', turnId: tid });
    },
    [post],
  );
  const postIdle = useCallback(
    (turnId: string | null | undefined) => {
      const tid = (turnId ?? '').trim();
      if (!tid) return;
      post({ type: 'clara_idle', turnId: tid });
    },
    [post],
  );

  return useMemo(
    () => ({
      enabled,
      faceOrigin,
      openFaceWindow,
      postSpeech,
      postThinking,
      postInterrupt,
      postIdle,
      ready: ensureReadyPromise(),
    }),
    [enabled, faceOrigin, openFaceWindow, postSpeech, postThinking, postInterrupt, postIdle, ensureReadyPromise],
  );
}

export type FaceChannel = ReturnType<typeof useFaceChannel>;
