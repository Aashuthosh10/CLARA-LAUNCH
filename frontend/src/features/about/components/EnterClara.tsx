import React from 'react';
import { motion } from 'motion/react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Heart } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

interface EnterClaraProps {
  onOpenLiveDemo: () => void;
}

export const EnterClara: React.FC<EnterClaraProps> = ({ onOpenLiveDemo }) => {
  return (
    <footer
      id="enter-clara"
      className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EFEDFA] via-[#F5F3FC] to-[#FAF9FF] text-center overflow-hidden border-t border-[#E7E0FA]"
    >
      {/* Background Radiance */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[500px] bg-gradient-to-tr from-[#D8CDF7]/40 via-[#B9E8FF]/30 to-[#F1D9FA]/30 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
        
        {/* Core Glowing Orb Nexus */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          className="mb-6"
        >
          <ClaraCoreCanvas size={260} mode="radiant" intensity={1.1} />
        </motion.div>

        {/* Closing Invitation */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-[#24213A] tracking-tight mb-4"
        >
          Ready to experience <span className="text-gradient-violet">CLARA?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="text-base sm:text-xl text-[#65627A] font-light max-w-lg mx-auto mb-10 leading-relaxed"
        >
          Step into the live conversational receptionist console and ask anything about the institution.
        </motion.p>

        {/* Primary Enter Action */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <button
            onClick={onOpenLiveDemo}
            onMouseEnter={playHoverChime}
            className="px-9 py-4 rounded-full font-bold text-base text-white bg-gradient-to-r from-[#7254C7] via-[#8066D9] to-[#9EDBFF] hover:from-[#6247B5] hover:to-[#8066D9] shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/35 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-[#DDF5FF]" />
            <span>ENTER CLARA CONSOLE</span>
            <ArrowRight className="w-5 h-5 text-white/90" />
          </button>
        </motion.div>

        {/* Clean Institutional Footer Details */}
        <div className="w-full pt-12 border-t border-[#E7E0FA] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9692AA] gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[#24213A]">CLARA</span>
            <span>•</span>
            <span>Conversational Institutional Intelligence</span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <span>Sub-45ms Latency</span>
            <span>•</span>
            <span>Zero Hallucination RAG</span>
            <span>•</span>
            <span>v2.6 Luminous</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
