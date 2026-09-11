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
  // Prefer coordinates injected by the kiosk installer (actual detected geometry).
  const confLeft = Number(import.meta.env.VITE_FACE_WINDOW_LEFT);
  const confTop = Number(import.meta.env.VITE_FACE_WINDOW_TOP);
  const confW = Number(import.meta.env.VITE_FACE_WINDOW_WIDTH);
  const confH = Number(import.meta.env.VITE_FACE_WINDOW_HEIGHT);
  if (
    Number.isFinite(confLeft) &&
    Number.isFinite(confTop) &&
    Number.isFinite(confW) &&
    Number.isFinite(confH) &&
    confW > 0 &&
    confH > 0
  ) {
    return `popup=yes,toolbar=no,location=no,menubar=no,status=no,scrollbars=no,resizable=no,width=${Math.round(confW)},height=${Math.round(confH)},left=${Math.round(confLeft)},top=${Math.round(confTop)}`;
  }
  const w = 1920;
  const h = 1080;
  const baseLeft = window.screenX ?? window.screenLeft ?? 0;
  const baseTop = window.screenY ?? window.screenTop ?? 0;
  const left = Math.round(baseLeft + (window.screen?.availWidth ?? w));
  const top = Math.round(baseTop);
  return `popup=yes,toolbar=no,location=no,menubar=no,status=no,scrollbars=no,resizable=no,width=${w},height=${h},left=${left},top=${top}`;
}

function resolveFaceBridgeUrl(): string | null {
  const fromEnv = (import.meta.env.VITE_FACE_BRIDGE_URL || '').trim();
  if (fromEnv) return fromEnv;
  try {
    if (new URLSearchParams(window.location.search).get('faceBridge') === '1') {
      return 'ws://127.0.0.1:6969/ws/face-bridge?role=main';
    }
  } catch {
    /* ignore */
  }
  if ((import.meta.env.VITE_FACE_EXTERNAL_KIOSK || '').toLowerCase() === 'true') {
    return 'ws://127.0.0.1:6969/ws/face-bridge?role=main';
  }
  return null;
}

export function useFaceChannel() {
  const faceOrigin = import.meta.env.VITE_FACE_ORIGIN || 'http://localhost:5177';
  const enabled = (import.meta.env.VITE_FACE_DISPLAY || '').toLowerCase() !== 'off';
  const bridgeUrl = resolveFaceBridgeUrl();
  const externalKiosk = Boolean(bridgeUrl);

  const faceWindowRef = useRef<Window | null>(null);
  const bridgeRef = useRef<WebSocket | null>(null);
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const resolveReadyRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<PendingMsg[]>([]);
  const faceReadyRef = useRef(false);

  const flush = useCallback(() => {
    if (externalKiosk) {
      const ws = bridgeRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !faceReadyRef.current) return;
      while (queueRef.current.length) {
        ws.send(JSON.stringify(queueRef.current.shift()!));
      }
      return;
    }
    const w = faceWindowRef.current;
    if (!w) return;
    while (queueRef.current.length) {
      const msg = queueRef.current.shift()!;
      w.postMessage(msg, faceOrigin);
    }
  }, [externalKiosk, faceOrigin]);

  useEffect(() => {
    if (!enabled) return;

    if (externalKiosk && bridgeUrl) {
      let closed = false;
      let retryTimer: number | undefined;
      const connect = () => {
        if (closed) return;
        const ws = new WebSocket(bridgeUrl);
        bridgeRef.current = ws;
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'clara_face_ping' }));
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(String(event.data));
            if (!isFaceReadyMessage(data)) return;
            faceReadyRef.current = true;
            if (resolveReadyRef.current) resolveReadyRef.current();
            resolveReadyRef.current = null;
            flush();
          } catch {
            /* ignore */
          }
        };
        ws.onclose = () => {
          faceReadyRef.current = false;
          if (!closed) retryTimer = window.setTimeout(connect, 1500);
        };
      };
      connect();
      return () => {
        closed = true;
        if (retryTimer) window.clearTimeout(retryTimer);
        bridgeRef.current?.close();
        bridgeRef.current = null;
      };
    }

    const onMessage = (event: MessageEvent) => {
      if (!isFaceWindowOrigin(event.origin, faceOrigin)) return;
      if (!isFaceReadyMessage(event.data)) return;
      if (resolveReadyRef.current) resolveReadyRef.current();
      resolveReadyRef.current = null;
      flush();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [bridgeUrl, enabled, externalKiosk, faceOrigin, flush]);

  const ensureReadyPromise = useCallback(() => {
    if (readyPromiseRef.current) return readyPromiseRef.current;
    readyPromiseRef.current = new Promise<void>((resolve) => {
      resolveReadyRef.current = resolve;
    });
    return readyPromiseRef.current;
  }, []);

  const openFaceWindow = useCallback(() => {
    if (!enabled) return false;
    // External Chrome --kiosk owns the face window — never spawn a decorated popup.
    if (externalKiosk) {
      ensureReadyPromise();
      if (bridgeRef.current?.readyState === WebSocket.OPEN) {
        bridgeRef.current.send(JSON.stringify({ type: 'clara_face_ping' }));
      }
      return true;
    }
    if (faceWindowRef.current && !faceWindowRef.current.closed) return true;
    const url = faceOrigin.includes('?') ? `${faceOrigin}&kiosk=1` : `${faceOrigin}?kiosk=1`;
    const w = window.open(url, 'claraFace', computeSecondScreenPopupFeatures());
    if (!isWindowLike(w)) return false;
    faceWindowRef.current = w;
    readyPromiseRef.current = null;
    resolveReadyRef.current = null;
    ensureReadyPromise();
    return true;
  }, [enabled, ensureReadyPromise, externalKiosk, faceOrigin]);

  const post = useCallback(
    (msg: PendingMsg) => {
      if (!enabled) return;
      if (externalKiosk) {
        if (!faceReadyRef.current || resolveReadyRef.current) {
          queueRef.current.push(msg);
          return;
        }
        const ws = bridgeRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          queueRef.current.push(msg);
          return;
        }
        ws.send(JSON.stringify(msg));
        return;
      }
      const w = faceWindowRef.current;
      if (!w || w.closed || resolveReadyRef.current) {
        queueRef.current.push(msg);
        return;
      }
      w.postMessage(msg, faceOrigin);
    },
    [enabled, externalKiosk, faceOrigin],
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
      externalKiosk,
    }),
    [
      enabled,
      faceOrigin,
      openFaceWindow,
      postSpeech,
      postThinking,
      postInterrupt,
      postIdle,
      ensureReadyPromise,
      externalKiosk,
    ],
  );
}

export type FaceChannel = ReturnType<typeof useFaceChannel>;
