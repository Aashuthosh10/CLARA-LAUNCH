/** DEV-gated runtime timeline. */

const MAX = 200;
const timeline: Array<Record<string, unknown>> = [];

export function pushRuntimeEvent(event: string, fields: Record<string, unknown> = {}): void {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) {
    // Still keep a tiny buffer in prod but do not console spam.
    timeline.push({ event, ...fields, t: Date.now() });
    if (timeline.length > MAX) timeline.shift();
    return;
  }
  const entry = { event, ...fields, t: Date.now() };
  timeline.push(entry);
  if (timeline.length > MAX) timeline.shift();
  if (typeof console !== 'undefined' && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[RUNTIME]', entry);
  }
}

export function getRuntimeTimeline(): Array<Record<string, unknown>> {
  return [...timeline];
}

export function clearRuntimeTimeline(): void {
  timeline.length = 0;
}
