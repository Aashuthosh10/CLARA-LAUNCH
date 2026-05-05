/**
 * Client-side fallback when backend omits `showCard: "bus_routes"` (mirrors multilingual STT quirks).
 */

const BUS_ROUTE_PHRASES: string[] = [
  'bus routes',
  'bus route',
  'transport facility',
  'college bus',
  'route availability',
  'pickup points',
  'pickup locations',
  'travel to college',
  'travel to svit',
  'shuttle',
  'is there a bus ',
  'do you have transport',
  'how can my child travel',
  'how can child travel',
  'बस रूट',
  'कॉलेज बस',
  'परिवहन सुविधा',
  'ಬಸ್ ಮಾರ್ಗಗಳು',
  'ಕಾಲೇಜು ಬಸ್',
  'பேருந்து வழிகள்',
  'బస్ రూట్లు',
  'ബസ് റൂട്ടുകൾ',
];

function spacedLower(raw: string): string {
  const lower = raw.toLowerCase();
  const t = lower.replace(/[.,!?;:'"()[\]{}<>|/\\@#$%^&*_+=~`-]/g, ' ').replace(/\s+/g, ' ');
  const trim = t.trim();
  if (!trim) return '';
  return ` ${trim} `;
}

function hasAnchoredLatinBusCue(spaced: string): boolean {
  if (!spaced) return false;
  const busMarkers = [' bus ', ' buses ', ' shuttle ', ' transport ', ' pickup ', ' pick-up ', ' pick up '];
  const commuteMarkers = [
    ' route',
    ' routes',
    ' stop',
    ' stops',
    ' timing',
    ' timings',
    ' college',
    ' svit',
    ' campus',
    ' child',
    ' kid',
    ' reach',
    ' commute',
  ];
  const hasBus = busMarkers.some((m) => spaced.includes(m));
  const hasCommute = commuteMarkers.some((m) => spaced.includes(m));
  return hasBus && hasCommute;
}

/** True when user's text clearly asks for SVIT/college transport / pickup info. */
export function inferForcedBusRoutesFromUserText(raw: string | null | undefined): { force: boolean } {
  const text = typeof raw === 'string' ? raw : '';
  const spaced = spacedLower(text);
  if (!spaced) return { force: false };

  const phraseHit = BUS_ROUTE_PHRASES.some((p) => spaced.includes(` ${p.toLowerCase()} `));
  const fromForHit =
    /\bbus\s+from\b/i.test(text) || /\btransport\s+from\b/i.test(text) || /\bbus\s+for\b/i.test(text);

  let force = phraseHit || fromForHit || hasAnchoredLatinBusCue(spaced);

  if (/\broute\b/i.test(text) && !phraseHit && !fromForHit && !hasAnchoredLatinBusCue(spaced)) {
    force = false;
  }

  return { force };
}
