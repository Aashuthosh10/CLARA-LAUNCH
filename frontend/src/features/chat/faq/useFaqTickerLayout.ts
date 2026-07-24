import { useEffect, useMemo, useState } from 'react';
import type { Language } from '../../../context/LanguageContext';
import { getScriptTypography } from '../typography/scriptTypography';

export const FAQ_TICKER_GAP_PX = 14;
export const FAQ_TICKER_MIN_GAP_PX = 14;
export const FAQ_TICKER_SPEED_PX_PER_MS = 0.035;
export const FAQ_PILL_MAX_WIDTH_PX = 420;
export const FAQ_PILL_PAD_X_PX = 1.15 * 16 * 2; // ~padding 0.95–1.15rem each side
export const FAQ_PILL_PAD_Y_EXTRA = 4;

export type FaqTickerItem = { id: string; text: string };

export type FaqTickerLayout = {
  widths: number[];
  centers: number[];
  offsets: number[];
  totalTrackWidth: number;
  viewportWidth: number;
  visibleSlots: number;
  gap: number;
};

function measurePillWidth(text: string, language: Language): number {
  if (typeof document === 'undefined') {
    return Math.min(FAQ_PILL_MAX_WIDTH_PX, Math.max(120, text.length * 10));
  }
  const preset = getScriptTypography(language);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;z-index:-1;';
  const el = document.createElement('span');
  el.className = `faq-suggestion-pill faq-suggestion-pill--measure ${preset.cssClass}`;
  el.style.cssText = [
    'display:inline-block',
    'width:max-content',
    'max-width:min(92vw, 420px)',
    'white-space:nowrap',
    'padding:0.95rem 1.15rem',
    'font-size:1rem',
    'font-weight:750',
    'line-height:1.18',
    'box-sizing:border-box',
    preset.fontFamily !== 'inherit' ? `font-family:${preset.fontFamily}` : '',
  ]
    .filter(Boolean)
    .join(';');
  el.textContent = text;
  host.appendChild(el);
  document.body.appendChild(host);
  const width = Math.ceil(el.getBoundingClientRect().width);
  host.remove();
  return Math.min(FAQ_PILL_MAX_WIDTH_PX, Math.max(96, width));
}

function buildLayout(
  suggestions: FaqTickerItem[],
  language: Language,
  viewportMaxWidth: number,
): FaqTickerLayout {
  const gap = FAQ_TICKER_GAP_PX;
  const widths = suggestions.map((s) => measurePillWidth(s.text, language));
  const offsets: number[] = [];
  const centers: number[] = [];
  let cursor = 0;
  for (let i = 0; i < widths.length; i += 1) {
    offsets.push(cursor);
    centers.push(cursor + widths[i]! / 2);
    cursor += widths[i]! + gap;
  }
  const totalTrackWidth = Math.max(1, cursor - (widths.length ? gap : 0));

  // How many pills fit in the viewport with min gap
  let visibleSlots = 1;
  for (let n = Math.min(3, widths.length); n >= 1; n -= 1) {
    // Approximate: sum of the n widest that might appear — use average of all for stability
    const sorted = [...widths].sort((a, b) => b - a);
    const sum = sorted.slice(0, n).reduce((a, b) => a + b, 0) + gap * Math.max(0, n - 1);
    if (sum <= viewportMaxWidth + 1) {
      visibleSlots = n;
      break;
    }
  }

  const viewportWidth = Math.min(
    viewportMaxWidth,
    (() => {
      if (visibleSlots >= widths.length) {
        return Math.min(
          viewportMaxWidth,
          widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1),
        );
      }
      const sample = [...widths].sort((a, b) => b - a).slice(0, visibleSlots);
      return sample.reduce((a, b) => a + b, 0) + gap * Math.max(0, visibleSlots - 1);
    })(),
  );

  return {
    widths,
    centers,
    offsets,
    totalTrackWidth: Math.max(1, widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1)),
    viewportWidth: Math.max(160, viewportWidth),
    visibleSlots,
    gap,
  };
}

/**
 * Measure FAQ suggestion pills once per suggestion set / language / viewport.
 * Variable widths — never assumes equal pill size.
 */
export function useFaqTickerLayout(
  suggestions: FaqTickerItem[],
  language: Language,
  viewportMaxWidth: number,
): FaqTickerLayout {
  const key = useMemo(
    () =>
      `${language}|${Math.round(viewportMaxWidth)}|${suggestions.map((s) => `${s.id}:${s.text}`).join('\u0001')}`,
    [suggestions, language, viewportMaxWidth],
  );

  const [layout, setLayout] = useState<FaqTickerLayout>(() =>
    buildLayout(suggestions, language, Math.max(160, viewportMaxWidth)),
  );

  useEffect(() => {
    setLayout(buildLayout(suggestions, language, Math.max(160, viewportMaxWidth)));
  }, [key, suggestions, language, viewportMaxWidth]);

  return layout;
}
