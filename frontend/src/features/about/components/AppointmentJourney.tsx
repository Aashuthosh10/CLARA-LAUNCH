import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Calendar, Clock, MapPin, CheckCircle2, 
  ArrowRight, QrCode, UserCheck, ShieldCheck 
} from 'lucide-react';
import { playHoverChime, playStepChime } from '../utils/audio';

export const AppointmentJourney: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      id: 'request',
      stage: '01. REQUEST',
      title: 'Intent Ingestion',
      userSaid: '“I would like to meet the HOD of Data Science for urgent capstone approval.”',
      claraAction: 'Extracts department (Data Science), designated role (HOD), and context (Capstone approval).',
      highlight: 'Natural Language Disambiguation',
      icon: Sparkles
    },
    {
      id: 'understand',
      stage: '02. UNDERSTAND',
      title: 'Presence Verification',
      userSaid: '“Is Dr. Ramesh Sundaram in his office today?”',
      claraAction: 'Queries Turing Block 4th Floor presence beacons & faculty calendar API in real-time.',
      highlight: 'Real-Time Presence Query',
      icon: MapPin
    },
    {
      id: 'find',
      stage: '03. FIND',
      title: 'Slot Discovery',
      userSaid: '“What time does his open office hours begin?”',
      claraAction: 'Discovers Dr. Sundaram is chairing curriculum review until 3:15 PM; open slot available at 3:30 PM.',
      highlight: 'Conflict-Free Discovery',
      icon: Clock
    },
    {
      id: 'schedule',
      stage: '04. SCHEDULE',
      title: 'Reservation & Token',
      userSaid: '“Please book the 3:30 PM slot for 15 minutes.”',
      claraAction: 'Locks hold on faculty calendar and generates dynamic encrypted QR Pass #DS-4029.',
      highlight: 'Automated Pass Generation',
      icon: Calendar
    },
    {
      id: 'connect',
      stage: '05. CONNECT',
      title: 'Face-to-Face Meeting',
      userSaid: '[Student arrives at Room 402 with pass #DS-4029]',
      claraAction: 'Dr. Sundaram welcomes student with capstone proposal summary pre-loaded on screen.',
      highlight: 'Direct Human Connection',
      icon: UserCheck
    }
  ];

  const handleStepClick = (idx: number) => {
    setActiveStep(idx);
    playStepChime(idx + 1);
  };

  const current = steps[activeStep];

  return (
    <section
      id="appointments"
      className="relative min-h-screen flex flex-col justify-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9FF] via-[#F5F3FC] to-[#EFEDFA] overflow-hidden"
    >
      {/* Ambient Lighting */}
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[500px] bg-[#D8CDF7]/30 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-3"
          >
            <Calendar className="w-3.5 h-3.5 text-[#8066D9]" />
            <span>CINEMATIC APPOINTMENT JOURNEY</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-[#24213A] tracking-tight"
          >
            From Request to Connection
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-[#65627A] font-light max-w-xl mx-auto"
          >
            A frictionless flow guiding visitors from an initial question to a confirmed face-to-face consultation.
          </motion.p>
        </div>

        {/* Flowing Step Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-10">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isActive = activeStep === idx;
            const isDone = activeStep > idx;

            return (
              <button
                key={st.id}
                onClick={() => handleStepClick(idx)}
                onMouseEnter={playHoverChime}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7254C7] to-[#8066D9] text-white shadow-md shadow-purple-500/20 scale-105 border-transparent'
                    : isDone
                    ? 'bg-white/80 border-[#C7B9F2] text-[#49358F]'
                    : 'glass-panel text-[#65627A] hover:text-[#24213A] hover:bg-white border-[#E7E0FA]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8066D9]'}`} />
                  <span className="font-mono text-[10px] opacity-80">0{idx + 1}</span>
                </div>
                <span className="text-xs font-bold font-display block leading-tight truncate">
                  {st.stage.split('. ')[1]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Walkthrough Card */}
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/90 shadow-xl max-w-4xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E7E0FA]">
                <div>
                  <span className="font-mono text-xs text-[#8066D9] font-bold uppercase tracking-wider">
                    {current.stage}
                  </span>
                  <h3 className="text-2xl font-bold font-display text-[#24213A] mt-0.5">
                    {current.title}
                  </h3>
                </div>
                <span className="self-start sm:self-auto font-mono text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {current.highlight}
                </span>
              </div>

              {/* Dialog State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Visitor Input */}
                <div className="p-4 rounded-2xl bg-white/80 border border-[#E7E0FA] space-y-1.5">
                  <span className="text-[10px] font-mono text-[#9692AA] uppercase font-bold tracking-wider">
                    Visitor Interaction
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-[#24213A] italic">
                    {current.userSaid}
                  </p>
                </div>

                {/* CLARA Reasoning */}
                <div className="p-4 rounded-2xl bg-[#F5F3FC] border border-[#D8CDF7] space-y-1.5">
                  <span className="text-[10px] font-mono text-[#8066D9] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    CLARA Background Action
                  </span>
                  <p className="text-xs sm:text-sm text-[#49358F] font-medium leading-relaxed">
                    {current.claraAction}
                  </p>
                </div>

              </div>

              {/* Step Navigation Controls */}
              <div className="pt-2 flex items-center justify-between border-t border-[#E7E0FA]">
                <button
                  disabled={activeStep === 0}
                  onClick={() => handleStepClick(activeStep - 1)}
                  className={`text-xs font-mono px-3.5 py-1.5 rounded-lg border transition-colors ${
                    activeStep === 0
                      ? 'opacity-40 cursor-not-allowed border-[#E7E0FA] text-[#9692AA]'
                      : 'border-[#D8CDF7] text-[#49358F] hover:bg-white'
                  }`}
                >
                  ← Previous
                </button>

                <span className="text-xs font-mono text-[#9692AA]">
                  Step {activeStep + 1} of {steps.length}
                </span>

                <button
                  disabled={activeStep === steps.length - 1}
                  onClick={() => handleStepClick(activeStep + 1)}
                  className={`text-xs font-mono px-4 py-1.5 rounded-lg bg-[#7254C7] hover:bg-[#6247B5] text-white font-semibold flex items-center gap-1.5 transition-colors ${
                    activeStep === steps.length - 1 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};
