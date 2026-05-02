import type { CampusDirection } from './campusDirections';

/**
 * Best-effort match of speech transcript to a campus destination index.
 * Tolerates room codes ("A 001", "a-001"), full labels, and partial keywords.
 */
export function matchCampusDestinationIndex(
  transcript: string,
  directions: CampusDirection[],
): number | null {
  const raw = transcript.trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[^\w\s/-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  let bestIdx: number | null = null;
  let bestScore = 0;

  directions.forEach((d, i) => {
    const dest = d.to.toLowerCase();
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
    const keywords = tail.split(/\s+/).filter((w) => w.length > 2);
    for (const w of keywords) {
      if (w.length > 3 && normalized.includes(w)) {
        score += 12;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });

  return bestScore >= 38 ? bestIdx : null;
}
