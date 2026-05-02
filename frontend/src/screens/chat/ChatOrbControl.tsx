import React from 'react';
import { motion } from 'motion/react';
import SiriOrb from '../../components/SiriOrb';

type ChatOrbControlProps = {
  orbState: 'idle' | 'listening' | 'processing' | 'speaking' | 'ready' | 'completed';
  isProcessing: boolean;
  amplitude: number;
  onTap: () => void;
  bottomClassName: string;
  /** Shrinks / lowers orb when department comparison panel is dominant */
  comparisonMode?: boolean;
};

export default function ChatOrbControl({
  orbState,
  isProcessing,
  amplitude,
  onTap,
  bottomClassName,
  comparisonMode = false,
}: ChatOrbControlProps) {
  return (
    <motion.div
      className="relative flex cursor-pointer flex-col items-center group"
      initial={false}
      animate={{
        scale: comparisonMode ? 0.72 : 1,
        y: comparisonMode ? 12 : 0,
      }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.28, 1] }}
      style={{ transformOrigin: '50% 100%' }}
      onClick={onTap}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTap();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={isProcessing ? 'Voice input thinking' : orbState === 'listening' ? 'Voice input listening' : 'Tap to speak'}
      data-testid="chat-orb"
    >
      <SiriOrb isListening={orbState === 'listening' || isProcessing} amplitude={amplitude} />
      <div className={bottomClassName}>
        <span
          className={`whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.3em] transition-colors ${orbState === 'listening' || isProcessing ? 'animate-pulse text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500'}`}
          style={{
            opacity: comparisonMode ? 0.92 : 1,
          }}
        >
          {isProcessing ? 'Thinking...' : orbState === 'listening' ? 'Listening...' : 'Tap to speak'}
        </span>
      </div>
    </motion.div>
  );
}
