import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { 
  MessageSquare, Sparkles, Calendar, HeartHandshake, Radio, 
  Brain, Database, CheckCircle2, ArrowRight, UserCheck, Play 
} from 'lucide-react';
import { playHoverChime, playStepChime } from '../utils/audio';

export const CapabilityExperience: React.FC = () => {
  const [activeConceptId, setActiveConceptId] = useState<string>('converse');

  const concepts = [
    {
      id: 'converse',
      title: 'CONVERSE',
      tagline: 'Empathetic Natural Dialog',
      description: 'Conversational multi-turn memory that understands nuance, accents, and institutional context without robotic scripts.',
      icon: MessageSquare,
      interactionType: 'Speech particles converge into the central CLARA orb',
      sample: {
        user: '“Hi, I’m an exchange student from France looking for the Registrar.”',
        clara: '“Welcome! The Registrar’s Office is on the 1st Floor of Admin Block, Room 102. Would you prefer instructions in French or English?”'
      }
    },
    {
      id: 'discover',
      title: 'DISCOVER',
      tagline: 'Instant Knowledge Synthesis',
      description: 'Assembles verified campus regulations, room locations, and lab schedules from hundreds of documents into instant clarity.',
      icon: Sparkles,
      interactionType: 'Scattered fragments assemble into a crystal-clear answer',
      sample: {
        user: '“What is the minimum attendance required for midterm exams?”',
        clara: '“Under Academic Regulation §4.2, a 75% aggregate attendance per subject is mandatory for examination eligibility.”'
      }
    },
    {
      id: 'schedule',
      title: 'SCHEDULE',
      tagline: 'Frictionless Calendar Coordination',
      description: 'Reads real-time faculty office hours, resolves appointment conflicts, and instantly issues encrypted digital passes.',
      icon: Calendar,
      interactionType: 'An organic timeline ribbon forms dynamically',
      sample: {
        user: '“Can I book 15 minutes with Dr. Sarah Vance this afternoon?”',
        clara: '“Dr. Vance has a designated slot open at 3:30 PM in Room 412. I have reserved this slot and sent the pass to your phone.”'
      }
    },
    {
      id: 'connect',
      title: 'CONNECT',
      tagline: 'Human-Centered Bridge',
      description: 'Connects visitors to the exact right person, escalating to live receptionist video kiosks or faculty offices when empathy is needed.',
      icon: HeartHandshake,
      interactionType: 'Two distant human nodes become united by light',
      sample: {
        user: '“I need urgent Dean approval on my scholarship hardship petition.”',
        clara: '“Connecting your request directly to Dean Assistant Counter 3 right now with your hardship brief pre-loaded.”'
      }
    },
    {
      id: 'communicate',
      title: 'COMMUNICATE',
      tagline: 'Real-Time WebSockets Event Bus',
      description: 'Sub-45ms WebSocket pipes broadcast desk check-ins, hallway relocations, and campus announcements instantaneously.',
      icon: Radio,
      interactionType: 'Soft communication ripples radiate outward',
      sample: {
        user: '“Visiting guest speaker Dr. Paul Thorne has checked in at North Gate.”',
        clara: '“Real-time push event emitted to Department Host and Reception Desk 1.”'
      }
    },
    {
      id: 'understand',
      title: 'UNDERSTAND',
      tagline: 'Semantic Intent Disambiguation',
      description: 'Extracts critical entities (dates, course numbers, faculty names) to understand what the visitor truly needs.',
      icon: Brain,
      interactionType: 'Semantic entities illuminate in harmony',
      sample: {
        user: '“Where do I turn in my DSP assignment late?”',
        clara: '“Identified Digital Signal Processing (ECE-304). Submissions go to Turing Block Room 218 Assignment Drop box.”'
      }
    },
    {
      id: 'retrieve',
      title: 'RETRIEVE',
      tagline: 'Dense Vector Institutional RAG',
      description: 'Performs nearest-neighbor vector retrieval over official syllabi and directories, guaranteeing zero hallucinations.',
      icon: Database,
      interactionType: 'Verified fragments are pulled from the knowledge field',
      sample: {
        user: '“Who is the faculty advisor for Robotics Club?”',
        clara: '“Dr. Emily Watson (Mechatronics Dept, Lab 4). Verified via Faculty Roster 2025-2026.”'
      }
    },
    {
      id: 'assist',
      title: 'ASSIST',
      tagline: 'Always-Available Kiosk Co-Pilot',
      description: 'Supports physical touchscreens, mobile web, and voice reception desks 24/7 in multiple languages without fatigue.',
      icon: UserCheck,
      interactionType: 'Immediate guided action resolution',
      sample: {
        user: '“I am visiting for the Open House and need a parking pass.”',
        clara: '“Visitor parking pass #VP-804 generated for West Lot. Gate barrier notified.”'
      }
    }
  ];

  const currentConcept = concepts.find((c) => c.id === activeConceptId) || concepts[0];

  const handleSelectConcept = (id: string, index: number) => {
    setActiveConceptId(id);
    playStepChime(index);
  };

  return (
    <section
      id="capabilities"
      className="relative min-h-screen flex flex-col justify-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EFEDFA] via-[#F5F3FC] to-[#FAF9FF] overflow-hidden"
    >
      {/* Ambient Aurora Fields */}
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[500px] bg-[#D8CDF7]/30 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[600px] h-[450px] bg-[#B9E8FF]/35 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8066D9]" />
            <span>LIVING CONSTELLATION OF CAPABILITIES</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-[#24213A] tracking-tight"
          >
            What CLARA Can Do
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-[#65627A] font-light max-w-xl mx-auto"
          >
            Not a checklist of static features, but an intelligent, living organism responding to every need.
          </motion.p>
        </div>

        {/* Constellation Navigation Ring / Grid */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-10 max-w-4xl mx-auto">
          {concepts.map((c, idx) => {
            const Icon = c.icon;
            const isActive = activeConceptId === c.id;

            return (
              <button
                key={c.id}
                onClick={() => handleSelectConcept(c.id, idx)}
                onMouseEnter={playHoverChime}
                className={`px-4 py-2.5 rounded-full text-xs font-display font-semibold transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7254C7] to-[#8066D9] text-white shadow-md shadow-purple-500/20 scale-105'
                    : 'glass-panel text-[#65627A] hover:text-[#24213A] hover:bg-white border-[#E7E0FA]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8066D9]'}`} />
                <span>{c.title}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Constellation Showcase Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center glass-panel p-6 sm:p-10 rounded-3xl border border-white/90 shadow-xl max-w-5xl mx-auto">
          
          {/* Left: Dynamic Glowing Core State */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-white/60 to-[#F5F3FC]/40 border border-white/80">
            <ClaraCoreCanvas size={220} mode={activeConceptId === 'retrieve' || activeConceptId === 'understand' ? 'thinking' : 'radiant'} />
            <span className="font-mono text-[10px] uppercase text-[#8066D9] tracking-widest mt-2 font-semibold">
              DYNAMIC CORE INTERACTION:
            </span>
            <span className="text-xs font-medium text-[#65627A] text-center mt-0.5">
              {currentConcept.interactionType}
            </span>
          </div>

          {/* Right: Concept Intelligence & Live Demonstration */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentConcept.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <span className="font-mono text-xs text-[#8066D9] font-semibold tracking-wider uppercase">
                    Capability {concepts.findIndex((c) => c.id === currentConcept.id) + 1} of {concepts.length}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#24213A]">
                    {currentConcept.title} — {currentConcept.tagline}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-[#65627A] font-light leading-relaxed">
                    {currentConcept.description}
                  </p>
                </div>

                {/* Simulated Conversational Touchpoint */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-[#E7E0FA] space-y-3 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#9692AA] uppercase tracking-wider block">
                      Visitor Asks:
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-[#24213A] italic">
                      {currentConcept.sample.user}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F5F3FC] space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8066D9] font-semibold uppercase">
                      <Sparkles className="w-3 h-3 text-[#8066D9]" />
                      <span>CLARA Response:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#49358F] font-medium leading-relaxed">
                      {currentConcept.sample.clara}
                    </p>
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
