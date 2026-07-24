import { measureResponseTextHeight } from './measureResponseText';
import type { ResponseTypography } from './responseLayoutTypes';

/**
 * Split `text` into sentence ranges that are exact contiguous slices.
 * Concatenating slices reconstructs the original string byte-for-byte.
 */
export function splitSentenceSlices(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches || matches.length === 0) return [text];

  const slices: string[] = [];
  let cursor = 0;
  for (const match of matches) {
    const idx = text.indexOf(match, cursor);
    if (idx < 0) {
      // Fallback: append remainder once if regex/index drift (should not happen).
      if (cursor < text.length) slices.push(text.slice(cursor));
      cursor = text.length;
      break;
    }
    if (idx > cursor) {
      // Preserve any characters between matches (should be rare).
      slices.push(text.slice(cursor, idx));
    }
    slices.push(text.slice(idx, idx + match.length));
    cursor = idx + match.length;
  }
  if (cursor < text.length) {
    slices.push(text.slice(cursor));
  }

  // Verify integrity; if anything went wrong, fall back to single page.
  if (slices.join('') !== text) {
    return [text];
  }
  return slices.filter((s) => s.length > 0);
}

/**
 * Pack sentence slices into pages that each measure within `maxHeightPx`.
 * Pages are exact concatenations of consecutive slices (original text preserved).
 */
export function paginateResponseText(
  text: string,
  typography: ResponseTypography,
  maxHeightPx: number,
): string[] {
  if (!text) return [''];
  const fullHeight = measureResponseTextHeight(text, typography);
  if (fullHeight <= maxHeightPx) {
    return [text];
  }

  const slices = splitSentenceSlices(text);
  if (slices.length <= 1) {
    return [text];
  }

  const pages: string[] = [];
  let current = '';

  const flush = () => {
    if (current.length > 0) {
      pages.push(current);
      current = '';
    }
  };

  for (const slice of slices) {
    const candidate = current.length === 0 ? slice : current + slice;
    const height = measureResponseTextHeight(candidate, typography);
    if (height <= maxHeightPx || current.length === 0) {
      // Always accept at least one slice even if a single sentence overflows.
      current = candidate;
      if (height > maxHeightPx && current === slice) {
        // Single slice cannot fit — still emit as its own page (last resort).
        flush();
      }
      continue;
    }
    flush();
    current = slice;
    if (measureResponseTextHeight(current, typography) > maxHeightPx) {
      flush();
    }
  }
  flush();

  if (pages.length === 0) return [text];
  if (pages.join('') !== text) return [text];
  return pages;
}

export function countGraphemes(value: string): number {
  try {
    const Segmenter = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
    if (typeof Segmenter === 'function') {
      const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(value)).length;
    }
  } catch {
    // fall through
  }
  return Array.from(value).length;
}
