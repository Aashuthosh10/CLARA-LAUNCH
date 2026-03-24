import React, { useEffect, useState, useMemo, useRef } from 'react';

interface WordByWordTextProps {
  text: string;
  isSpeaking: boolean;
  totalDuration?: number;
}

export default function WordByWordText({ text, isSpeaking, totalDuration }: WordByWordTextProps) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Reveal all if narration finishes or isn't active
    if (!isSpeaking) {
      if (visibleCount > 0 && visibleCount < words.length) {
        setVisibleCount(words.length);
      }
      return;
    }

    // Reset and start sequence
    setVisibleCount(0);
    
    // 350ms default per word if duration is unknown
    const intervalTime = totalDuration ? (totalDuration / words.length) : 350;
    
    let current = 0;
    timerRef.current = setInterval(() => {
      current++;
      if (current <= words.length) {
        setVisibleCount(current);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSpeaking, words.length, totalDuration]);

  // Initial show all if not speaking yet
  const effectiveCount = (isSpeaking || visibleCount > 0) ? visibleCount : words.length;

  return (
    <div className="word-by-word-text w-full">
       <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              className={`word-span transition-all duration-500 ease-out ${index < effectiveCount ? 'visible' : 'opacity-0 translate-y-4'}`}
              style={{ 
                color: '#111827', 
                fontWeight: 700,
                transitionDelay: `${(index % 8) * 40}ms` 
              }}
            >
              {word}
            </span>
          ))}
       </div>
    </div>
  );
}
