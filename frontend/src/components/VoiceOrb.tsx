import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { OrbState } from '../types/chat';

interface VoiceOrbProps {
  state: OrbState;
  onTap: () => void;
  amplitude?: number; // 0 to 1
  label?: string;     // Override auto-generated label
}

/* State → label mapping */
const STATE_LABELS: Record<OrbState, string | null> = {
  idle: null,
  ready: null,
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
  completed: 'Tap to Speak',
};

export default function VoiceOrb({ state, onTap, amplitude = 0, label }: VoiceOrbProps) {
  const displayLabel = label ?? STATE_LABELS[state];

  // Determine if the orb should visually invite interaction
  const isInteractive = state === 'idle' || state === 'ready' || state === 'completed';

  // Base scale and dynamic scale from amplitude
  const isSpeakingOrListening = state === 'speaking' || state === 'listening';
  const dynamicScale = isSpeakingOrListening ? 1 + amplitude * 0.4 : 1;
  const isProcessing = state === 'processing';

  return (
    <div
      className={`voice-orb-wrapper ${isInteractive ? 'cursor-pointer group' : ''}`}
      data-orb-state={state}
      onClick={isInteractive ? onTap : undefined}
    >
      <div className="relative flex items-center justify-center mt-4">
        {/* Powerful Shining Effect (No Rings) */}
        <div className="absolute inset-0 bg-[#A78BFA] rounded-full blur-[40px] opacity-40 animate-pulse"></div>
        <div className="absolute w-[180px] h-[180px] bg-[#818CF8] rounded-full blur-[50px] opacity-20 animate-[pulse_3s_ease-in-out_infinite]"></div>
        <div className="absolute w-[130px] h-[130px] bg-[#C084FC] rounded-full blur-[30px] opacity-30 animate-[pulse_2s_ease-in-out_infinite_reverse]"></div>
        
        {/* Core Pearl Orb */}
        <motion.div 
          animate={{ scale: dynamicScale }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative w-[75px] h-[75px] rounded-full overflow-hidden shadow-[0_15px_35px_rgba(139,92,246,0.25)]"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #eef2ff 25%, #c7d2fe 55%, #a78bfa 85%, #8b5cf6 100%)',
            boxShadow: 'inset -10px -10px 25px rgba(109,40,217,0.5), inset 10px 10px 20px rgba(255,255,255,0.95), inset 0 0 10px rgba(255,255,255,0.5)',
          }}
        >
          {/* Main Specular Highlight (Top Left Curve) */}
          <div className="absolute top-[8%] left-[15%] w-[45%] h-[30%] bg-gradient-to-b from-white to-white/0 rounded-[50%] blur-[1px] opacity-95 transform -rotate-[25deg]"></div>
          
          {/* Secondary Specular Highlight (Bottom Right Rim) */}
          <div className="absolute bottom-[4%] right-[8%] w-[60%] h-[20%] bg-gradient-to-t from-white/60 to-white/0 rounded-[50%] blur-[2px] transform rotate-[30deg]"></div>
          
          {/* Subtle inner ambient pink/purple glow */}
          <div className="absolute bottom-[5%] right-[5%] w-[60%] h-[60%] bg-[#d8b4fe] rounded-full blur-[10px] opacity-80 mix-blend-overlay"></div>
        </motion.div>
      </div>

      {/* State Label */}
      <AnimatePresence mode="wait">
        {displayLabel && (
          <motion.div
            key={displayLabel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`mt-6 text-[10px] font-semibold tracking-[0.3em] uppercase text-center pointer-events-none ${state === 'completed' || state === 'ready' || state === 'idle' ? 'text-[#6366F1] animate-pulse' : 'text-[#64748b]'}`}
          >
            {displayLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
