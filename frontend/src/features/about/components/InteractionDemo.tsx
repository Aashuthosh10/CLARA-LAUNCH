import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, UserCheck, CalendarCheck, Video, HeartHandshake, 
  ArrowRight, ShieldCheck, CheckCircle2, Clock, MapPin, Play
} from 'lucide-react';
import { playHoverChime, playTone } from '../utils/audio';

export const InteractionDemo: React.FC = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const steps = [
    {
      id: 'understanding',
      title: '01. Intent Understanding',
      badge: 'Natural Dialog Disambiguation',
      userSaid: '“I need to meet the HOD of Data Science for urgent capstone approval.”',
      claraThought: 'Identified target role: Head of Department (Data Science). Extracted urgency and purpose (Capstone Sign-off).',
      claraResponse: '“Certainly. The Head of Data Science is Dr. Ramesh Sundaram. Let me verify his availability for you right now.”',
      icon: Sparkles,
      status: 'Intent Grounded'
    },
    {
      id: 'identifying',
      title: '02. Identifying Staff & Presence',
      badge: 'Real-Time Presence Query',
      userSaid: '“Is he in his office right now?”',
      claraThought: 'Queried Turing Block 4th Floor presence beacons and calendar API. Faculty currently hosting Department Curriculum meeting until 3:15 PM.',
      claraResponse: '“Dr. Sundaram is currently chairing a curriculum review until 3:15 PM in Conference Hall 2, but has designated office slots starting at 3:30 PM.”',
      icon: MapPin,
      status: 'Live Beacon Synced'
    },
    {
      id: 'availability',
      title: '03. Checking Slot Availability',
      badge: 'Smart Conflict-Free Matching',
      userSaid: '“Can I book a 15-minute slot today at 3:30 PM?”',
      claraThought: 'Validated 3:30 PM slot availability. Zero conflicting reservations found. Reserved hold on calendar.',
      claraResponse: '“Slot available! I have scheduled a 15-minute consultation at 3:30 PM today in Alan Turing Block, Room 402.”',
      icon: Clock,
      status: 'Slot Reserved'
    },
    {
      id: 'appointment',
      title: '04. Digital Pass & Token Issuance',
      badge: 'Automated Credentialing',
      userSaid: '“Thank you. Do I need a physical gate pass?”',
      claraThought: 'Generated dynamic encrypted QR Pass #DS-4029. Dispatched SMS confirmation and sent calendar invite to student & faculty.',
      claraResponse: '“Your digital visitor pass #DS-4029 has been generated on your phone screen. Security at Turing Block has been notified of your 3:30 PM arrival.”',
      icon: CalendarCheck,
      status: 'QR Pass Issued'
    },
    {
      id: 'connection',
      title: '05. Real Human Connection',
      badge: 'Human-Centered Escalation',
      userSaid: '[Student arrives at Room 402 at 3:30 PM]',
      claraThought: 'Dr. Sundaram’s assistant acknowledges arrival. Student meets faculty directly with capstone brief pre-loaded.',
      claraResponse: '“Welcome! Dr. Sundaram is expecting you. You are meeting the right person at the exact right moment.”',
      icon: HeartHandshake,
      status: 'Empathy & Human Touch Delivered'
    }
  ];

  const handleStepClick = (idx: number) => {
    setActiveStepIndex(idx);
    playTone(520 + idx * 60, 'sine', 0.15, 0.03);
  };

  const currentStep = steps[activeStepIndex];

  return (
    <section
      id="connection-demo"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#06070a] via-[#090a12] to-[#07070b] border-t border-gray-900 overflow-hidden"
    >
      {/* Ambient background lighting */}
      <div className="absolute top-1/2 left-1/3 w-[700px] h-[500px] bg-red-950/20 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-4"
          >
            <UserCheck className="w-3.5 h-3.5 text-red-400" />
            <span>HUMAN-CENTERED AI DESIGN PHILOSOPHY</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight"
          >
            From Question to Connection
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-gray-300 font-light max-w-2xl mx-auto leading-relaxed"
          >
            CLARA is never built to replace human teachers or staff. It is built to{' '}
            <span className="font-semibold text-white">connect people to the right human at the right time</span>.
          </motion.p>
        </div>

        {/* Step Progress Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-10">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isActive = activeStepIndex === idx;
            const isDone = activeStepIndex > idx;

            return (
              <button
                key={st.id}
                onClick={() => handleStepClick(idx)}
                onMouseEnter={playHoverChime}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'bg-red-950 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-105'
                    : isDone
                    ? 'bg-[#121422] border-red-500/30 text-gray-300'
                    : 'bg-[#0e101a] border-gray-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-gray-400'}`} />
                  <span className="font-mono text-[10px] text-gray-400">0{idx + 1}</span>
                </div>
                <span className="text-xs font-bold font-display block leading-tight truncate">
                  {st.title.split('. ')[1]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Case Study Screen */}
        <div className="p-7 sm:p-10 rounded-3xl bg-[#0d0f1a]/95 border border-red-500/30 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Step Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-800">
                <div>
                  <span className="font-mono text-xs text-red-400 font-bold uppercase tracking-wider">
                    {currentStep.title}
                  </span>
                  <h3 className="text-2xl font-bold text-white font-display mt-0.5">
                    {currentStep.badge}
                  </h3>
                </div>
                <span className="self-start sm:self-auto font-mono text-xs px-3 py-1 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {currentStep.status}
                </span>
              </div>

              {/* Dialog Simulation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Visitor Touchpoint */}
                <div className="p-5 rounded-2xl bg-[#121422] border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      VISITOR / STUDENT
                    </span>
                    <span>Speech Ingestion</span>
                  </div>
                  <p className="text-sm text-gray-200 font-medium italic pt-1">
                    {currentStep.userSaid}
                  </p>
                </div>

                {/* CLARA Reasoning & Grounding */}
                <div className="p-5 rounded-2xl bg-red-950/25 border border-red-500/25 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-red-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      CLARA COGNITIVE ACTION
                    </span>
                    <span className="text-gray-400">Sub-60ms</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {currentStep.claraThought}
                  </p>
                </div>

              </div>

              {/* CLARA Voice/Text Output Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#141624] to-[#0e101b] border border-red-500/40 shadow-lg flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-red-300 font-bold uppercase tracking-wider block mb-1">
                    CLARA Vocal & Visual Response:
                  </span>
                  <p className="text-sm text-white font-medium leading-relaxed">
                    {currentStep.claraResponse}
                  </p>
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="pt-3 flex items-center justify-between border-t border-gray-800">
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => handleStepClick(activeStepIndex - 1)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${
                    activeStepIndex === 0
                      ? 'opacity-30 cursor-not-allowed border-gray-800 text-gray-500'
                      : 'border-gray-700 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  ← Previous Step
                </button>

                <div className="text-xs font-mono text-gray-400">
                  Step {activeStepIndex + 1} of {steps.length}
                </div>

                <button
                  disabled={activeStepIndex === steps.length - 1}
                  onClick={() => handleStepClick(activeStepIndex + 1)}
                  className={`text-xs font-mono px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5 transition-colors ${
                    activeStepIndex === steps.length - 1 ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <span>Next Step</span>
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
