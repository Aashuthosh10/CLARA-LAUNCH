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
    }, 0); // reveal immediately; speech already conveys pacing
    return () => clearTimeout(timer);
  }, [animate]);

  // Split safely by whitespace while preserving the spaces as tokens
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const totalChars = useMemo(
    () => toGraphemes(text.replace(/\s+/g, '')).length,
    [text, toGraphemes]
  );
  
  // Match TTS timing: the last character's reveal animation has a 0.6s duration (chat.css),
  // so schedule the last *start* at (audioMs - tailMs) to end right as audio ends.
  const expectedStagger = useMemo(() => {
    const tailMs = 600; // must match `.letter-reveal { animation: ... 0.6s ... }`
    const audioMs = Math.max(0, audioDuration * 1000);
    const budgetMs = audioMs > 0 ? Math.max(0, audioMs - tailMs) : 0;
    const base = budgetMs > 0 ? budgetMs / Math.max(totalChars, 1) : 18;
    // Guardrails so long audio doesn't make UI crawl, and short audio doesn't become unreadable.
    return Math.max(10, Math.min(26, base));
  }, [audioDuration, totalChars]);

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
        const isClara = token.includes('CLARA');
        const tokenClass = isClara 
          ? 'font-bold text-[#0F172A]' 
          : 'text-[#0F172A]';


        return (
          <span key={`word-${tIdx}`} className={`${isAsciiToken ? 'inline-block whitespace-nowrap' : 'inline-block'} ${tokenClass}`}>
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
