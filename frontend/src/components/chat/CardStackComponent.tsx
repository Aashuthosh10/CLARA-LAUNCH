import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const READ_ALOUD_FALLBACK_MS = 15000;
const COVER_AUTO_ADVANCE_MS = 1400;

export default function CardStackComponent({
  cards,
  skipFirstAudio,
  sendMessage,
  payload,
  onComplete,
}: {
  cards: string[];
  skipFirstAudio: boolean;
  sendMessage: (msg: object) => void;
  payload?: { audioBase64?: string } | null;
  onComplete: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const lastPlayedRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAdvancedSinceSendRef = useRef(false);
  const hasSkippedFirstRef = useRef(false);
  /** Only send diary_tts once per card index (avoids double send on re-render). */
  const sentTtsForIndexRef = useRef<number | null>(null);
  /** Only play audio that was requested for the current card (avoids playing stale/previous card audio). */
  const expectedAudioForIndexRef = useRef<number | null>(null);

  const clearFallback = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const advance = () => {
    clearFallback();
    setIdx((p) => {
      const next = p + 1;
      if (next >= cards.length) {
        onComplete();
        return p;
      }
      return next;
    });
  };

  // Send diary_tts for current card exactly once per index (cover uses timer only).
  useEffect(() => {
    if (!cards.length) return;
    if (idx >= cards.length) return;

    clearFallback();

    if (idx === 0 && skipFirstAudio) {
      sentTtsForIndexRef.current = 0;
      const t = setTimeout(advance, COVER_AUTO_ADVANCE_MS);
      return () => clearTimeout(t);
    }

    // Only send once per card index; re-runs (e.g. new cards ref) must not re-send.
    if (sentTtsForIndexRef.current === idx) {
      return;
    }
    sentTtsForIndexRef.current = idx;
    expectedAudioForIndexRef.current = idx;

    const text = cards[idx];
    if (!text || !text.trim()) {
      advance();
      return;
    }

    hasAdvancedSinceSendRef.current = false;
    sendMessage({ action: 'diary_tts', text });
    fallbackTimerRef.current = setTimeout(advance, READ_ALOUD_FALLBACK_MS);
    return clearFallback;
  }, [idx, cards, skipFirstAudio, sendMessage]);

  // Play incoming audio only if it matches the current card; advance on end.
  useEffect(() => {
    const audioBase64 = payload?.audioBase64;
    if (!audioBase64) return;
    if (audioBase64 === lastPlayedRef.current) return;
    if (isPlayingRef.current) return;
    if (hasAdvancedSinceSendRef.current) return;

    // Skip the first payload (assistant reply TTS) when we use skipFirstAudio.
    if (skipFirstAudio && !hasSkippedFirstRef.current) {
      hasSkippedFirstRef.current = true;
      lastPlayedRef.current = audioBase64;
      return;
    }

    // Only play if this audio is for the card we're currently showing (avoids stale/previous card audio).
    if (expectedAudioForIndexRef.current !== idx) {
      return;
    }

    lastPlayedRef.current = audioBase64;
    isPlayingRef.current = true;
    clearFallback();
    try {
      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const onEnd = () => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        hasAdvancedSinceSendRef.current = true;
        advance();
      };
      audio.addEventListener('ended', onEnd);
      audio.addEventListener('error', onEnd);
      audio.play().catch(() => onEnd());
    } catch {
      isPlayingRef.current = false;
      advance();
    }
  }, [idx, payload?.audioBase64, skipFirstAudio]);

  useEffect(() => () => clearFallback(), []);

  const cardText = cards[idx] ?? '';
  const isCover = idx === 0;
  const lines = cardText.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const coverTitle = isCover ? lines[0] ?? '' : '';
  const coverSubtitle = isCover ? lines[1] ?? '' : '';
  const contentTitle = !isCover ? lines[0] ?? '' : '';
  const contentBody = !isCover ? lines.slice(1).join('\n').trim() : '';

  return (
    <div className="premium-book-viewport">
      <div className="premium-book-container">
        <div className="premium-book-ambient-shadow" />
        <div className="premium-book-wrapper">
          <div className="book-spiral-spine">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="spiral-loop" />
            ))}
          </div>
          <div className="book-content-anchor">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                className="page-layer under"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.6 }}
                style={{ pointerEvents: 'none' }}
              >
                <div className="premium-page-paper">
                  <div className="paper-texture" />
                  {isCover ? (
                    <div className="page-cover">
                      <h1 className="cover-title">{coverTitle}</h1>
                      <div className="cover-divider" />
                      {coverSubtitle && <p className="cover-subtitle">{coverSubtitle}</p>}
                    </div>
                  ) : (
                    <div className="premium-page-inner">
                      {contentTitle && <h2 className="premium-page-title">{contentTitle}</h2>}
                      <div className="premium-page-body">
                        <p className="premium-page-body-p">{contentBody || '\u00A0'}</p>
                      </div>
                      <div className="premium-page-footer">
                        <span className="premium-page-number">{String(idx + 1).padStart(2, '0')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

