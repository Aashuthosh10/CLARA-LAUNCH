import React, { useState, useEffect, useMemo } from 'react';

interface AnimatedAiMessageProps {
  key?: React.Key;
  text: string;
  className?: string;
  isCardData?: boolean;
  animate?: boolean;
  audioDuration?: number;
}

export default function AnimatedAiMessage({ 
  text, 
  className = '', 
  isCardData = false,
  animate = true,
  audioDuration = 0
}: AnimatedAiMessageProps) {
  const [isReady, setIsReady] = useState(false);

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
  const totalChars = useMemo(() => text.replace(/\s+/g, '').length, [text]);
  
  // Stagger roughly finishes just before the TTS ends
  const expectedStagger = audioDuration ? (audioDuration * 1000 * 0.9) / Math.max(totalChars, 1) : 20;

  if (!isReady) {
    // Hidden initially to prevent layout shift before animation
    return <div className={`opacity-0 ${className}`}>{text}</div>;
  }

  let globalCharIndex = 0;

  return (
    <div 
      className={className} 
      style={{ 
        letterSpacing: '0.02em', 
        lineHeight: '1.6',
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
        return (
          <span key={`word-${tIdx}`} className="inline-block whitespace-nowrap">
            {Array.from(token).map((char, cIdx) => {
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
