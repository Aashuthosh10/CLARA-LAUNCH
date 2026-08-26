/**
 * Clip UI-only captions on word/grapheme boundaries. Kannada dependent signs
 * must never be split by UTF-16 offsets.
 */
export function clipLocalizedText(text: string, maxGraphemes: number): string {
  const normalized = text.trim();
  if (!normalized || maxGraphemes <= 0) return '';

  const Segmenter = Intl.Segmenter;
  if (typeof Segmenter === 'function') {
    const segments = Array.from(
      new Segmenter(undefined, { granularity: 'grapheme' }).segment(normalized),
      (entry) => entry.segment,
    );
    if (segments.length <= maxGraphemes) return normalized;
    const candidate = segments.slice(0, maxGraphemes).join('').trimEnd();
    const lastSpace = candidate.lastIndexOf(' ');
    return (lastSpace > Math.floor(candidate.length * 0.6)
      ? candidate.substring(0, lastSpace)
      : candidate
    ).trimEnd();
  }

  // Array.from iterates Unicode code points, which is safer than UTF-16 slice
  // for browsers that do not expose Intl.Segmenter.
  const codePoints = Array.from(normalized);
  if (codePoints.length <= maxGraphemes) return normalized;
  return codePoints.splice(0, maxGraphemes).join('').trimEnd();
}

