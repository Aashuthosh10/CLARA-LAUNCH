import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, CheckCircle2, Zap, Layers, MessageSquare, Radio, ShieldCheck } from 'lucide-react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { playTone, playHoverChime } from '../utils/audio';

export const ClaraMoment: React.FC = () => {
  const [isUnified, setIsUnified] = useState(true);

  const toggleUnified = () => {
    const next = !isUnified;
    setIsUnified(next);
    if (next) {
      playTone(523.25, 'triangle', 0.2, 0.04);
      setTimeout(() => playTone(659.25, 'triangle', 0.25, 0.04), 80);
      setTimeout(() => playTone(783.99, 'sine', 0.3, 0.04), 160);
    } else {
      playTone(330, 'sawtooth', 0.15, 0.02);
    }
  };

  const capabilitiesUnified = [
    { label: 'Campus Knowledge Graph', value: '100% Vector Indexed' },
    { label: 'Staff Office Availability', value: 'Live WebSocket Synced' },
    { label: 'Smart Appointment Matrix', value: 'Zero-Conflict AI Booking' },
    { label: 'Multimodal Voice & Video', value: 'Instant WebRTC Kiosks' },
  ];

  return (
    <section
      id="moment"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#08090d] via-[#0b0c13] to-[#08090d] border-t border-gray-900 overflow-hidden"
    >
      {/* Background Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-red-950/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 text-center">
        
        {/* Section Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-6 shadow-lg shadow-black/40"
        >
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>THE UNIFIED CONVERGENCE</span>
        </motion.div>

        {/* Dramatic Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight"
        >
          What if your institution could{' '}
          <span className="bg-gradient-to-r from-red-400 via-rose-300 to-red-500 bg-clip-text text-transparent underline decoration-red-500/40 underline-offset-8">
            simply talk back?
          </span>
        </motion.h2>

        {/* Supporting Narrative */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-gray-300 font-light max-w-3xl mx-auto leading-relaxed"
        >
          CLARA brings institutional knowledge, AI-powered conversation, appointment management,
          staff interaction, and real-time communication into{' '}
          <span className="font-semibold text-white">one intelligent, always-accessible interface</span>.
        </motion.p>

        {/* Interactive Convergence Switcher Bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="clara-convergence-toggle-btn"
            onClick={toggleUnified}
            onMouseEnter={playHoverChime}
            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#121420] border border-red-500/30 hover:border-red-500/60 shadow-xl text-xs font-mono text-gray-200 transition-all active:scale-95"
          >
            <span className="text-gray-400">View Architecture State:</span>
            <span
              className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                isUnified
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {isUnified ? 'CLARA Unified Nexus (Active)' : 'Fragmented Silos (Disconnected)'}
            </span>
          </button>
        </div>

        {/* Cinematic Convergence Visual Canvas */}
        <div className="mt-12 relative max-w-4xl mx-auto p-8 rounded-3xl bg-[#0e1019]/90 border border-red-500/20 shadow-2xl backdrop-blur-xl overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Visual Canvas (6 cols) */}
            <div className="md:col-span-6 flex flex-col items-center justify-center relative min-h-[340px]">
              <ClaraCoreCanvas
                size={320}
                mode={isUnified ? 'radiant' : 'idle'}
                intensity={isUnified ? 1.3 : 0.4}
              />
              <div className="absolute bottom-2 font-mono text-[11px] text-gray-400 bg-[#090a10]/80 px-3 py-1 rounded-full border border-gray-800">
                {isUnified ? 'Synchronous Neural Ingestion' : 'Siloed Decoupled State'}
              </div>
            </div>

            {/* Live Metrics Convergence List (6 cols) */}
            <div className="md:col-span-6 text-left space-y-4">
              <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                The Conversational Campus
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Rather than navigating twelve different websites or knocking on closed office doors, visitors and students speak naturally. CLARA retrieves verified facts and dispatches staff requests in milliseconds.
              </p>

              <div className="space-y-2.5 pt-2">
                {capabilitiesUnified.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * idx }}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#131624] border border-gray-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 text-gray-200 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-mono text-[11px] text-red-400 font-semibold bg-red-950/60 px-2 py-0.5 rounded border border-red-500/20">
                      {item.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="pt-3 flex items-center gap-2 text-xs font-mono text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Private Data Leakage • Institutional Verification Guardrails</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
