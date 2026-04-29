/**
 * Pluggable WebSocket snapshot for kiosk diagnostics and optional initKioskSync.
 * The main app uses useWebSocket() directly; this store is a lightweight holder
 * diagnostics can read and initKioskSync can subscribe to once wired.
 */

export type ConnectionPhaseLabel =
  | 'initial_connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export interface ClaraWSStoreSnapshot {
  phase: ConnectionPhaseLabel;
  isConnected: boolean;
  retryCount: number;
  appState: number;
  payload: unknown;
}

type Listener = () => void;

const snapshots = new Map<string, ClaraWSStoreSnapshot>();
const listenersByUrl = new Map<string, Set<Listener>>();

function defaultSnapshot(): ClaraWSStoreSnapshot {
  return {
    phase: 'initial_connecting',
    isConnected: false,
    retryCount: 0,
    appState: 0,
    payload: null,
  };
}

function notify(url: string) {
  listenersByUrl.get(url)?.forEach((l) => l());
}

/** Returns a singleton store per wsUrl (for diagnostics / future kiosk sync). */
export function getStore(wsUrl: string) {
  if (!snapshots.has(wsUrl)) {
    snapshots.set(wsUrl, defaultSnapshot());
  }
  if (!listenersByUrl.has(wsUrl)) {
    listenersByUrl.set(wsUrl, new Set());
  }

  return {
    getSnapshot: (): ClaraWSStoreSnapshot => ({
      ...(snapshots.get(wsUrl) ?? defaultSnapshot()),
    }),
    subscribe(listener: Listener) {
      listenersByUrl.get(wsUrl)?.add(listener);
      return () => listenersByUrl.get(wsUrl)?.delete(listener);
    },
    /** Replace snapshot (e.g. when wiring to the real socket layer). */
    setSnapshot(partial: Partial<ClaraWSStoreSnapshot>) {
      const cur = snapshots.get(wsUrl) ?? defaultSnapshot();
      snapshots.set(wsUrl, { ...cur, ...partial });
      notify(wsUrl);
    },
  };
}
