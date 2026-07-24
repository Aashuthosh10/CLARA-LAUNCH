import type { CSSProperties, RefObject } from 'react';
import type { Language } from '../../../context/LanguageContext';

export type ResponseOverflowMode = 'fit' | 'paginated';

export type ResponseLayoutInput = {
  text: string;
  language: Language;
  containerRef: RefObject<HTMLElement | null>;
  /** When false, skip measuring (e.g. not FULL_TEXT / no answer). */
  enabled?: boolean;
  /**
   * Full-turn TTS duration in seconds (already computed upstream).
   * Used only for fallback auto-advance when externalPlaybackSync is false.
   */
  audioDurationSeconds?: number;
  /**
   * When true, page index is owned by the parent (playback timeline).
   * Internal auto-advance timer is disabled.
   */
  externalPlaybackSync?: boolean;
};

export type ResponseLayoutResult = {
  ready: boolean;
  fontSizePx: number;
  /** Unitless CSS line-height multiplier. */
  lineHeight: number;
  containerWidth: string;
  textAlign: 'center';
  justifyContent: 'center' | 'flex-start';
  overflowMode: ResponseOverflowMode;
  pages: string[];
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  /** Styles for the live answer node (typography only). */
  answerStyle: CSSProperties;
  /** Styles for the safe-zone container (width). */
  containerStyle: CSSProperties;
};

export type ResponseTypography = {
  fontSizePx: number;
  lineHeight: number;
  widthPx: number;
  fontFamily?: string;
  fontWeight?: number;
  letterSpacing?: string;
};
