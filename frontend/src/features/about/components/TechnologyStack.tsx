import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TECH_LAYERS } from '../data/aboutData';
import { TechLayer } from '../types';
import { 
  Monitor, Radio, Server, Brain, FolderGit2, HardDrive, 
  Video, Mic2, Layers, Cpu, CheckCircle, ArrowRight, Activity
} from 'lucide-react';
import { playHoverChime, playTone } from '../utils/audio';

const ICON_MAP: Record<string, React.ElementType> = {
  Monitor,
  Radio,
  Server,
  Brain,
  FolderGit2,
  HardDrive,
  Video,
  Mic2,
};

export const TechnologyStack: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>(TECH_LAYERS[0].id);

  const activeLayer = TECH_LAYERS.find((l) => l.id === selectedLayerId) || TECH_LAYERS[0];

  const handleSelect = (layer: TechLayer) => {
    setSelectedLayerId(layer.id);
    playTone(550, 'triangle', 0.12, 0.03);
  };

  return (
    <section
      id="stack"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[#06070a] border-t border-gray-900 overflow-hidden"
    >
      {/* Subtle Noise & Lighting */}
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-red-950/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-4"
          >
            <Layers className="w-3.5 h-3.5 text-red-400" />
            <span>FULL-STACK COGNITIVE TOPOLOGY</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight"
          >
            The Intelligence Stack
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-gray-400 font-light"
          >
            An 8-layer unified architecture bridging sub-50ms real-time transports with grounded RAG pipelines.
          </motion.p>
        </div>

        {/* Layered Architectural Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: The 8-Layer Interactive Visual Stack (6 cols) */}
          <div className="lg:col-span-6 space-y-2.5">
            {TECH_LAYERS.map((layer, index) => {
              const Icon = ICON_MAP[layer.icon] || Cpu;
              const isSelected = selectedLayerId === layer.id;

              return (
                <button
                  key={layer.id}
                  id={`tech-layer-${layer.id}`}
                  onClick={() => handleSelect(layer)}
                  onMouseEnter={playHoverChime}
                  className={`w-full group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-red-950/90 via-[#181a28] to-[#121422] border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.3)] translate-x-2'
                      : 'bg-[#0d0f18]/90 border-gray-800/80 text-gray-400 hover:text-gray-200 hover:border-gray-700 hover:bg-[#121420]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-gray-800/80 text-gray-400 group-hover:text-gray-200'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-red-400 font-bold">
                          0{index + 1} • {layer.tier.split(':')[0]}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white font-display">
                        {layer.name}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-mono text-gray-300 block truncate max-w-[200px]">
                      {layer.tech.split('/')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {layer.latencyBand}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Layer Deep Dive Specifications Panel (6 cols) */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLayer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="p-7 sm:p-9 rounded-3xl bg-[#0e101a] border border-red-500/30 shadow-2xl space-y-6 relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                  <div>
                    <span className="font-mono text-xs text-red-400 uppercase tracking-widest font-semibold block">
                      {activeLayer.tier}
                    </span>
                    <h3 className="text-2xl font-bold text-white font-display mt-0.5">
                      {activeLayer.name}
                    </h3>
                  </div>
                  <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300">
                    {React.createElement(ICON_MAP[activeLayer.icon] || Cpu, { className: 'w-6 h-6' })}
                  </div>
                </div>

                {/* Tech Stack List Pill */}
                <div className="p-3 rounded-xl bg-[#141624] border border-gray-800">
                  <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                    Primary Technologies & Protocols:
                  </span>
                  <span className="text-sm font-semibold text-white font-mono">
                    {activeLayer.tech}
                  </span>
                </div>

                {/* Role Description */}
                <div>
                  <h5 className="text-xs font-mono uppercase tracking-wider text-red-400 font-semibold mb-1">
                    Layer Responsibility:
                  </h5>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {activeLayer.role}
                  </p>
                </div>

                {/* Architectural Rationale */}
                <div className="p-4 rounded-2xl bg-[#0a0c14] border border-gray-800 space-y-1 text-xs">
                  <span className="font-mono font-semibold text-gray-200">
                    Why CLARA Uses This Stack:
                  </span>
                  <p className="text-gray-400 leading-relaxed">{activeLayer.whyChosen}</p>
                </div>

                {/* Interconnections */}
                <div>
                  <h5 className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold mb-2">
                    System Interconnections:
                  </h5>
                  <div className="space-y-2">
                    {activeLayer.interconnections.map((conn, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-gray-300 p-2.5 rounded-lg bg-[#121422] border border-gray-800/80"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{conn}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latency & Telemetry */}
                <div className="pt-2 flex items-center justify-between border-t border-gray-800 text-xs font-mono">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    Target Latency Budget:
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/20">
                    {activeLayer.latencyBand}
                  </span>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};
