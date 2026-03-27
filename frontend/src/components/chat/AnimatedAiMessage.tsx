import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface AnimatedAiMessageProps {
  key?: React.Key;
  text: string;
  className?: string;
  style?: React.CSSProperties;
  isCardData?: boolean;
  animate?: boolean;
  audioDuration?: number;
}

export default function AnimatedAiMessage({ 
  text, 
  className = '', 
  style,
  isCardData = false,
  animate = true,
  audioDuration = 0
}: AnimatedAiMessageProps) {
  const [isReady, setIsReady] = useState(false);
  const toGraphemes = useCallback((value: string): string[] => {
    try {
      const Segmenter = (Intl as any).Segmenter;
      if (typeof Segmenter === 'function') {
        const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
        return Array.from(segmenter.segment(value), (part: any) => String(part.segment));
      }
    } catch {
      // no-op: fallback below
    }
    return Array.from(value);
  }, []);

  // Trigger slight "thinking" delay exactly ONCE on mount, or instantly if not animating
  useEffect(() => {
    if (!animate) {
      setIsReady(true);
      return;
    }
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100); // reduced intelligence delay since audio might start immediately
    return () => clearTimeout(timer);
  }, [animate]);

  // Split safely by whitespace while preserving the spaces as tokens
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const totalChars = useMemo(
    () => toGraphemes(text.replace(/\s+/g, '')).length,
    [text, toGraphemes]
  );
  
  // Stagger roughly finishes just before the TTS ends
  const expectedStagger = audioDuration ? (audioDuration * 1000 * 0.9) / Math.max(totalChars, 1) : 20;

  if (!isReady) {
    // Hidden initially to prevent layout shift before animation
    return <div className={`opacity-0 ${className}`} style={style}>{text}</div>;
  }

  let globalCharIndex = 0;

  return (
    <div 
      className={className} 
      style={{ 
        ...style,
        color: 'inherit' // Ensures it inherits from .bubble-clara or .word-by-word-text
      }}
    >
      {tokens.map((token, tIdx) => {
        // If it's pure whitespace, render it directly to preserve formatting.
        if (/^\s+$/.test(token)) {
          globalCharIndex += token.length;
          return <span key={`space-${tIdx}`}>{token}</span>;
        }

        // For actual words, render letters
        const isAsciiToken = /^[\x00-\x7F]+$/.test(token);
        return (
          <span key={`word-${tIdx}`} className={isAsciiToken ? 'inline-block whitespace-nowrap' : 'inline-block'}>
            {toGraphemes(token).map((char, cIdx) => {
              if (!animate) {
                return <span key={`char-${cIdx}`} className="inline-block">{char}</span>;
              }
              const delay = globalCharIndex * expectedStagger; // synced stagger
              globalCharIndex++;
              return (
                <span
                  key={`char-${cIdx}`}
                  className="letter-reveal inline-block"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}
