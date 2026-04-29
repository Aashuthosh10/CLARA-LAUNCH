/**
 * Tracks how many WebSocket client instances are alive (diagnostics).
 * useWebSocket maintains its own pooling; this stays 0 unless registered.
 */

let _count = 0;

export function registerActiveSocket(): () => void {
  _count++;
  return () => {
    _count = Math.max(0, _count - 1);
  };
}

export function getActiveSocketCount(): number {
  return _count;
}
