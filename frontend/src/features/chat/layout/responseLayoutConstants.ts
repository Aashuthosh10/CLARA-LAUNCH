import type { Language } from '../../../context/LanguageContext';

/** Matches `.full-text-readable` clamp(1.9rem, 4.1vw, 3.25rem). */
export const BASE_FONT_MIN_REM = 1.9;
export const BASE_FONT_VW = 4.1;
export const BASE_FONT_MAX_REM = 3.25;

/** Accessible kiosk floor — never shrink below this. */
export const MIN_FONT_REM = 1.35;

export const BASE_LINE_HEIGHT = 1.42;
export const MIN_LINE_HEIGHT = 1.28;

/** Gradual shrink step in rem (avoids noticeable jumps). */
export const FONT_STEP_REM = 0.06;

export const HEIGHT_EPSILON_PX = 2;
export const MAX_FIT_ITERATIONS = 48;

/** English keeps current aesthetic width. */
export const ENGLISH_WIDTH_CSS = 'min(900px, 75%)';
/** Indic scripts: slightly wider readable column. */
export const INDIC_WIDTH_CSS = 'min(980px, 88%)';

export const MEASURE_CLASS_NAME = 'word-by-word-text full-text-readable response-layout-measure';

export const INDIC_LANGUAGES: ReadonlySet<Language> = new Set([
  'Kannada',
  'Tamil',
  'Telugu',
  'Hindi',
  'Malayalam',
]);

export function widthCssForLanguage(language: Language): string {
  return INDIC_LANGUAGES.has(language) ? INDIC_WIDTH_CSS : ENGLISH_WIDTH_CSS;
}

export function resolveBaseFontSizePx(remPx = 16, viewportWidthPx = 1280): number {
  const min = BASE_FONT_MIN_REM * remPx;
  const max = BASE_FONT_MAX_REM * remPx;
  const preferred = (BASE_FONT_VW / 100) * viewportWidthPx;
  return Math.min(max, Math.max(min, preferred));
}

export function minFontSizePx(remPx = 16): number {
  return MIN_FONT_REM * remPx;
}

export function fontStepPx(remPx = 16): number {
  return FONT_STEP_REM * remPx;
}
