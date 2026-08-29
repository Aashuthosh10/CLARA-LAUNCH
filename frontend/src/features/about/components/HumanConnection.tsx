import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HeartHandshake, User, GraduationCap, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { playHoverChime, playStepChime } from '../utils/audio';

export const HumanConnection: React.FC = () => {
  const [connectionActive, setConnectionActive] = useState(true);

  return (
    <section
      id="connection"
      className="relative min-h-screen flex flex-col justify-center items-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EFEDFA] via-[#F5F3FC] to-[#FAF9FF] overflow-hidden"
    >
      {/* Soft Ethereal Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-gradient-to-tr from-[#D8CDF7]/35 via-[#B9E8FF]/30 to-[#F1D9FA]/30 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 text-center w-full flex flex-col items-center">
        
        {/* Subtle Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-6"
        >
          <HeartHandshake className="w-3.5 h-3.5 text-[#8066D9]" />
          <span>HUMAN-CENTERED DESIGN PHILOSOPHY</span>
        </motion.div>

        {/* Emotional Climax Headlines */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-[#24213A] tracking-tight mb-4"
        >
          CLARA doesn't replace the{' '}
          <span className="text-gradient-violet">human connection.</span>
        </motion.h2>

        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="font-display text-2xl sm:text-4xl font-light text-[#49358F] tracking-tight mb-14"
        >
          She makes finding it <span className="font-semibold italic">easier.</span>
        </motion.h3>

        {/* Living Visual Bridge: PERSON ← [CLARA] → STAFF */}
        <div className="w-full max-w-4xl glass-panel p-8 sm:p-12 rounded-3xl border border-white/90 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center relative z-10">
            
            {/* Left Node: Student / Visitor */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/70 border border-[#E7E0FA] shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7254C7] to-[#8066D9] flex items-center justify-center text-white shadow-md shadow-purple-500/20 mb-3">
                <User className="w-8 h-8" />
              </div>
              <span className="font-display font-bold text-base text-[#24213A]">Student or Visitor</span>
              <p className="text-xs text-[#65627A] mt-1 font-light">
                Needs specific mentorship, capstone guidance, or urgent administrative sign-off.
              </p>
            </div>

            {/* Central Bridge: CLARA Orb & Light Flow */}
            <div className="flex flex-col items-center justify-center py-4">
              <ClaraCoreCanvas size={150} mode="connecting" intensity={1.1} />
              <div className="w-full flex items-center justify-center gap-2 mt-2 font-mono text-[11px] text-[#8066D9] font-bold">
                <span>INTENT RESOLVED</span>
                <span>•</span>
                <span>SLOT MATCHED</span>
              </div>
            </div>

            {/* Right Node: Faculty / Department Chair */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/70 border border-[#E7E0FA] shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8066D9] to-[#9EDBFF] flex items-center justify-center text-[#24213A] shadow-md shadow-blue-300/20 mb-3">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <span className="font-display font-bold text-base text-[#24213A]">Faculty or Staff</span>
              <p className="text-xs text-[#65627A] mt-1 font-light">
                Receives a prepared, conflict-free appointment with the visitor brief pre-loaded.
              </p>
            </div>

          </div>

          {/* Outcome Footer Banner */}
          <div className="mt-8 pt-6 border-t border-[#E7E0FA] flex flex-col sm:flex-row items-center justify-between text-xs text-[#65627A] gap-3">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-[#24213A]">Zero hallway searching. Zero interrupted lectures.</span>
            </span>
            <span className="font-mono text-[#8066D9] font-semibold">
              The right person at the exact right moment.
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
