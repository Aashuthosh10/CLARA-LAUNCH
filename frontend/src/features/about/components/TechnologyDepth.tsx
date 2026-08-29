import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TECH_LAYERS } from '../data/aboutData';
import { TechLayer } from '../types';
import { 
  Layers, Monitor, Radio, Server, Brain, FolderGit2, 
  HardDrive, Video, Mic2, Sparkles, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { playHoverChime, playStepChime } from '../utils/audio';

export const TechnologyDepth: React.FC = () => {
  const [activeLayerId, setActiveLayerId] = useState<string>('intelligence');

  const iconMap: Record<string, React.ElementType> = {
    Monitor,
    Radio,
    Server,
    Brain,
    FolderGit2,
    HardDrive,
    Video,
    Mic2,
  };

  const currentLayer = TECH_LAYERS.find((l) => l.id === activeLayerId) || TECH_LAYERS[3];

  const handleSelectLayer = (id: string, idx: number) => {
    setActiveLayerId(id);
    playStepChime(idx + 1);
  };

  return (
    <section
      id="technology"
      className="relative min-h-screen flex flex-col justify-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9FF] via-[#F5F3FC] to-[#EFEDFA] overflow-hidden"
    >
      {/* Ambient Lighting */}
      <div className="absolute top-1/3 left-1/3 w-[800px] h-[550px] bg-[#D8CDF7]/30 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-3"
          >
            <Layers className="w-3.5 h-3.5 text-[#8066D9]" />
            <span>8-LAYER ARCHITECTURAL STACK</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-[#24213A] tracking-tight"
          >
            Beautiful on the outside. <br className="hidden sm:inline" />
            <span className="text-gradient-violet">Complex underneath.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-[#65627A] font-light max-w-xl mx-auto"
          >
            Engineered for high-concurrency campus environments with sub-second response times and zero-hallucination factual grounding.
          </motion.p>
        </div>

        {/* 8-Layer Architectural Glass Artifact */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          
          {/* Left: Layer Stack Column */}
          <div className="lg:col-span-5 space-y-2">
            {TECH_LAYERS.map((layer, idx) => {
              const Icon = iconMap[layer.icon] || Layers;
              const isActive = activeLayerId === layer.id;

              return (
                <button
                  key={layer.id}
                  onClick={() => handleSelectLayer(layer.id, idx)}
                  onMouseEnter={playHoverChime}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all duration-300 flex items-center justify-between border ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7254C7] to-[#8066D9] text-white shadow-md shadow-purple-500/20 scale-[1.02] border-transparent'
                      : 'glass-panel text-[#65627A] hover:text-[#24213A] hover:bg-white border-[#E7E0FA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-[#E7E0FA] text-[#6247B5]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`font-mono text-[9px] uppercase tracking-wider block ${isActive ? 'text-purple-200' : 'text-[#9692AA]'}`}>
                        {layer.tier}
                      </span>
                      <span className="font-display font-bold text-xs sm:text-sm">
                        {layer.name}
                      </span>
                    </div>
                  </div>

                  <span className={`font-mono text-[10px] ${isActive ? 'text-white' : 'text-[#8066D9]'}`}>
                    {layer.latencyBand}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Layer Deep Dive Glass Screen */}
          <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-white/90 shadow-xl space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLayer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div>
                  <span className="font-mono text-xs text-[#8066D9] font-bold uppercase tracking-wider">
                    {currentLayer.tier}
                  </span>
                  <h3 className="text-2xl font-bold font-display text-[#24213A] mt-0.5">
                    {currentLayer.name}
                  </h3>
                  <p className="font-mono text-xs text-[#49358F] font-semibold mt-1">
                    Technologies: {currentLayer.tech}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-[#E7E0FA] space-y-2 text-xs sm:text-sm">
                  <span className="font-mono text-[10px] text-[#9692AA] uppercase font-bold tracking-wider block">
                    Core Architectural Responsibility:
                  </span>
                  <p className="text-[#24213A] leading-relaxed">
                    {currentLayer.role}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F5F3FC] border border-[#D8CDF7] space-y-1.5 text-xs sm:text-sm">
                  <span className="font-mono text-[10px] text-[#8066D9] uppercase font-bold tracking-wider block">
                    Why This Stack Was Chosen:
                  </span>
                  <p className="text-[#49358F] leading-relaxed">
                    {currentLayer.whyChosen}
                  </p>
                </div>

                {/* Interconnections */}
                <div className="pt-2 border-t border-[#E7E0FA] space-y-1.5 text-xs">
                  <span className="font-mono text-[#9692AA] uppercase tracking-wider text-[10px] font-bold block">
                    Inter-Service Connections:
                  </span>
                  <ul className="space-y-1">
                    {currentLayer.interconnections.map((conn, cIdx) => (
                      <li key={cIdx} className="flex items-center gap-2 text-[#65627A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8066D9]" />
                        <span>{conn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};
