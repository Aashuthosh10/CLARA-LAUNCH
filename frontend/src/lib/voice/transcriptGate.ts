/**
 * Cheap local transcript gate — no LLM.
 * Rejects empty/garbage/duplicates; keeps short campus queries like "fees?".
 */

const CAMPUS_SHORT_ALLOW = new Set(
  [
    'fees',
    'fee',
    'bus',
    'hod',
    'who',
    'yes',
    'no',
    'cse',
    'ece',
    'ise',
    'mba',
    'aiml',
    'ai',
    'ml',
    'ds',
    'ok',
    'okay',
    'bye',
    'hi',
    'hello',
    // romanized / common
    'illa',
    'beda',
    'nahi',
    'haan',
    'ha',
    'fees?',
    'bus?',
    'hod?',
    'cse?',
  ].map((s) => s.toLowerCase()),
);

const GARBAGE_RE =
  /^(?:um+|uh+|ah+|hmm+|mm+|xxx+|asdf+|qwerty+|test(?:ing)?|blah|noise|background)$/i;

export type TranscriptGateResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'garbage' | 'duplicate' | 'too_short' };

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s?']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isLikelyCampusShortQuery(text: string): boolean {
  const n = normalizeForCompare(text);
  if (!n) return false;
  if (CAMPUS_SHORT_ALLOW.has(n)) return true;
  if (CAMPUS_SHORT_ALLOW.has(n.replace(/\?$/, ''))) return true;
  // Single Indic token of reasonable length (e.g. fees question particles alone are rare)
  if (/^[\p{L}]{2,12}$/u.test(n) && !/^[a-z]+$/i.test(n)) return true;
  return false;
}

export function validateFinalTranscript(raw: string): TranscriptGateResult {
  const text = (raw || '').trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.includes('BACKGROUND_NOISE') || text.includes('**BACKGROUND_NOISE**')) {
    return { ok: false, reason: 'garbage' };
  }
  const n = normalizeForCompare(text);
  if (!n) return { ok: false, reason: 'empty' };
  if (GARBAGE_RE.test(n)) return { ok: false, reason: 'garbage' };

  // Extremely short Latin-only tokens that are not allowlisted campus cues
  if (/^[a-z']{1}$/i.test(n) && !isLikelyCampusShortQuery(n)) {
    return { ok: false, reason: 'too_short' };
  }
  if (n.length === 1 && /^[a-z]$/i.test(n)) {
    return { ok: false, reason: 'too_short' };
  }

  return { ok: true, text };
}

/** Sliding-window duplicate suppressor for recognition glitches. */
export function createDuplicateTranscriptGuard(windowMs = 2500) {
  let lastNorm = '';
  let lastAt = 0;
  return {
    isDuplicate(text: string, now = Date.now()): boolean {
      const n = normalizeForCompare(text);
      if (!n) return false;
      if (n === lastNorm && now - lastAt < windowMs) return true;
      lastNorm = n;
      lastAt = now;
      return false;
    },
    reset() {
      lastNorm = '';
      lastAt = 0;
    },
  };
}
