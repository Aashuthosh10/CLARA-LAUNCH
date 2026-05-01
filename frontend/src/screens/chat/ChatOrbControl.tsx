import React from 'react';
import SiriOrb from '../../components/SiriOrb';

type ChatOrbControlProps = {
  orbState: 'idle' | 'listening' | 'processing' | 'speaking' | 'ready' | 'completed';
  isProcessing: boolean;
  amplitude: number;
  onTap: () => void;
  bottomClassName: string;
};

export default function ChatOrbControl({
  orbState,
  isProcessing,
  amplitude,
  onTap,
  bottomClassName,
}: ChatOrbControlProps) {
  return (
    <div
      className="relative flex flex-col items-center group cursor-pointer"
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
      <SiriOrb
        isListening={orbState === 'listening' || isProcessing}
        amplitude={amplitude}
      />
      <div className={bottomClassName}>
        <span className={`text-[11px] font-bold tracking-[0.3em] uppercase transition-colors whitespace-nowrap ${orbState === 'listening' || isProcessing ? 'text-indigo-500 animate-pulse' : 'text-slate-400 group-hover:text-indigo-500'}`}>
          {isProcessing ? 'Thinking...' : (orbState === 'listening' ? 'Listening...' : 'Tap to speak')}
        </span>
      </div>
    </div>
  );
}
