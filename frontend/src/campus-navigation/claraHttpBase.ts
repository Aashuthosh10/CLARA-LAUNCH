/**
 * HTTP origin for REST routes on the CLARA backend (same host as WebSocket).
 * Derives from `VITE_WS_URL` so a single env value keeps WS + HTTP aligned.
 */
export function claraHttpBase(): string {
  const ws =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) ||
    'ws://localhost:6969/ws/clara';
  try {
    const u = new URL(ws.replace(/^ws/i, 'http'));
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:6969';
  }
}
