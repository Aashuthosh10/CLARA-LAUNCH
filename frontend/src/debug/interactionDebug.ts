/**
 * Optional NDJSON debug ingest. Disabled by default so dead localhost ingest
 * ports do not spam the browser console with ERR_CONNECTION_REFUSED.
 *
 * Enable only when a local debug collector is running:
 *   VITE_DEBUG_INGEST_URL=http://127.0.0.1:PORT/ingest/...
 */

export const DEBUG_SESSION_ID = 'd4f470';

function ingestUrl(): string | null {
  const raw = import.meta.env.VITE_DEBUG_INGEST_URL;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** One-line ingest; errors ignored to avoid disrupting kiosk UX. */
export function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data?: Record<string, unknown>,
  runId: string = 'pre-fix'
): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[CLARA_AGENT]', hypothesisId, message, { location, runId, ...(data ?? {}) });
  }

  const url = ingestUrl();
  if (!url) return;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      hypothesisId,
      location,
      message,
      data: data ?? {},
      timestamp: Date.now(),
      runId,
    }),
  }).catch(() => {});
}

export function auditPointerInteraction(
  clientX: number,
  clientY: number,
  hypothesisId = 'H1'
): Record<string, unknown> {
  const chatNodes = typeof document !== 'undefined'
    ? document.querySelectorAll('[data-testid="chat-screen"]').length
    : 0;
  const sleepNodes = typeof document !== 'undefined'
    ? document.querySelectorAll('[data-testid="sleep-screen"]').length
    : 0;
  const motionDivsMain = typeof document !== 'undefined'
    ? document.querySelectorAll('main > div[class*="motion"]').length
    : 0;

  const stack: Array<{
    tag: string;
    testid: string | null;
    cn: string;
    pe: string;
    z?: string | null;
  }> = [];
  if (typeof document !== 'undefined') {
    const list = document.elementsFromPoint(clientX, clientY);
    for (let i = 0; i < Math.min(10, list.length); i += 1) {
      const el = list[i] as HTMLElement;
      const cs = window.getComputedStyle(el);
      stack.push({
        tag: el.tagName,
        testid: el.getAttribute('data-testid'),
        cn: (el.className?.toString?.() ?? '').slice(0, 120),
        pe: cs.pointerEvents,
        z: cs.zIndex,
      });
    }
  }

  return {
    clientX,
    clientY,
    countChatScreen: chatNodes,
    countSleepScreen: sleepNodes,
    mainMotionChildren: motionDivsMain,
    hitStack: stack,
  };
}

export function registerClaraDebugInteractionAudit(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as {
    claraDebug?: Record<string, unknown>;
  };
  w.claraDebug = {
    ...(w.claraDebug ?? {}),
    interactionAudit: (cx?: number, cy?: number) => {
      const x = cx ?? window.innerWidth / 2;
      const y = cy ?? window.innerHeight / 2;
      return auditPointerInteraction(x, y, 'H_tool');
    },
    _debugSession: DEBUG_SESSION_ID,
  };
}
