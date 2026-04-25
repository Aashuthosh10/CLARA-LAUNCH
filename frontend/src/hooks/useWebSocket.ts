import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionPhase =
  | 'initial_connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export interface WSMessage {
  state: number;
  payload?: any;
}

const GRACE_MS = 5000;
const RECONNECT_DEBOUNCE_MS = 2000;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 8000;

// Singleton per URL: cleanup never closes the socket so Strict Mode re-run always reuses it.
interface SharedEntry {
  socket: WebSocket;
  refCount: number;
  onConnected: (connected: boolean) => void;
  onMessage: (state: number, payload: any) => void;
  state: number;
  payload: any;
  connectionPhase: ConnectionPhase;
  setPhase: (phase: ConnectionPhase) => void;
}

const sharedByUrl = new Map<string, SharedEntry>();
const hasConnectedOnceByUrl = new Map<string, boolean>();
const connectionPhaseByUrl = new Map<string, ConnectionPhase>();
const phaseListenersByUrl = new Map<string, Set<() => void>>();

function notifyPhaseListeners(url: string) {
  phaseListenersByUrl.get(url)?.forEach((l) => l());
}

const NOOP = () => {};

export function useWebSocket(url: string) {
  const [state, setState] = useState<number>(0);
  const [payload, setPayload] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedConnect, setHasAttemptedConnect] = useState(false);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>(() =>
    connectionPhaseByUrl.get(url) ?? 'initial_connecting'
  );
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const stateRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffAttemptRef = useRef(0);
  const entryRef = useRef<SharedEntry | null>(null);

  const showOfflineBanner = connectionPhase === 'offline';

  useEffect(() => {
    setHasAttemptedConnect(true);

    let entry = sharedByUrl.get(url);
    const needNewSocket = !entry || entry.socket.readyState === WebSocket.CLOSED;

    // Subscribe to phase changes for this URL so we re-render when phase updates
    const phaseListener = () =>
      setConnectionPhase(connectionPhaseByUrl.get(url) ?? 'initial_connecting');
    if (!phaseListenersByUrl.has(url)) phaseListenersByUrl.set(url, new Set());
    phaseListenersByUrl.get(url)!.add(phaseListener);

    const removePhaseListener = () => {
      phaseListenersByUrl.get(url)?.delete(phaseListener);
    };

    if (entry && !needNewSocket) {
      entry.refCount++;
      entry.onConnected = (connected) => setIsConnected(connected);
      entry.onMessage = (s, p) => {
        stateRef.current = s;
        setState(s);
        setPayload(p ?? null);
      };
      entryRef.current = entry;
      setConnectionPhase(entry.connectionPhase);
      if (entry.socket.readyState === WebSocket.OPEN) {
        setIsConnecting(false);
        setIsConnected(true);
        setState(entry.state);
        setPayload(entry.payload);
        stateRef.current = entry.state;
      } else if (entry.socket.readyState === WebSocket.CONNECTING) {
        setIsConnecting(true);
        const syncWhenOpen = () => {
          if (entryRef.current?.socket.readyState === WebSocket.OPEN) {
            setIsConnecting(false);
            setIsConnected(true);
            setState(entryRef.current.state);
            setPayload(entryRef.current.payload);
            stateRef.current = entryRef.current.state;
          }
        };
        const t = setTimeout(syncWhenOpen, 100);
        const t2 = setTimeout(syncWhenOpen, 300);
        return () => {
          clearTimeout(t);
          clearTimeout(t2);
          removePhaseListener();
          const e = entryRef.current ?? entry;
          if (!e) return;
          e.refCount--;
          e.onConnected = NOOP;
          e.onMessage = NOOP;
          entryRef.current = null;
        };
      }
      return () => {
        removePhaseListener();
        const e = entryRef.current ?? entry;
        if (!e) return;
        e.refCount--;
        e.onConnected = NOOP;
        e.onMessage = NOOP;
        entryRef.current = null;
      };
    }

    if (entry && needNewSocket) {
      entry.socket.close();
      sharedByUrl.delete(url);
      entry = null;
    }

    const hasConnectedOnce = hasConnectedOnceByUrl.get(url) ?? false;
    const initialPhase: ConnectionPhase = hasConnectedOnce ? 'reconnecting' : 'initial_connecting';
    connectionPhaseByUrl.set(url, initialPhase);
    notifyPhaseListeners(url);

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      setIsConnecting(false);
      if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) console.debug('WebSocket connection error, retrying…', err);
      const delay = Math.min(
        INITIAL_BACKOFF_MS * 2 ** backoffAttemptRef.current,
        MAX_BACKOFF_MS
      );
      backoffAttemptRef.current = Math.min(backoffAttemptRef.current + 1, 10);
      reconnectTimerRef.current = setTimeout(
        () => {
          reconnectTimerRef.current = null;
          setReconnectTrigger((t) => t + 1);
        },
        delay
      );
      return () => {
        removePhaseListener();
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
    }

    entry = {
      socket,
      refCount: 1,
      onConnected: (connected) => setIsConnected(connected),
      onMessage: (s, p) => {
        stateRef.current = s;
        setState(s);
        setPayload(p ?? null);
      },
      state: 0,
      payload: null,
      connectionPhase: initialPhase,
      setPhase: (phase: ConnectionPhase) => {
        connectionPhaseByUrl.set(url, phase);
        entry!.connectionPhase = phase;
        notifyPhaseListeners(url);
      },
    };
    sharedByUrl.set(url, entry);
    entryRef.current = entry;

    if (!hasConnectedOnce) {
      graceTimerRef.current = setTimeout(() => {
        const current = connectionPhaseByUrl.get(url);
        if (current === 'initial_connecting') {
          connectionPhaseByUrl.set(url, 'offline');
          notifyPhaseListeners(url);
        }
        graceTimerRef.current = null;
      }, GRACE_MS);
    } else {
      reconnectingDebounceRef.current = setTimeout(() => {
        const current = connectionPhaseByUrl.get(url);
        if (current === 'reconnecting') {
          connectionPhaseByUrl.set(url, 'offline');
          notifyPhaseListeners(url);
        }
        reconnectingDebounceRef.current = null;
      }, RECONNECT_DEBOUNCE_MS);
    }

    socket.onopen = () => {
      hasConnectedOnceByUrl.set(url, true);
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      if (reconnectingDebounceRef.current) {
        clearTimeout(reconnectingDebounceRef.current);
        reconnectingDebounceRef.current = null;
      }
      backoffAttemptRef.current = 0;
      entry!.setPhase('connected');
      entry!.onConnected(true);
      if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) console.debug('CLARA WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        if (typeof data.state !== 'number') return;
        const next = data.state;
        const current = entry!.state;
        if (next === 0 && current > 0) return;
        if (next === 4 && current === 5) return;
        entry!.state = next;
        entry!.payload = data.payload ?? null;
        entry!.onMessage(next, entry!.payload);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    socket.onclose = () => {
      entry!.setPhase('reconnecting');
      hasConnectedOnceByUrl.set(url, true);
      sharedByUrl.delete(url);
      if (entry!.refCount > 0) {
        setIsConnecting(false);
        entry!.onConnected(false);
        setIsConnecting(true);
      }
      if (reconnectingDebounceRef.current) {
        clearTimeout(reconnectingDebounceRef.current);
        reconnectingDebounceRef.current = null;
      }
      reconnectingDebounceRef.current = setTimeout(() => {
        const current = connectionPhaseByUrl.get(url);
        if (current === 'reconnecting') {
          connectionPhaseByUrl.set(url, 'offline');
          notifyPhaseListeners(url);
        }
        reconnectingDebounceRef.current = null;
      }, RECONNECT_DEBOUNCE_MS);
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      const delay = Math.min(
        INITIAL_BACKOFF_MS * 2 ** backoffAttemptRef.current,
        MAX_BACKOFF_MS
      );
      backoffAttemptRef.current = Math.min(backoffAttemptRef.current + 1, 10);
      if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
        console.warn(
          'CLARA WebSocket disconnected at',
          url,
          '— Retrying in',
          delay,
          'ms. Ensure backend is running.'
        );
      }
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        setReconnectTrigger((t) => t + 1);
      }, delay);
    };

    socket.onerror = () => {};

    return () => {
      removePhaseListener();
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      if (reconnectingDebounceRef.current) {
        clearTimeout(reconnectingDebounceRef.current);
        reconnectingDebounceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const e = entry!;
      e.refCount--;
      e.onConnected = NOOP;
      e.onMessage = NOOP;
      entryRef.current = null;
    };
  }, [url, reconnectTrigger]);

  const sendMessage = useCallback((msg: any): boolean => {
    const entry = entryRef.current ?? sharedByUrl.get(url);
    if (entry?.socket?.readyState === WebSocket.OPEN) {
      entry.socket.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, [url]);

  const setManualState = useCallback((newState: number, newPayload?: any) => {
    stateRef.current = newState;
    const entry = entryRef.current ?? sharedByUrl.get(url);
    if (entry) {
      entry.state = newState;
      if (newPayload !== undefined) entry.payload = newPayload;
    }
    setState(newState);
    if (newPayload !== undefined) setPayload(newPayload);
  }, [url]);

  const retryConnect = useCallback(() => {
    const entry = sharedByUrl.get(url);
    if (entry?.socket) {
      entry.socket.close();
      sharedByUrl.delete(url);
    }
    backoffAttemptRef.current = 0;
    setReconnectTrigger((t) => t + 1);
  }, [url]);

  return {
    state,
    payload,
    isConnected,
    isConnecting,
    hasAttemptedConnect,
    connectionPhase,
    showOfflineBanner,
    sendMessage,
    setManualState,
    retryConnect,
  };
}
