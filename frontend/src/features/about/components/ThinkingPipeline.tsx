import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PIPELINE_STAGES, QUERY_SIMULATIONS } from '../data/aboutData';
import { PipelineStage, QuerySimulation } from '../types';
import { 
  Mic, Cpu, Search, Layers, Sparkles, Volume2, 
  ArrowRight, Play, CheckCircle2, FileSearch, ShieldCheck, Database
} from 'lucide-react';
import { playHoverChime, playPipelineStepSound, playTone } from '../utils/audio';

const ICON_MAP: Record<string, React.ElementType> = {
  Mic,
  Cpu,
  Search,
  Layers,
  Sparkles,
  Volume2,
};

export const ThinkingPipeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedSim, setSelectedSim] = useState<QuerySimulation>(QUERY_SIMULATIONS[0]);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAuto) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          const next = prev >= PIPELINE_STAGES.length ? 1 : prev + 1;
          playPipelineStepSound(next);
          return next;
        });
      }, 2400);
    }
    return () => clearInterval(timer);
  }, [isPlayingAuto]);

  const handleStepClick = (stepNum: number) => {
    setIsPlayingAuto(false);
    setActiveStep(stepNum);
    playPipelineStepSound(stepNum);
  };

  const handleSimSelect = (sim: QuerySimulation) => {
    setSelectedSim(sim);
    setActiveStep(1);
    setIsPlayingAuto(true);
    playTone(587.33, 'sine', 0.15, 0.03);
  };

  const currentStage = PIPELINE_STAGES.find((s) => s.stepNumber === activeStep) || PIPELINE_STAGES[0];

  return (
    <section
      id="pipeline"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[#090a10] border-t border-gray-900 overflow-hidden"
    >
      {/* Background Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-red-950/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-4"
          >
            <Cpu className="w-3.5 h-3.5 text-red-400" />
            <span>GROUNDED COGNITIVE ARCHITECTURE</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight"
          >
            Behind every answer is a process.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed"
          >
            CLARA does not guess or hallucinate. Private institutional intelligence is strictly grounded
            in verified campus knowledge retrieval before language generation.
          </motion.p>
        </div>

        {/* Live Query Scenario Selector */}
        <div className="mb-12 p-4 rounded-2xl bg-[#0e101a] border border-gray-800/90 shadow-xl max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-800/80">
            <span className="text-xs font-mono text-gray-400 font-semibold flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-red-400" />
              SELECT AN INSTITUTIONAL QUERY TO RUN THROUGH THE PIPELINE:
            </span>
            <button
              onClick={() => setIsPlayingAuto(!isPlayingAuto)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-xs font-mono text-red-300 transition-colors"
            >
              <Play className={`w-3 h-3 ${isPlayingAuto ? 'animate-spin' : ''}`} />
              <span>{isPlayingAuto ? 'Pause Simulation' : 'Auto-Play Pipeline'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {QUERY_SIMULATIONS.map((sim) => {
              const isSelected = selectedSim.id === sim.id;
              return (
                <button
                  key={sim.id}
                  onClick={() => handleSimSelect(sim)}
                  onMouseEnter={playHoverChime}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-red-950/80 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'bg-[#131624] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  <span className="text-[10px] font-mono text-red-400 block mb-1 uppercase font-semibold">
                    {sim.category}
                  </span>
                  <p className="text-xs text-gray-200 line-clamp-2 font-medium">"{sim.query}"</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* The 6-Stage Interactive Visual Pipeline Strip */}
        <div className="relative mb-12">
          {/* Connecting Laser Trace Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 bg-gray-800 -translate-y-1/2 z-0">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 to-rose-400 shadow-[0_0_12px_#ef4444]"
              animate={{ width: `${((activeStep - 1) / (PIPELINE_STAGES.length - 1)) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Stage Node Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
            {PIPELINE_STAGES.map((stage) => {
              const Icon = ICON_MAP[stage.icon] || Sparkles;
              const isActive = activeStep === stage.stepNumber;
              const isCompleted = activeStep > stage.stepNumber;

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStepClick(stage.stepNumber)}
                  onMouseEnter={playHoverChime}
                  className={`group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 relative ${
                    isActive
                      ? 'bg-red-950/90 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-105'
                      : isCompleted
                      ? 'bg-[#121422] border-red-500/40 text-gray-300'
                      : 'bg-[#0e101a] border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-all ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-900/80 animate-pulse'
                        : isCompleted
                        ? 'bg-red-950/70 text-red-300 border border-red-500/40'
                        : 'bg-gray-900 text-gray-500 group-hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="font-mono text-[10px] text-red-400 font-semibold mb-0.5">
                    STEP 0{stage.stepNumber}
                  </span>
                  <span className="text-xs font-bold text-white leading-tight font-display mb-1">
                    {stage.name}
                  </span>
                  <span className="text-[10px] text-gray-400 line-clamp-1">
                    {stage.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pipeline Stage Deep Dive & Live Grounding Output Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Stage Architecture Inspector (6 cols) */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-[#0e101b] border border-red-500/25 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono text-xs text-red-300 font-bold uppercase tracking-wider">
                  Active Stage: 0{currentStage.stepNumber} / 06
                </span>
              </div>
              <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-gray-800/90 text-gray-300 border border-gray-700">
                {currentStage.techTerm}
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-white mb-1">
                {currentStage.name}
              </h3>
              <p className="font-mono text-xs text-red-400 mb-3">{currentStage.subtitle}</p>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                {currentStage.description}
              </p>
              <div className="p-3.5 rounded-xl bg-[#141726] border border-gray-800/90 text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-white block mb-1">Technical Execution:</span>
                {currentStage.detail}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs font-mono text-gray-400">
              <span>Stream Packet Status:</span>
              <span className="text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                {currentStage.packetStatus}
              </span>
            </div>
          </div>

          {/* Right: Live RAG Data & Grounding Context Cards (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Step 3 & 4 highlight: Verified Document Sources */}
            <div className="p-6 rounded-3xl bg-[#0c0e18] border border-gray-800 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                <span className="flex items-center gap-2 text-red-400 font-semibold">
                  <Database className="w-4 h-4" />
                  INSTITUTIONAL KNOWLEDGE RETRIEVAL (RAG)
                </span>
                <span className="text-emerald-400">Vector Grounded</span>
              </div>

              <div className="space-y-2.5">
                {selectedSim.retrievedContext.map((ctx, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#121524] border border-gray-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-gray-300 font-semibold truncate">{ctx.source}</span>
                      <span className="text-emerald-400 shrink-0 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        Sim: {(ctx.relevanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-gray-400 italic">"{ctx.snippet}"</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-gray-300">
                <span className="font-mono text-red-400 font-semibold block mb-0.5">AI REASONING TRACE:</span>
                <p className="text-gray-300 leading-normal">{selectedSim.reasoningNotes}</p>
              </div>
            </div>

            {/* Final Grounded Response Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-red-950/40 via-[#10121d] to-[#0d0f19] border border-red-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-red-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  CLARA VERIFIED OUTPUT
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Factually Grounded
                </span>
              </div>

              <p className="text-sm text-gray-100 leading-relaxed font-medium">
                "{selectedSim.answer}"
              </p>

              {selectedSim.actionRequired && (
                <div className="pt-2 flex items-center justify-between border-t border-red-500/20 text-xs">
                  <span className="text-gray-400 font-mono">Suggested Institutional Action:</span>
                  <span className="px-2.5 py-1 rounded-md bg-red-600 text-white font-semibold shadow-sm">
                    {selectedSim.actionRequired}
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
