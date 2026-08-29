import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, Users, GraduationCap, FileText, CalendarX, 
  HelpCircle, AlertTriangle, RefreshCw, Clock, ArrowRight, Eye
} from 'lucide-react';
import { playHoverChime, playTone } from '../utils/audio';

export const ProblemSection: React.FC = () => {
  const [selectedFrictionId, setSelectedFrictionId] = useState<string | null>('departments');

  const nodes = [
    {
      id: 'departments',
      label: 'Siloed Departments',
      icon: Building2,
      friction: 'Fragmented Office Hours & Portals',
      description: 'Each faculty and administrative wing maintains separate spreadsheets, conflicting notice boards, and unlinked websites.',
      stats: '48% of student inquiries get redirected across 3+ offices.',
      x: 18,
      y: 22,
    },
    {
      id: 'staff',
      label: 'Overwhelmed Staff',
      icon: Users,
      friction: 'Endless Repetitive Queries',
      description: 'Professors and receptionists spend 4+ hours daily answering routine questions like "Where is Hall B?" and "Are office hours today?"',
      stats: '72% of front-desk inquiries are simple factual lookups.',
      x: 75,
      y: 18,
    },
    {
      id: 'students',
      label: 'Lost Students',
      icon: GraduationCap,
      friction: 'Hallway Wandering & Missed Deadlines',
      description: 'Students search outdated portal PDFs, wander across buildings for signatures, or arrive to find faculty in external meetings.',
      stats: 'Average 35 minutes wasted per administrative walk-in.',
      x: 25,
      y: 70,
    },
    {
      id: 'visitors',
      label: 'Confused Visitors',
      icon: HelpCircle,
      friction: 'Unattended Reception Desks',
      description: 'Visiting parents, recruiters, and guest speakers encounter empty lobbies, broken intercoms, or confusing campus maps.',
      stats: 'Dozens of guests wait in lobbies with zero status visibility.',
      x: 80,
      y: 72,
    },
    {
      id: 'documents',
      label: 'Buried Documents',
      icon: FileText,
      friction: 'Unsearchable PDF Graveyards',
      description: 'Critical examination rules, scholarship forms, and syllabus amendments stay trapped in 90-page unindexed PDFs.',
      stats: 'Over 800+ pages of unlinked regulations across 12 subdomains.',
      x: 50,
      y: 12,
    },
    {
      id: 'appointments',
      label: 'Broken Appointments',
      icon: CalendarX,
      friction: 'Double-Booking & Ghosting',
      description: 'Manual email threads for scheduling lead to scheduling conflicts, missed slots, and zero automated reminders.',
      stats: '30% appointment no-show and rescheduling rate.',
      x: 50,
      y: 82,
    },
  ];

  return (
    <section
      id="problem"
      className="relative py-28 px-4 sm:px-6 lg:px-8 bg-[#08090d] border-t border-gray-900 overflow-hidden"
    >
      {/* Subtle Noise and Radial Accent */}
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-xs font-semibold uppercase tracking-widest text-red-400 bg-red-950/50 border border-red-500/20 px-3 py-1 rounded-full"
          >
            The Institutional Paradox
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white mt-4 mb-4 tracking-tight"
          >
            Institutions are full of information.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-300 font-light"
          >
            But information alone <span className="text-red-400 font-medium">isn't enough</span>.
          </motion.p>
        </div>

        {/* The Fragmented Institutional Graph Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Visual Fragmented Node Canvas / Graph (7 cols) */}
          <div className="lg:col-span-7 relative h-[420px] sm:h-[480px] rounded-2xl bg-[#0d0f17] border border-gray-800/80 p-6 shadow-2xl overflow-hidden flex items-center justify-center">
            
            {/* Broken grid backdrop */}
            <div className="absolute inset-0 bg-dot-matrix opacity-30 pointer-events-none" />

            {/* Broken Disconnected Signal Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="brokenLine" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#ef4444" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Broken dashes */}
              <line x1="20%" y1="25%" x2="50%" y2="15%" stroke="url(#brokenLine)" strokeWidth="1.5" strokeDasharray="4 6" />
              <line x1="75%" y1="20%" x2="50%" y2="15%" stroke="url(#brokenLine)" strokeWidth="1.5" strokeDasharray="4 6" />
              <line x1="25%" y1="70%" x2="50%" y2="82%" stroke="url(#brokenLine)" strokeWidth="1.5" strokeDasharray="4 6" />
              <line x1="80%" y1="72%" x2="50%" y2="82%" stroke="url(#brokenLine)" strokeWidth="1.5" strokeDasharray="4 6" />
              <line x1="20%" y1="25%" x2="25%" y2="70%" stroke="url(#brokenLine)" strokeWidth="1" strokeDasharray="2 8" />
              <line x1="75%" y1="20%" x2="80%" y2="72%" stroke="url(#brokenLine)" strokeWidth="1" strokeDasharray="2 8" />
            </svg>

            {/* Central Warning Void */}
            <div className="relative z-10 flex flex-col items-center justify-center p-4 rounded-full bg-red-950/30 border border-red-500/20 text-center w-36 h-36 backdrop-blur-sm animate-pulse">
              <AlertTriangle className="w-7 h-7 text-red-500 mb-1" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-red-300 font-semibold">
                Siloed Friction
              </span>
              <span className="text-[9px] text-gray-400 mt-0.5">High Communication Latency</span>
            </div>

            {/* Floating Interactive Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedFrictionId === node.id;
              const Icon = node.icon;
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedFrictionId(node.id);
                    playTone(380, 'sine', 0.1, 0.03);
                  }}
                  onMouseEnter={playHoverChime}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-300 ${
                    isSelected
                      ? 'bg-red-950/90 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] scale-105 z-20'
                      : 'bg-[#12141e]/90 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200 z-10'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-red-600/30 text-red-300' : 'bg-gray-800/60 text-gray-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap pr-1">{node.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Detailed Friction Inspector Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
            <div className="p-6 sm:p-7 rounded-2xl bg-[#0f111a] border border-red-500/20 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-red-400">
                  <Clock className="w-4 h-4" />
                  <span>PRE-CLARA BOTTLENECK ANALYSIS</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                  Interactive Node Inspector
                </span>
              </div>

              {(() => {
                const activeNode = nodes.find((n) => n.id === selectedFrictionId) || nodes[0];
                const Icon = activeNode.icon;
                return (
                  <motion.div
                    key={activeNode.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white font-display">{activeNode.label}</h4>
                        <p className="text-xs text-red-400 font-mono">{activeNode.friction}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300 leading-relaxed">{activeNode.description}</p>

                    <div className="p-3.5 rounded-xl bg-[#141724] border border-gray-800 flex items-start gap-3 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-200">Institutional Impact:</span>
                        <p className="text-gray-400 mt-0.5">{activeNode.stats}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Action Note */}
              <div className="mt-6 pt-4 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
                <span>Click any node in the graph to inspect</span>
                <span className="text-red-400 flex items-center gap-1 font-mono">
                  CLARA Solution Ahead <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
