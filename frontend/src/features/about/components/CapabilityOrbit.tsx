import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CAPABILITIES } from '../data/aboutData';
import { Capability } from '../types';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { 
  MessageSquareText, Database, CalendarCheck, Users, 
  Zap, Video, Mic, Languages, Check, ArrowUpRight, Sparkles, Orbit
} from 'lucide-react';
import { playHoverChime, playNodeSelectChime } from '../utils/audio';

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquareText,
  Database,
  CalendarCheck,
  Users,
  Zap,
  Video,
  Mic,
  Languages,
};

export const CapabilityOrbit: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(CAPABILITIES[0].id);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeCapability = CAPABILITIES.find((c) => c.id === (hoveredId || selectedId)) || CAPABILITIES[0];

  const handleSelect = (cap: Capability) => {
    setSelectedId(cap.id);
    playNodeSelectChime();
  };

  return (
    <section
      id="capabilities"
      className="relative py-28 px-4 sm:px-6 lg:px-8 bg-[#07070a] border-t border-gray-900 overflow-hidden"
    >
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-red-950/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-4"
          >
            <Orbit className="w-3.5 h-3.5 text-red-400" />
            <span>ORBITAL CAPABILITY MATRIX</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight"
          >
            What CLARA Can Do
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-gray-400 font-light"
          >
            Hover or select an orbital intelligence node to inspect real-time institutional capabilities.
          </motion.p>
        </div>

        {/* Orbital Interactive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Orbital Visualization System (7 cols desktop) */}
          <div className="lg:col-span-7 relative h-[480px] sm:h-[540px] rounded-3xl bg-[#0b0c14]/90 border border-gray-800/90 shadow-2xl overflow-hidden flex items-center justify-center">
            
            {/* Concentric Orbital Track Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full border border-red-500/20 animate-pulse" />
              <div className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full border border-gray-800/80 border-dashed" />
              <div className="w-[420px] h-[420px] sm:w-[500px] h-[500px] rounded-full border border-red-500/10" />
            </div>

            {/* Central CLARA Core Nucleus */}
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
              <ClaraCoreCanvas
                size={220}
                mode={hoveredId ? 'thinking' : 'idle'}
                intensity={hoveredId ? 1.4 : 1}
              />
              <div className="absolute font-mono text-[10px] text-red-300 font-bold uppercase tracking-widest bg-red-950/90 px-2 py-0.5 rounded border border-red-500/40 -bottom-2 shadow-lg">
                CLARA CORE
              </div>
            </div>

            {/* Orbiting Capability Nodes positioned in circular geometry */}
            {CAPABILITIES.map((cap, index) => {
              const Icon = ICON_MAP[cap.icon] || Sparkles;
              const isSelected = selectedId === cap.id;
              const isHovered = hoveredId === cap.id;
              const isDimmed = (hoveredId && !isHovered) || (!hoveredId && !isSelected);

              // Circular Trigonometry Calculation for Orbital Nodes
              const angleRad = (index / CAPABILITIES.length) * 2 * Math.PI - Math.PI / 2;
              // Responsive radius (approx 150px on mobile, 185px on desktop)
              const radiusPercent = 38; // percentage from center
              const xPos = 50 + radiusPercent * Math.cos(angleRad);
              const yPos = 50 + radiusPercent * Math.sin(angleRad);

              return (
                <button
                  key={cap.id}
                  id={`capability-node-${cap.id}`}
                  onClick={() => handleSelect(cap)}
                  onMouseEnter={() => {
                    setHoveredId(cap.id);
                    playHoverChime();
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl border transition-all duration-300 select-none ${
                    isSelected || isHovered
                      ? 'bg-red-950/95 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.45)] scale-110'
                      : 'bg-[#121422]/90 border-gray-800/90 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  } ${isDimmed ? 'opacity-55 hover:opacity-100' : 'opacity-100'}`}
                >
                  <div
                    className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
                      isSelected || isHovered
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-gray-800/70 text-gray-400 group-hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline-block pr-1 font-display">
                    {cap.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Capability Deep-Dive Inspection Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCapability.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="p-6 sm:p-8 rounded-3xl bg-[#0e101a] border border-red-500/25 shadow-2xl relative overflow-hidden"
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-5">
                  <span className="px-2.5 py-1 rounded-md bg-red-950/80 border border-red-500/30 text-red-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                    {activeCapability.category}
                  </span>
                  <span className="font-mono text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {activeCapability.metric}
                  </span>
                </div>

                {/* Title & Short Description */}
                <h3 className="font-display text-2xl font-bold text-white mb-2">
                  {activeCapability.title}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-5">
                  {activeCapability.fullDesc}
                </p>

                {/* Feature Bullets */}
                <div className="space-y-2 mb-6">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
                    Core Specifications:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeCapability.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#141624] border border-gray-800/70 text-xs text-gray-300"
                      >
                        <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Simulated Dialog Card */}
                <div className="p-4 rounded-2xl bg-[#090b12] border border-gray-800/90 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>LIVE INTERACTION PREVIEW</span>
                    {activeCapability.sampleInteraction.actionTag && (
                      <span className="text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                        {activeCapability.sampleInteraction.actionTag}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="font-mono font-bold text-gray-400 shrink-0">Visitor:</span>
                      <p className="text-gray-300 italic">
                        "{activeCapability.sampleInteraction.user}"
                      </p>
                    </div>
                    <div className="flex gap-2 bg-red-950/20 p-2.5 rounded-xl border border-red-500/15">
                      <span className="font-mono font-bold text-red-400 shrink-0">CLARA:</span>
                      <p className="text-gray-200">
                        "{activeCapability.sampleInteraction.clara}"
                      </p>
                    </div>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};
