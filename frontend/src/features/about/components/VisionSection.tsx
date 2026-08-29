import React from 'react';
import { motion } from 'motion/react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { Sparkles, Compass, Shield } from 'lucide-react';

export const VisionSection: React.FC = () => {
  return (
    <section
      id="vision"
      className="relative min-h-[85vh] flex flex-col justify-center items-center py-36 px-4 sm:px-6 lg:px-8 bg-[#050507] border-t border-gray-900 text-center overflow-hidden"
    >
      {/* Deep Ambient Atmospheric Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-red-950/15 rounded-full blur-[180px] pointer-events-none" />
      
      {/* Background Subtle Starfield Grid */}
      <div className="absolute inset-0 bg-dot-matrix opacity-25 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center">
        
        {/* Minimalist Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/30 border border-red-500/20 text-xs font-mono text-red-300 mb-8"
        >
          <Compass className="w-3.5 h-3.5 text-red-400" />
          <span>THE CLARA MANIFESTO</span>
        </motion.div>

        {/* First Large Typographic Statement */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl sm:text-4xl md:text-5xl font-light text-gray-400 max-w-4xl leading-tight"
        >
          The future of institutional interaction isn't another portal.
        </motion.h3>

        {/* Central Calming Minimalist Core */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="my-10"
        >
          <ClaraCoreCanvas size={260} mode="radiant" intensity={1.1} />
        </motion.div>

        {/* Climax Climax Climax Statement */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight max-w-4xl leading-tight mb-8"
        >
          It's an institution that can{' '}
          <span className="bg-gradient-to-r from-red-500 via-rose-300 to-red-600 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(239,68,68,0.4)]">
            talk back.
          </span>
        </motion.h2>

        {/* Supporting Vision Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="max-w-2xl text-base sm:text-xl text-gray-400 font-light leading-relaxed mb-10"
        >
          CLARA aims to transform the traditional reception experience into an intelligent,
          always-available digital interface that connects people, information, and services through
          natural conversation.
        </motion.p>

        {/* Institutional Pillars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left"
        >
          <div className="p-4 rounded-2xl bg-[#0c0e18]/80 border border-gray-800 text-xs">
            <span className="font-mono text-red-400 font-bold block mb-1">01. INCLUSIVE RECEPTION</span>
            <p className="text-gray-400">Available 24/7 across every dialect, ensuring no visitor is left unattended.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0c0e18]/80 border border-gray-800 text-xs">
            <span className="font-mono text-red-400 font-bold block mb-1">02. UNCOMPROMISING TRUTH</span>
            <p className="text-gray-400">Grounded exclusively on verified campus bylaws, preserving absolute institutional integrity.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0c0e18]/80 border border-gray-800 text-xs">
            <span className="font-mono text-red-400 font-bold block mb-1">03. HUMAN EMPATHY</span>
            <p className="text-gray-400">Elevating faculty and staff to focus on mentorship, research, and deep human relationships.</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
