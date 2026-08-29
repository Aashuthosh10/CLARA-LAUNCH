import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles, Volume2, ArrowRight } from 'lucide-react';
import { playVoiceWaveTone, playHoverChime } from '../utils/audio';

export const VoiceExperience: React.FC = () => {
  const [activeStep, setActiveStep] = useState<'idle' | 'listening' | 'text' | 'response'>('listening');

  const handleTriggerVoice = () => {
    setActiveStep('listening');
    playVoiceWaveTone();
    setTimeout(() => {
      setActiveStep('text');
    }, 1500);
    setTimeout(() => {
      setActiveStep('response');
    }, 3000);
  };

  return (
    <section
      id="voice"
      className="relative min-h-[90vh] flex flex-col justify-center items-center py-36 px-4 sm:px-6 lg:px-8 bg-[#FAF9FF] text-center overflow-hidden"
    >
      {/* Very soft serene ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#E7E0FA]/40 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
        
        {/* Soft Minimalist Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-6"
        >
          <Mic className="w-3.5 h-3.5 text-[#8066D9]" />
          <span>NATURAL ACOUSTIC RECEPTION</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-4xl sm:text-6xl font-bold text-[#24213A] tracking-tight mb-4"
        >
          Speak naturally.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-base sm:text-lg text-[#65627A] font-light max-w-md mx-auto mb-14"
        >
          No keyword triggers. No robotic menus. Just a natural, welcoming conversation.
        </motion.p>

        {/* Central Luminous Acoustic Wave & Interaction Canvas */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center mb-10">
          
          {/* Subtle concentric ripple waves */}
          <div className="absolute inset-0 rounded-full border border-[#D8CDF7]/60 animate-wave-ripple" />
          <div className="absolute inset-4 rounded-full border border-[#B9E8FF]/50 animate-wave-ripple [animation-delay:1.1s]" />
          <div className="absolute inset-8 rounded-full border border-[#F1D9FA]/60 animate-wave-ripple [animation-delay:2.2s]" />

          {/* Central Touch Interaction Disc */}
          <button
            onClick={handleTriggerVoice}
            onMouseEnter={playHoverChime}
            className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-tr from-[#7254C7] via-[#8066D9] to-[#9EDBFF] p-1 shadow-2xl shadow-purple-500/25 hover:scale-105 active:scale-95 transition-transform group flex items-center justify-center cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-[#6247B5]">
              <Mic className="w-7 h-7 text-[#8066D9] group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-[#9692AA] mt-1">
                Tap to Speak
              </span>
            </div>
          </button>
        </div>

        {/* Progressive Visual Demonstration */}
        <div className="w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl border border-white/90 shadow-xl space-y-4">
          
          {/* Step 1: Acoustic Input */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-[#8066D9] font-bold uppercase tracking-wider block">
              01. VISITOR SPEAKS:
            </span>
            <p className="text-base sm:text-lg font-display font-medium text-[#24213A] italic">
              “Who can I contact about admissions?”
            </p>
          </div>

          <div className="w-8 h-0.5 bg-[#E7E0FA] mx-auto rounded-full" />

          {/* Step 2: Intelligent Understanding & Natural Voice Response */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono text-[#49358F] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#8066D9]" />
              02. CLARA NATURAL SPEECH RESPONSE:
            </span>
            <p className="text-sm sm:text-base text-[#49358F] font-normal leading-relaxed">
              “The Admissions Office is headed by Dr. Maya Patel in Admin Block Room 204.
              Her walk-in advisory window is open right now until 4:00 PM. Shall I book a pass for you?”
            </p>
          </div>

        </div>

        {/* 3-Step Pill Bar */}
        <div className="mt-8 flex items-center gap-3 text-xs font-mono text-[#9692AA]">
          <span className="text-[#49358F] font-bold">VOICE</span>
          <ArrowRight className="w-3 h-3 text-[#8066D9]" />
          <span className="text-[#49358F] font-bold">UNDERSTANDING</span>
          <ArrowRight className="w-3 h-3 text-[#8066D9]" />
          <span className="text-[#49358F] font-bold">RESPONSE</span>
        </div>

      </div>
    </section>
  );
};
