import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ECOSYSTEM_ROLES } from '../data/aboutData';
import { EcosystemRole } from '../types';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { 
  GraduationCap, BookOpenCheck, UserCheck, Building2, 
  Headphones, Users, Network, ArrowRight, Sparkles, CheckCircle2
} from 'lucide-react';
import { playHoverChime, playTone } from '../utils/audio';

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  BookOpenCheck,
  UserCheck,
  Building2,
  Headphones,
  Users,
};

export const InstitutionEcosystem: React.FC = () => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(ECOSYSTEM_ROLES[0].id);

  const activeRole = ECOSYSTEM_ROLES.find((r) => r.id === selectedRoleId) || ECOSYSTEM_ROLES[0];

  const handleSelectRole = (role: EcosystemRole) => {
    setSelectedRoleId(role.id);
    playTone(493.88, 'triangle', 0.12, 0.03);
  };

  return (
    <section
      id="ecosystem"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[#08090e] border-t border-gray-900 overflow-hidden"
    >
      {/* Background Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-950/15 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-4"
          >
            <Network className="w-3.5 h-3.5 text-red-400" />
            <span>INSTITUTIONAL STAKEHOLDER GRAPH</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight"
          >
            CLARA Inside an Institution
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-gray-400 font-light"
          >
            See how CLARA harmonizes communication across every stakeholder in the academic campus.
          </motion.p>
        </div>

        {/* Stakeholder Role Selector Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {ECOSYSTEM_ROLES.map((role) => {
            const Icon = ICON_MAP[role.icon] || Users;
            const isSelected = selectedRoleId === role.id;

            return (
              <button
                key={role.id}
                id={`ecosystem-role-btn-${role.id}`}
                onClick={() => handleSelectRole(role)}
                onMouseEnter={playHoverChime}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-semibold font-display transition-all ${
                  isSelected
                    ? 'bg-red-950 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-105'
                    : 'bg-[#11131e] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <div className={`p-1 rounded-lg ${isSelected ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span>{role.roleName}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Hub Visualizer + Journey Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Interactive Campus Hub Nexus Graphic (6 cols) */}
          <div className="lg:col-span-6 relative h-[440px] rounded-3xl bg-[#0c0e18]/90 border border-gray-800/90 shadow-2xl overflow-hidden flex items-center justify-center p-6">
            
            {/* SVG Connecting Flow Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="activeStream" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <circle cx="50%" cy="50%" r="140" stroke="rgba(239,68,68,0.15)" strokeWidth="1" fill="none" />
              <circle cx="50%" cy="50%" r="180" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 6" fill="none" />
            </svg>

            {/* Central CLARA Nucleus */}
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
              <ClaraCoreCanvas size={220} mode="radiant" intensity={1.2} />
              <span className="font-mono text-[10px] text-red-300 font-bold uppercase tracking-widest bg-red-950/90 px-3 py-1 rounded-full border border-red-500/40 shadow-lg -mt-3">
                CENTRAL ROUTING NEXUS
              </span>
            </div>

            {/* Orbiting Role Satellites */}
            {ECOSYSTEM_ROLES.map((role, idx) => {
              const Icon = ICON_MAP[role.icon] || Users;
              const isSelected = selectedRoleId === role.id;
              const angleRad = (idx / ECOSYSTEM_ROLES.length) * 2 * Math.PI - Math.PI / 2;
              const radius = 38;
              const xPos = 50 + radius * Math.cos(angleRad);
              const yPos = 50 + radius * Math.sin(angleRad);

              return (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  onMouseEnter={playHoverChime}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-red-950 border-red-500 text-white shadow-[0_0_20px_#ef4444] scale-110'
                      : 'bg-[#11131e]/90 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold hidden sm:inline-block font-display">
                    {role.roleName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Journey & Workflow Case Study (6 cols) */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="p-7 sm:p-9 rounded-3xl bg-[#0e101b] border border-red-500/25 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300">
                      {React.createElement(ICON_MAP[activeRole.icon] || Users, { className: 'w-5 h-5' })}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white font-display">
                        {activeRole.roleName}
                      </h3>
                      <p className="font-mono text-xs text-red-400">{activeRole.claraRole}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed">
                  {activeRole.description}
                </p>

                {/* Simulated Real-world Workflow */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
                    Real-World Interaction Flow:
                  </span>

                  <div className="p-3 rounded-xl bg-[#141624] border border-gray-800 text-xs space-y-1">
                    <span className="font-mono text-red-400 font-semibold">1. Trigger:</span>
                    <p className="text-gray-300 italic">"{activeRole.userJourney.start}"</p>
                  </div>

                  <div className="p-3 rounded-xl bg-red-950/25 border border-red-500/20 text-xs space-y-1">
                    <span className="font-mono text-emerald-400 font-semibold">2. CLARA Processing & Dispatch:</span>
                    <p className="text-gray-200">{activeRole.userJourney.claraAction}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141624] border border-gray-800 text-xs space-y-1">
                    <span className="font-mono text-gray-300 font-semibold">3. Verified Institutional Outcome:</span>
                    <p className="text-gray-400">{activeRole.userJourney.outcome}</p>
                  </div>
                </div>

                {/* Connected Roles Matrix */}
                <div className="pt-2 flex items-center justify-between border-t border-gray-800 text-xs font-mono">
                  <span className="text-gray-400">Connected Campus Entities:</span>
                  <div className="flex gap-1.5">
                    {activeRole.connectedEntities.map((ent, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">
                        {ent}
                      </span>
                    ))}
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
