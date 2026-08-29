import React from 'react';
import { motion } from 'motion/react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { Compass, Sparkles } from 'lucide-react';

export const Vision: React.FC = () => {
  return (
    <section
      id="vision"
      className="relative min-h-[90vh] flex flex-col justify-center items-center py-40 px-4 sm:px-6 lg:px-8 bg-[#FAF9FF] text-center overflow-hidden"
    >
      {/* Deep, vast, serene atmospheric aurora glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-tr from-[#D8CDF7]/35 via-[#B9E8FF]/25 to-[#F1D9FA]/30 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute inset-0 bg-dot-fine opacity-25 pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
        
        {/* Minimalist Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-10"
        >
          <Compass className="w-3.5 h-3.5 text-[#8066D9]" />
          <span>THE CLARA MANIFESTO</span>
        </motion.div>

        {/* First Typographic Statement */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl sm:text-4xl md:text-5xl font-light text-[#65627A] max-w-3xl leading-tight mb-8"
        >
          The future of institutional interaction isn't another portal.
        </motion.h3>

        {/* Radiant Centered Core */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="my-8"
        >
          <ClaraCoreCanvas size={240} mode="radiant" intensity={1.1} />
        </motion.div>

        {/* Climax Statement */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#24213A] tracking-tight max-w-3xl leading-tight mb-6"
        >
          It's an institution that can{' '}
          <span className="text-gradient-violet">
            talk back.
          </span>
        </motion.h2>

        {/* Manifesto Motto */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="font-mono text-sm sm:text-base text-[#8066D9] font-bold tracking-widest uppercase mb-10"
        >
          Listen. Understand. Connect.
        </motion.p>

        {/* Supporting Three Principles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left"
        >
          <div className="p-4 rounded-2xl glass-panel border border-white/90 text-xs">
            <span className="font-mono text-[#8066D9] font-bold block mb-1">01. INCLUSIVE RECEPTION</span>
            <p className="text-[#65627A]">Available 24/7 across every dialect, ensuring no visitor is left unattended.</p>
          </div>
          <div className="p-4 rounded-2xl glass-panel border border-white/90 text-xs">
            <span className="font-mono text-[#8066D9] font-bold block mb-1">02. UNCOMPROMISING TRUTH</span>
            <p className="text-[#65627A]">Grounded exclusively on verified campus bylaws, preserving institutional integrity.</p>
          </div>
          <div className="p-4 rounded-2xl glass-panel border border-white/90 text-xs">
            <span className="font-mono text-[#8066D9] font-bold block mb-1">03. HUMAN EMPATHY</span>
            <p className="text-[#65627A]">Elevating faculty to focus on mentorship, research, and deep relationships.</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
