import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowUp, ShieldCheck, Cpu, Terminal, Radio } from 'lucide-react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { playHoverChime, playTone } from '../utils/audio';

interface AboutFooterProps {
  onOpenLiveDemo: () => void;
}

export const AboutFooter: React.FC<AboutFooterProps> = ({ onOpenLiveDemo }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    playTone(660, 'sine', 0.1, 0.02);
  };

  return (
    <footer
      id="footer"
      className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#040406] border-t border-gray-900 overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-red-950/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
        
        {/* Section 14 Flagship Exit Screen: "ENTER CLARA" */}
        <div className="mb-20 flex flex-col items-center">
          
          <ClaraCoreCanvas size={180} mode="idle" intensity={0.9} />

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl sm:text-6xl font-extrabold text-white tracking-wider mt-4 mb-2"
          >
            CLARA
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-mono text-sm sm:text-base text-red-400 font-semibold tracking-widest uppercase mb-8"
          >
            Listen. Understand. Connect.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            id="footer-enter-clara-btn"
            onClick={onOpenLiveDemo}
            onMouseEnter={playHoverChime}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base tracking-wide text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 shadow-2xl shadow-red-950/90 border border-red-400/40 active:scale-95 transition-all"
          >
            <Sparkles className="w-5 h-5 text-red-200 group-hover:rotate-12 transition-transform" />
            <span>ENTER CLARA</span>
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>

        </div>

        {/* System Diagnostics & Navigation Bar */}
        <div className="w-full pt-10 border-t border-gray-900 grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-xs font-mono text-gray-400">
          
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-300 font-semibold">Institutional OS v2.4</span>
            <span className="text-gray-600">•</span>
            <span>Zero-Hallucination RAG</span>
          </div>

          <div className="flex items-center justify-center gap-4 text-[11px]">
            <a href="#hero" className="hover:text-red-400 transition-colors">Overview</a>
            <a href="#capabilities" className="hover:text-red-400 transition-colors">Capabilities</a>
            <a href="#pipeline" className="hover:text-red-400 transition-colors">RAG Pipeline</a>
            <a href="#stack" className="hover:text-red-400 transition-colors">Architecture</a>
            <a href="#creators" className="hover:text-red-400 transition-colors">Creators</a>
          </div>

          <div className="flex items-center justify-center md:justify-end gap-3">
            <span>Crafted for Modern Campuses</span>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-[#11131f] border border-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Return to top"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        <div className="mt-8 text-[11px] text-gray-400 font-mono">
          © 2026 CLARA Institutional AI Platform. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
