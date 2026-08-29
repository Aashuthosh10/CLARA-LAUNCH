import React from 'react';
import { motion } from 'motion/react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { Sparkles, MessageSquare, Database, CalendarCheck, Users, Radio, Globe } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

export const ClaraEmergence: React.FC = () => {
  const convergingNodes = [
    { label: 'Campus Bylaws & Syllabi', icon: Database, color: '#8066D9', delay: 0.1 },
    { label: 'Faculty Calendars', icon: CalendarCheck, color: '#6247B5', delay: 0.2 },
    { label: 'Live Desk Escalations', icon: Users, color: '#7254C7', delay: 0.3 },
    { label: 'Real-Time Check-Ins', icon: Radio, color: '#9EDBFF', delay: 0.4 },
    { label: 'Multilingual Ingestion', icon: Globe, color: '#C7B9F2', delay: 0.5 },
    { label: 'Natural Dialog', icon: MessageSquare, color: '#8066D9', delay: 0.6 },
  ];

  return (
    <section
      id="emergence"
      className="relative min-h-screen flex flex-col justify-center items-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9FF] via-[#F5F3FC] to-[#EFEDFA] overflow-hidden"
    >
      {/* Background Radiance Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-tr from-[#D8CDF7]/40 via-[#B9E8FF]/30 to-[#F1D9FA]/35 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-dot-fine opacity-40 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 text-center flex flex-col items-center">
        
        {/* Luminous Core Return */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          <ClaraCoreCanvas size={280} mode="radiant" intensity={1.15} />
        </motion.div>

        {/* Cinematic Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="space-y-3 mb-10"
        >
          <span className="font-mono text-xs text-[#8066D9] uppercase tracking-widest font-semibold">
            The Convergence
          </span>
          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-[#24213A] tracking-tight">
            That is where <span className="text-gradient-violet">CLARA</span> begins.
          </h2>
          <p className="text-base sm:text-xl text-[#65627A] font-light max-w-2xl mx-auto leading-relaxed pt-2">
            CLARA connects people, institutional knowledge, communication, and services through
            natural, unified interaction.
          </p>
        </motion.div>

        {/* Luminous Converging Information Streams */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 w-full max-w-3xl">
          {convergingNodes.map((node, idx) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={node.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 + node.delay }}
                onMouseEnter={playHoverChime}
                className="p-4 rounded-2xl glass-panel border border-white/90 hover:border-[#C7B9F2] transition-all hover:scale-105 shadow-sm flex items-center gap-3 text-left group"
              >
                <div className="w-8 h-8 rounded-xl bg-[#E7E0FA] flex items-center justify-center text-[#6247B5] group-hover:bg-[#8066D9] group-hover:text-white transition-colors shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#24213A] group-hover:text-[#49358F] transition-colors leading-tight">
                  {node.label}
                </span>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
