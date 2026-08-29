import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QUERY_SIMULATIONS } from '../data/aboutData';
import { Sparkles, Search, Database, ArrowRight, CheckCircle2, FileText, Brain, ShieldCheck } from 'lucide-react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { playHoverChime, playStepChime } from '../utils/audio';

export const KnowledgeField: React.FC = () => {
  const [activeSimIndex, setActiveSimIndex] = useState<number>(0);
  const activeSim = QUERY_SIMULATIONS[activeSimIndex];

  const handleSimSelect = (idx: number) => {
    setActiveSimIndex(idx);
    playStepChime(idx + 1);
  };

  return (
    <section
      id="intelligence"
      className="relative min-h-screen flex flex-col justify-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9FF] via-[#F5F3FC] to-[#EFEDFA] overflow-hidden"
    >
      {/* Background Radiance & Starfield Dots */}
      <div className="absolute top-1/2 left-1/3 w-[800px] h-[550px] bg-[#D8CDF7]/35 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[400px] bg-[#B9E8FF]/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-dot-fine opacity-35 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-3"
          >
            <Brain className="w-3.5 h-3.5 text-[#8066D9]" />
            <span>HOW CLARA THINKS — RETRIEVAL-AUGMENTED GENERATION</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-[#24213A] tracking-tight"
          >
            Every answer begins with understanding.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-[#65627A] font-light max-w-xl mx-auto"
          >
            CLARA does not guess or hallucinate. She queries a living vector field of verified institutional truth before generating a single word.
          </motion.p>
        </div>

        {/* Live Query Scenario Selector */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          {QUERY_SIMULATIONS.map((sim, idx) => (
            <button
              key={sim.id}
              onClick={() => handleSimSelect(idx)}
              onMouseEnter={playHoverChime}
              className={`px-4 py-2.5 rounded-2xl text-xs font-medium transition-all text-left max-w-xs ${
                activeSimIndex === idx
                  ? 'bg-[#7254C7] text-white shadow-md shadow-purple-500/20 scale-105'
                  : 'glass-panel text-[#65627A] hover:text-[#24213A] hover:bg-white border-[#E7E0FA]'
              }`}
            >
              <div className="font-mono text-[10px] opacity-75 mb-0.5">Scenario 0{idx + 1}</div>
              <div className="font-display font-semibold truncate">{sim.query}</div>
            </button>
          ))}
        </div>

        {/* Interactive RAG Flow Visualizer */}
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/90 shadow-xl max-w-5xl mx-auto space-y-8">
          
          {/* Step 1: User Question Stream */}
          <div className="p-5 rounded-2xl bg-white/80 border border-[#E7E0FA] flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E7E0FA] flex items-center justify-center text-[#6247B5] shrink-0 mt-0.5">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-[#8066D9] uppercase font-bold tracking-wider">
                  01. INGESTED QUERY
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#F5F3FC] text-[#65627A]">
                  {activeSim.category}
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-[#24213A]">
                “{activeSim.query}”
              </p>
            </div>
          </div>

          {/* Step 2: Floating Knowledge Field & Retrieved Context */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#8066D9] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                02. SEARCHING INSTITUTIONAL KNOWLEDGE FIELD (RAG)
              </span>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Documents Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSim.retrievedContext.map((ctx, cIdx) => (
                <div
                  key={cIdx}
                  className="p-4 rounded-2xl bg-gradient-to-br from-white/90 to-[#F5F3FC]/70 border border-[#D8CDF7] shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#49358F] font-semibold flex items-center gap-1 truncate max-w-[200px]">
                      <FileText className="w-3 h-3 text-[#8066D9]" />
                      {ctx.source}
                    </span>
                    <span className="text-[#8066D9] font-bold">
                      {Math.round(ctx.relevanceScore * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-[#65627A] leading-relaxed italic bg-white/60 p-2.5 rounded-xl border border-white">
                    “{ctx.snippet}”
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Grounded Synthesis & Output */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#F5F3FC] via-white to-[#FAF9FF] border border-[#C7B9F2] space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#8066D9] flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-mono text-xs text-[#49358F] font-bold uppercase tracking-wider">
                  03. SYNTHESIZED CLARA RESPONSE
                </span>
              </div>
              {activeSim.actionRequired && (
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#E7E0FA] text-[#49358F] font-semibold border border-[#D8CDF7]">
                  Action: {activeSim.actionRequired}
                </span>
              )}
            </div>

            <p className="text-sm sm:text-base text-[#24213A] font-medium leading-relaxed">
              {activeSim.answer}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
