import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClaraRoboticFace } from './ClaraRoboticFace';
import {
  Brain,
  BookOpen,
  Mic,
  Calendar,
  Users,
  Video,
  ArrowRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { playNodeSelectChime, playHoverChime } from '../utils/audio';

export interface MindMapNode {
  id: string;
  name: string;
  emoji: string;
  icon: React.ElementType;
  tagline: string;
  detail: string;
  highlightStat: string;
}

export const MIND_MAP_CAPABILITIES: MindMapNode[] = [
  {
    id: 'understand',
    name: 'UNDERSTAND',
    emoji: '🧠',
    icon: Brain,
    tagline: 'Understands natural-language questions and conversational intent.',
    detail: 'Features contextual multi-turn memory, intent disambiguation, and adaptive tone calibration for institutional inquiries.',
    highlightStat: '<120ms Intent Classification',
  },
  {
    id: 'know',
    name: 'KNOW',
    emoji: '📚',
    icon: BookOpen,
    tagline: 'Uses institution-specific knowledge to provide grounded information.',
    detail: 'Directly retrieves verified campus handbooks, syllabus guidelines, department directories, and lab schedules via zero-hallucination RAG.',
    highlightStat: 'Vector Grounded RAG',
  },
  {
    id: 'speak',
    name: 'SPEAK',
    emoji: '🎙️',
    icon: Mic,
    tagline: 'Supports speech interaction through speech recognition and voice responses.',
    detail: 'Enables fluid hands-free voice interaction powered by noise-resistant streaming neural speech-to-text and human-warm vocal synthesis.',
    highlightStat: 'Sub-200ms Voice Pipeline',
  },
  {
    id: 'schedule',
    name: 'SCHEDULE',
    emoji: '📅',
    icon: Calendar,
    tagline: 'Helps users with appointment-related interactions.',
    detail: 'Seamlessly reads faculty office hours, identifies conflict-free time slots, reserves queue passes, and issues digital calendar confirmations.',
    highlightStat: 'Automated Calendar Sync',
  },
  {
    id: 'connect',
    name: 'CONNECT',
    emoji: '👥',
    icon: Users,
    tagline: 'Helps users reach the appropriate staff or institutional contact.',
    detail: 'Instantly identifies departmental personnel, confirms live presence status, and routes visitors to designated faculty or staff desks.',
    highlightStat: 'Instant Staff Dispatch',
  },
  {
    id: 'communicate',
    name: 'COMMUNICATE',
    emoji: '📹',
    icon: Video,
    tagline: 'Supports real-time and video communication.',
    detail: 'Powers one-touch instant escalation from the AI kiosk directly into an encrypted, ultra-low latency WebRTC live receptionist video stream.',
    highlightStat: 'WebRTC P2P Video Mesh',
  },
];

interface Card02Props {
  onNextCard?: () => void;
  onOpenLiveDemo?: () => void;
}

export const Card02CapabilitiesMindMap: React.FC<Card02Props> = ({
  onNextCard,
}) => {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
    playNodeSelectChime();
  };

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between pt-24 sm:pt-28 pb-8 px-4 sm:px-8 lg:px-14 bg-gradient-to-b from-[#FAF8FF] via-white to-[#F6F3FE] overflow-hidden select-none">
      {/* Luminous Radial Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-tr from-[#7C3AED]/10 via-[#DDD6FE]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Top Title & Section Header - Scaled for 1m Visibility */}
      <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center pt-2 sm:pt-4">
        <h2
          style={{
            fontSize: 'clamp(44px, 5.2vw, 76px)',
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
          }}
          className="font-display font-black text-[#09090B] mb-3"
        >
          WHAT{' '}
          <span
            className="inline-block"
            style={{
              background: 'linear-gradient(180deg, #A855F7 0%, #8B5CF6 32%, #7C3AED 68%, #581C87 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 3px 12px rgba(124,58,237,0.3))',
            }}
          >
            CLARA
          </span>{' '}
          CAN DO
        </h2>

        <p className="text-[#27272A] text-lg sm:text-xl lg:text-2xl max-w-3xl font-medium leading-relaxed">
          Six foundational neural capabilities radiating organically from CLARA’s intelligence core.
          Click any feature card to view its full brief.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE MIND MAP: CLARA CENTER + 6 EXPANDABLE CAPABILITY CARDS        */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto my-auto flex items-center justify-center min-h-[500px] sm:min-h-[560px] lg:min-h-[620px]">
        
        {/* SVG NEURAL CONNECTIONS LAYER */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="claraCorePulseGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#C084FC" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Pulse Waves */}
          <circle cx="500" cy="300" r="140" fill="url(#claraCorePulseGrad)" className="animate-pulse opacity-60" />
          <circle cx="500" cy="300" r="180" fill="none" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="4 8" opacity="0.45" />

          {/* Constant Purple Neural Link Curves */}
          {MIND_MAP_CAPABILITIES.map((node, index) => {
            const coords = [
              { id: 'understand', x: 500, y: 70, cx1: 500, cy1: 180, cx2: 500, cy2: 120 },
              { id: 'know', x: 170, y: 160, cx1: 360, cy1: 250, cx2: 240, cy2: 190 },
              { id: 'speak', x: 830, y: 160, cx1: 640, cy1: 250, cx2: 760, cy2: 190 },
              { id: 'schedule', x: 180, y: 440, cx1: 350, cy1: 350, cx2: 240, cy2: 410 },
              { id: 'connect', x: 820, y: 440, cx1: 650, cy1: 350, cx2: 760, cy2: 410 },
              { id: 'communicate', x: 500, y: 530, cx1: 500, cy1: 420, cx2: 500, cy2: 480 },
            ][index];

            const isExpanded = expandedNodeId === node.id;

            return (
              <g key={node.id}>
                <path
                  d={`M 500 300 C ${coords.cx1} ${coords.cy1}, ${coords.cx2} ${coords.cy2}, ${coords.x} ${coords.y}`}
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth={isExpanded ? '4' : '2'}
                  strokeDasharray={isExpanded ? 'none' : '4 6'}
                  opacity={isExpanded ? 0.95 : 0.4}
                  className="transition-all duration-300"
                />
                <circle
                  cx={500 + (coords.x - 500) * 0.3}
                  cy={300 + (coords.y - 300) * 0.3}
                  r={isExpanded ? 5 : 3}
                  fill="#7C3AED"
                />
              </g>
            );
          })}
        </svg>

        {/* CENTER: CLARA ROBOTIC FACE */}
        <div className="relative z-10 w-[210px] sm:w-[250px] lg:w-[280px] aspect-square flex items-center justify-center pointer-events-auto">
          <div className="w-full h-full scale-[0.84] sm:scale-[0.94] lg:scale-100 flex items-center justify-center">
            <ClaraRoboticFace mouseOffset={{ x: 0, y: 0 }} />
          </div>
        </div>

        {/* 6 EXPANDABLE CAPABILITY NODES (LARGE TEXT & ACCESSIBLE) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Node 1: UNDERSTAND (Top) */}
          <div className="absolute top-[0%] left-1/2 -translate-x-1/2 pointer-events-auto">
            <ExpandableCapabilityCard
              node={MIND_MAP_CAPABILITIES[0]}
              isExpanded={expandedNodeId === 'understand'}
              onToggle={() => toggleNodeExpand('understand')}
            />
          </div>

          {/* Node 2: KNOW (Top-Left) */}
          <div className="absolute top-[15%] left-[2%] sm:left-[4%] lg:left-[6%] pointer-events-auto">
            <ExpandableCapabilityCard
              node={MIND_MAP_CAPABILITIES[1]}
              isExpanded={expandedNodeId === 'know'}
              onToggle={() => toggleNodeExpand('know')}
            />
          </div>

          {/* Node 3: SPEAK (Top-Right) */}
          <div className="absolute top-[15%] right-[2%] sm:right-[4%] lg:right-[6%] pointer-events-auto">
            <ExpandableCapabilityCard
              node={MIND_MAP_CAPABILITIES[2]}
              isExpanded={expandedNodeId === 'speak'}
              onToggle={() => toggleNodeExpand('speak')}
            />
          </div>

          {/* Node 4: SCHEDULE (Bottom-Left) */}
          <div className="absolute bottom-[13%] left-[2%] sm:left-[4%] lg:left-[6%] pointer-events-auto">
            <ExpandableCapabilityCard
              node={MIND_MAP_CAPABILITIES[3]}
              isExpanded={expandedNodeId === 'schedule'}
              onToggle={() => toggleNodeExpand('schedule')}
            />
          </div>

          {/* Node 5: CONNECT (Bottom-Right) */}
          <div className="absolute bottom-[13%] right-[2%] sm:right-[4%] lg:right-[6%] pointer-events-auto">
            <ExpandableCapabilityCard
              node={MIND_MAP_CAPABILITIES[4]}
              isExpanded={expandedNodeId === 'connect'}
              onToggle={() => toggleNodeExpand('connect')}
            />
          </div>

          {/* Node 6: COMMUNICATE (Bottom) */}
          <div className="absolute bottom-[0%] left-1/2 -translate-x-1/2 pointer-events-auto">
            <ExpandableCapabilityCard
              node={MIND_MAP_CAPABILITIES[5]}
              isExpanded={expandedNodeId === 'communicate'}
              onToggle={() => toggleNodeExpand('communicate')}
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between pt-2 px-2">
        <div className="text-sm sm:text-base font-mono text-[#52525B] font-bold flex items-center gap-2">
          <span className="text-[#7C3AED] text-lg">●</span>
          <span>Click any card to expand full capability brief</span>
        </div>

        <button
          onClick={onNextCard}
          className="flex items-center gap-2 text-sm sm:text-base font-mono font-black text-[#7C3AED] hover:text-[#6D28D9] hover:underline cursor-pointer transition-all"
        >
          <span>NEXT: THE CREATORS</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

interface ExpandableCardProps {
  node: MindMapNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const ExpandableCapabilityCard: React.FC<ExpandableCardProps> = ({
  node,
  isExpanded,
  onToggle,
}) => {
  const Icon = node.icon;

  return (
    <div
      onClick={onToggle}
      onMouseEnter={playHoverChime}
      className={`relative cursor-pointer rounded-2xl transition-all duration-300 ease-out overflow-hidden transform hover:-translate-y-1 active:scale-[0.98] ${
        isExpanded
          ? 'bg-white shadow-2xl shadow-purple-900/20 border-2 border-[#7C3AED] ring-4 ring-[#7C3AED]/20 z-40'
          : 'bg-white/95 hover:bg-white backdrop-blur-sm shadow-lg border-2 border-[#E9D5FF] hover:border-[#7C3AED]'
      }`}
      style={{
        width: isExpanded ? '370px' : '285px',
        maxWidth: '92vw',
      }}
    >
      {/* Main Header / Compact Row */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3.5">
        <div className="flex items-center gap-3.5">
          {/* Constant Purple Icon Container */}
          <div className="w-12 h-12 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/35">
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">{node.emoji}</span>
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-[#09090B]">
                {node.name}
              </span>
            </div>
            {!isExpanded && (
              <span className="text-xs sm:text-[13.5px] font-medium text-[#52525B] line-clamp-1 max-w-[170px]">
                {node.tagline}
              </span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Indicator Chevron */}
        <div
          className={`p-1.5 rounded-full text-[#7C3AED] transition-transform duration-300 ${
            isExpanded ? 'rotate-180 bg-[#F5F3FF]' : 'rotate-0'
          }`}
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* Hidden Brief & Detailed Description Expanded on Click */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="px-4 pb-4 pt-1.5 text-left border-t border-[#F5F3FF]"
          >
            {/* Tagline */}
            <p className="text-sm sm:text-[15px] font-bold text-[#18181B] leading-snug mb-2.5">
              {node.tagline}
            </p>

            {/* Hidden Brief Details */}
            <p className="text-[13.5px] sm:text-[15px] text-[#27272A] font-medium leading-relaxed mb-3.5">
              {node.detail}
            </p>

            {/* Badge Highlight Metric */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-xs sm:text-[13px] font-mono font-black text-[#7C3AED]">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>{node.highlightStat}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
