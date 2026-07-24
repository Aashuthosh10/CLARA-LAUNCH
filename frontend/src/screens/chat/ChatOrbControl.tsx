import React from 'react';
import { motion } from 'motion/react';
import SiriOrb from '../../components/SiriOrb';

export type ChatOrbState = 'idle' | 'listening' | 'processing' | 'speaking' | 'ready' | 'completed';

type ChatOrbControlProps = {
  orbState: ChatOrbState;
  isProcessing: boolean;
  amplitude: number;
  onTap: () => void;
  bottomClassName: string;
  compact?: boolean;
  /** Shrinks / lowers orb when department comparison panel is dominant */
  comparisonMode?: boolean;
};

export default function ChatOrbControl({
  orbState,
  isProcessing,
  amplitude,
  onTap,
  bottomClassName,
  compact = false,
  comparisonMode = false,
}: ChatOrbControlProps) {
  const aria =
    isProcessing ? 'Voice input thinking' : orbState === 'listening' ? 'Voice input listening' : 'Tap to speak';

  return (
    <motion.div
      className="relative flex flex-col items-center group"
      initial={false}
      animate={{
        scale: comparisonMode ? 0.72 : compact ? 0.62 : 1,
        y: comparisonMode ? 12 : 0,
      }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.28, 1] }}
      style={{ transformOrigin: '50% 100%', pointerEvents: 'none' }}
    >
      {/* SiriOrb draws a 320px glow outside its 200px box; that must NOT steal
          pointer events from FAQ pills stacked above the orb. Only this disc
          receives taps (defense-in-depth vs oversized decorative layers). */}
      <div className="relative shrink-0" style={{ width: 200, height: 200, pointerEvents: 'none' }}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <SiriOrb isListening={orbState === 'listening'} amplitude={amplitude} />
        </div>
        <button
          type="button"
          tabIndex={0}
          data-testid="chat-orb"
          data-orb-state={isProcessing ? 'processing' : orbState}
          aria-label={aria}
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-0 bg-transparent p-0 outline-offset-4"
          style={{ width: 140, height: 140, pointerEvents: 'auto' }}
          onClick={(event) => {
            if (import.meta.env.DEV) {
              const el = event.target as HTMLElement;
              // eslint-disable-next-line no-console
              console.debug('[CLARA_AGENT]', 'A', 'orb_hit_click', {
                orbState,
                isProcessing,
                targetTag: el?.tagName,
              });
            }
            onTap();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onTap();
            }
          }}
        />
      </div>
      <div className={bottomClassName} style={{ pointerEvents: 'none' }}>
        <span
          className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.3em] transition-colors ${
            orbState === 'listening'
              ? 'animate-pulse text-indigo-500'
              : isProcessing
              ? 'animate-pulse text-amber-500'
              : 'text-slate-400 group-hover:text-indigo-500'
          }`}
          style={{
            opacity: comparisonMode ? 0.88 : isProcessing || orbState === 'listening' ? 0.9 : 0.7,
          }}
        >
          {isProcessing ? 'Thinking...' : orbState === 'listening' ? 'Listening...' : 'Tap to speak'}
        </span>
      </div>
    </motion.div>
  );
}
