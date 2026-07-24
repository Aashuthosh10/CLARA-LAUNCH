import { MEASURE_CLASS_NAME } from './responseLayoutConstants';
import type { ResponseTypography } from './responseLayoutTypes';

let measureHost: HTMLDivElement | null = null;

function ensureMeasureHost(): HTMLDivElement {
  if (measureHost && document.body.contains(measureHost)) {
    return measureHost;
  }
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.dataset.responseLayoutMeasure = 'true';
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
    'z-index:-1',
    'contain:layout style',
  ].join(';');
  document.body.appendChild(host);
  measureHost = host;
  return host;
}

/**
 * Measure rendered height of `text` with identical typography classes as the live answer.
 * Does not mutate `text`.
 */
export function measureResponseTextHeight(
  text: string,
  typography: ResponseTypography,
): number {
  if (typeof document === 'undefined') return 0;
  const host = ensureMeasureHost();
  const node = document.createElement('div');
  node.className = MEASURE_CLASS_NAME;
  node.style.width = `${Math.max(1, typography.widthPx)}px`;
  node.style.fontSize = `${typography.fontSizePx}px`;
  node.style.lineHeight = String(typography.lineHeight);
  node.style.letterSpacing = typography.letterSpacing ?? '-0.02em';
  node.style.fontWeight = String(typography.fontWeight ?? 700);
  if (typography.fontFamily) {
    node.style.fontFamily = typography.fontFamily;
  }
  node.style.textAlign = 'center';
  node.style.whiteSpace = 'normal';
  node.style.wordBreak = 'normal';
  node.style.overflowWrap = 'break-word';
  node.style.setProperty('text-wrap', 'balance');
  node.style.margin = '0';
  node.style.padding = '0';
  node.style.maxWidth = '100%';
  node.textContent = text;

  host.replaceChildren(node);
  // Force layout
  const height = node.scrollHeight;
  host.replaceChildren();
  return height;
}

export function resolveContainerWidthPx(
  widthCss: string,
  availableWidthPx: number,
): number {
  // Supports patterns: min(900px, 75%) / min(980px, 88%)
  const match = widthCss.match(/min\(\s*([\d.]+)px\s*,\s*([\d.]+)%\s*\)/i);
  if (match) {
    const pxCap = Number(match[1]);
    const pct = Number(match[2]) / 100;
    return Math.min(pxCap, availableWidthPx * pct, availableWidthPx);
  }
  return Math.max(1, availableWidthPx);
}
