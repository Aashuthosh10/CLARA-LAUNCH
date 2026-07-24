import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Language } from '../../../context/LanguageContext';
import {
  getScriptTypography,
  scriptTypographyToAnswerStyle,
} from '../typography/scriptTypography';
import {
  HEIGHT_EPSILON_PX,
  MAX_FIT_ITERATIONS,
  MIN_LINE_HEIGHT,
  fontStepPx,
  minFontSizePx,
  resolveBaseFontSizePx,
} from './responseLayoutConstants';
import {
  measureResponseTextHeight,
  resolveContainerWidthPx,
} from './measureResponseText';
import { countGraphemes, paginateResponseText } from './paginateResponseText';
import type {
  ResponseLayoutInput,
  ResponseLayoutResult,
  ResponseOverflowMode,
  ResponseTypography,
} from './responseLayoutTypes';

type ComputedLayout = {
  fontSizePx: number;
  lineHeight: number;
  containerWidth: string;
  widthPx: number;
  overflowMode: ResponseOverflowMode;
  pages: string[];
  justifyContent: 'center' | 'flex-start';
};

function remPx(): number {
  if (typeof window === 'undefined') return 16;
  const value = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(value) && value > 0 ? value : 16;
}

function computeLayout(
  text: string,
  language: Language,
  availableWidthPx: number,
  availableHeightPx: number,
): ComputedLayout {
  const rem = remPx();
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : availableWidthPx;
  const preset = getScriptTypography(language);
  const containerWidth = preset.containerWidthCss;
  const widthPx = resolveContainerWidthPx(containerWidth, availableWidthPx);
  const safeHeight = Math.max(1, availableHeightPx - HEIGHT_EPSILON_PX);

  let fontSizePx = resolveBaseFontSizePx(rem, viewportW) * preset.sizeMultiplier;
  let lineHeight = preset.lineHeight;
  const floor = minFontSizePx(rem);
  const step = Math.max(0.5, fontStepPx(rem));
  const minLine = Math.min(MIN_LINE_HEIGHT, preset.lineHeight - 0.14);

  const typography = (): ResponseTypography => ({
    fontSizePx,
    lineHeight,
    widthPx,
    fontFamily: preset.fontFamily !== 'inherit' ? preset.fontFamily : undefined,
    fontWeight: preset.fontWeight,
    letterSpacing: preset.letterSpacing,
  });

  let height = measureResponseTextHeight(text, typography());
  let iterations = 0;

  while (height > safeHeight && fontSizePx > floor + 0.01 && iterations < MAX_FIT_ITERATIONS) {
    fontSizePx = Math.max(floor, fontSizePx - step);
    height = measureResponseTextHeight(text, typography());
    iterations += 1;
  }

  if (height > safeHeight && lineHeight > minLine) {
    while (height > safeHeight && lineHeight > minLine + 0.001 && iterations < MAX_FIT_ITERATIONS) {
      lineHeight = Math.max(minLine, lineHeight - 0.02);
      height = measureResponseTextHeight(text, typography());
      iterations += 1;
    }
  }

  if (height <= safeHeight) {
    return {
      fontSizePx,
      lineHeight,
      containerWidth,
      widthPx,
      overflowMode: 'fit',
      pages: [text],
      justifyContent: 'center',
    };
  }

  const pages = paginateResponseText(text, typography(), safeHeight);
  return {
    fontSizePx,
    lineHeight,
    containerWidth,
    widthPx,
    overflowMode: pages.length > 1 ? 'paginated' : 'fit',
    pages,
    justifyContent: 'center',
  };
}

/**
 * Presentation-only layout engine for FULL_TEXT AI responses.
 * Measures DOM height; never mutates response text.
 */
export function useResponseLayout({
  text,
  language,
  containerRef,
  enabled = true,
  audioDurationSeconds = 0,
  externalPlaybackSync = false,
}: ResponseLayoutInput): ResponseLayoutResult {
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState<ComputedLayout | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0, stageW: 0 });
  const measureGenRef = useRef(0);
  const advanceTimerRef = useRef<number | null>(null);
  const preset = getScriptTypography(language);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const node = containerRef.current;
    if (!node) return;

    const publish = () => {
      const rect = node.getBoundingClientRect();
      const parent = node.parentElement;
      const stageW = parent
        ? Math.round(parent.getBoundingClientRect().width)
        : Math.round(rect.width);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setBoxSize((prev) =>
        prev.w === w && prev.h === h && prev.stageW === stageW ? prev : { w, h, stageW },
      );
    };

    publish();
    const ro = new ResizeObserver(() => {
      publish();
    });
    ro.observe(node);
    if (node.parentElement) ro.observe(node.parentElement);
    return () => ro.disconnect();
  }, [containerRef, enabled, text, language]);

  useEffect(() => {
    if (!enabled || !text) {
      measureGenRef.current += 1;
      setReady(false);
      setLayout(null);
      setActivePageIndex(0);
      clearAdvanceTimer();
      return;
    }
    if (boxSize.h < 8 || boxSize.stageW < 8) {
      setReady(false);
      return;
    }

    const gen = ++measureGenRef.current;
    setReady(false);

    const raf = window.requestAnimationFrame(() => {
      if (gen !== measureGenRef.current) return;
      const next = computeLayout(text, language, boxSize.stageW, boxSize.h);
      if (gen !== measureGenRef.current) return;
      setLayout(next);
      setActivePageIndex(0);
      setReady(true);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [text, language, boxSize.stageW, boxSize.h, enabled, clearAdvanceTimer]);

  const pages = layout?.pages ?? (text ? [text] : ['']);
  const pageCount = pages.length;
  const pagesKey = layout ? layout.pages.join('\u0000') : '';

  // Fallback auto-advance only when parent is NOT driving pages from playback.
  useEffect(() => {
    clearAdvanceTimer();
    if (externalPlaybackSync) return;
    if (!enabled || !ready || !layout || layout.overflowMode !== 'paginated' || layout.pages.length <= 1) {
      return;
    }

    const layoutPages = layout.pages;
    const totalGraphemes = Math.max(
      1,
      layoutPages.reduce((sum, p) => sum + countGraphemes(p.replace(/\s+/g, '')), 0),
    );
    const totalMs =
      audioDurationSeconds > 0
        ? audioDurationSeconds * 1000
        : Math.max(1200, totalGraphemes * 18 + 600);

    let cancelled = false;
    let index = 0;

    const scheduleNext = () => {
      if (cancelled || index >= layoutPages.length - 1) return;
      const page = layoutPages[index] ?? '';
      const pageGraphemes = Math.max(1, countGraphemes(page.replace(/\s+/g, '')));
      const pageMs = Math.max(400, (totalMs * pageGraphemes) / totalGraphemes);
      advanceTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        index += 1;
        setActivePageIndex(index);
        scheduleNext();
      }, pageMs);
    };

    setActivePageIndex(0);
    scheduleNext();

    return () => {
      cancelled = true;
      clearAdvanceTimer();
    };
  }, [
    enabled,
    ready,
    layout,
    pagesKey,
    audioDurationSeconds,
    clearAdvanceTimer,
    externalPlaybackSync,
  ]);

  const safeIndex = Math.min(activePageIndex, Math.max(0, pageCount - 1));

  const answerStyle = useMemo((): CSSProperties => {
    if (!layout) return { opacity: 0 };
    return {
      ...scriptTypographyToAnswerStyle(preset, {
        fontSizePx: layout.fontSizePx,
        lineHeight: layout.lineHeight,
      }),
      width: '100%',
      maxWidth: '100%',
      opacity: ready ? 1 : 0,
    };
  }, [layout, ready, preset]);

  const containerStyle = useMemo((): CSSProperties => {
    if (!layout) return {};
    return {
      width: layout.containerWidth,
      justifyContent: layout.justifyContent,
      overflowY: 'hidden',
    };
  }, [layout]);

  return {
    ready,
    fontSizePx: layout?.fontSizePx ?? resolveBaseFontSizePx(remPx()) * preset.sizeMultiplier,
    lineHeight: layout?.lineHeight ?? preset.lineHeight,
    containerWidth: layout?.containerWidth ?? preset.containerWidthCss,
    textAlign: 'center',
    justifyContent: layout?.justifyContent ?? 'center',
    overflowMode: layout?.overflowMode ?? 'fit',
    pages,
    activePageIndex: safeIndex,
    setActivePageIndex,
    answerStyle,
    containerStyle,
  };
}
