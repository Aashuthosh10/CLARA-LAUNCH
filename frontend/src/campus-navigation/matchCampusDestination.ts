import type { CampusDirection } from './campusDirections';

/**
 * Normalize transcript for local destination matching.
 * Preserves letters across scripts (Indic included); strips punctuation only.
 */
export function normalizeCampusDestinationTranscript(transcript: string): string {
  const raw = transcript.trim().toLowerCase();
  if (!raw) return '';
  // Keep letters, marks (Indic matras), and numbers — never ASCII-strip regional speech.
  let normalized = raw
    .replace(/[^\p{L}\p{M}\p{N}\s/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Common STT / typing slips for English location questions.
  normalized = normalized
    .replace(/\bwhere si\b/g, 'where is')
    .replace(/\bwher is\b/g, 'where is')
    .replace(/\bware is\b/g, 'where is')
    .replace(/\bprinciple\b/g, 'principal');
  return normalized;
}

/**
 * Best-effort match of speech transcript to a campus destination index.
 * Tolerates room codes ("A 001", "a-001"), full labels, and partial keywords.
 * Prefer backend `/api/campus/match` for conversation authority; this is a
 * local English/code fallback that must not wipe Indic scripts.
 */
export function matchCampusDestinationIndex(
  transcript: string,
  directions: CampusDirection[],
): number | null {
  const normalized = normalizeCampusDestinationTranscript(transcript);
  if (!normalized) return null;

  let bestIdx: number | null = null;
  let bestScore = 0;

  directions.forEach((d, i) => {
    const dest = d.to.toLowerCase().replace(/\bprinciple\b/g, 'principal');
    let score = 0;

    if (normalized.includes(dest)) {
      score += 120;
    }

    const codeMatch = d.to.match(/^([A-Za-z]+)-(\d+)/);
    if (codeMatch) {
      const block = codeMatch[1].toUpperCase();
      const num = codeMatch[2];
      const variants = [
        `${block.toLowerCase()}-${num}`,
        `${block.toLowerCase()} ${num}`,
        `${block}-${num}`.toLowerCase(),
        `${block}${num}`.toLowerCase(),
      ];
      for (const v of variants) {
        if (normalized.includes(v)) {
          score += 95;
          break;
        }
      }
    }

    const tail = dest.includes(' - ') ? dest.split(' - ').slice(1).join(' ') : dest;
    if (tail.length >= 4 && (normalized === tail || normalized.includes(tail))) {
      score += 100;
    }
    // Prefer place destinations ("principal chamber") over bare role words.
    if (
      /\b(chamber|cabin|office|room)\b/.test(normalized) &&
      /\b(chamber|cabin|office|room)\b/.test(tail) &&
      /\bprincipal\b/.test(normalized) &&
      /\bprincipal\b/.test(tail)
    ) {
      score += 80;
    }
    const keywords = tail.split(/\s+/).filter((w) => w.length > 2);
    for (const w of keywords) {
      if (w.length > 3 && normalized.includes(w)) {
        score += w.length >= 6 ? 40 : 12;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });

  return bestScore >= 38 ? bestIdx : null;
}
