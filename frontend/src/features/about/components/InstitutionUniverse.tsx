import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ECOSYSTEM_ROLES } from '../data/aboutData';
import { EcosystemRole } from '../types';
import { 
  GraduationCap, BookOpenCheck, UserCheck, Building2, 
  Headphones, Sparkles, ArrowRight, Network, Compass 
} from 'lucide-react';
import { ClaraCoreCanvas } from './ClaraCoreCanvas';
import { playHoverChime, playStepChime } from '../utils/audio';

export const InstitutionUniverse: React.FC = () => {
  const [activeRoleId, setActiveRoleId] = useState<string>('student');

  const iconMap: Record<string, React.ElementType> = {
    GraduationCap,
    BookOpenCheck,
    UserCheck,
    Building2,
    Headphones,
  };

  const currentRole = ECOSYSTEM_ROLES.find((r) => r.id === activeRoleId) || ECOSYSTEM_ROLES[0];

  const handleSelectRole = (id: string, index: number) => {
    setActiveRoleId(id);
    playStepChime(index + 1);
  };

  return (
    <section
      id="ecosystem"
      className="relative min-h-screen flex flex-col justify-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EFEDFA] via-[#F5F3FC] to-[#FAF9FF] overflow-hidden"
    >
      {/* Ambient Glow */}
      <div className="absolute top-1/2 right-1/4 w-[750px] h-[550px] bg-[#D8CDF7]/35 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-3"
          >
            <Network className="w-3.5 h-3.5 text-[#8066D9]" />
            <span>LIVING INSTITUTIONAL CONSTELLATION</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-[#24213A] tracking-tight"
          >
            CLARA Inside an Institution
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-[#65627A] font-light max-w-xl mx-auto"
          >
            An interconnected nervous system supporting every role from undergraduate to dean.
          </motion.p>
        </div>

        {/* Stakeholder Constellation Selector */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          {ECOSYSTEM_ROLES.map((role, idx) => {
            const Icon = iconMap[role.icon] || Sparkles;
            const isActive = activeRoleId === role.id;

            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id, idx)}
                onMouseEnter={playHoverChime}
                className={`px-4 py-2.5 rounded-full text-xs font-display font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7254C7] to-[#8066D9] text-white shadow-md shadow-purple-500/20 scale-105'
                    : 'glass-panel text-[#65627A] hover:text-[#24213A] hover:bg-white border-[#E7E0FA]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8066D9]'}`} />
                <span>{role.roleName}</span>
              </button>
            );
          })}
        </div>

        {/* Constellation Details Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center glass-panel p-6 sm:p-10 rounded-3xl border border-white/90 shadow-xl max-w-5xl mx-auto">
          
          {/* Left: Core Nexus */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-white/60 to-[#F5F3FC]/40 border border-white/80 text-center">
            <ClaraCoreCanvas size={200} mode="radiant" />
            <span className="font-mono text-[10px] text-[#8066D9] font-bold uppercase tracking-widest mt-2">
              ECOSYSTEM ROLE: {currentRole.roleName.toUpperCase()}
            </span>
            <p className="text-xs text-[#65627A] font-medium mt-1 max-w-xs">
              {currentRole.claraRole}
            </p>
          </div>

          {/* Right: Role Journey & Experience */}
          <div className="lg:col-span-7 space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRole.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-2xl font-bold font-display text-[#24213A]">
                    {currentRole.roleName} — {currentRole.tagline}
                  </h3>
                  <p className="mt-1 text-sm text-[#65627A] font-light leading-relaxed">
                    {currentRole.description}
                  </p>
                </div>

                {/* Journey Case */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-[#E7E0FA] space-y-2.5 shadow-sm text-xs sm:text-sm">
                  <div>
                    <span className="font-mono text-[10px] text-[#9692AA] uppercase font-bold tracking-wider block">
                      Common Challenge:
                    </span>
                    <p className="text-[#24213A] font-medium italic mt-0.5">
                      “{currentRole.userJourney.start}”
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F5F3FC]">
                    <span className="font-mono text-[10px] text-[#8066D9] uppercase font-bold tracking-wider block">
                      CLARA Resolution:
                    </span>
                    <p className="text-[#49358F] font-medium mt-0.5">
                      {currentRole.userJourney.claraAction}
                    </p>
                  </div>
                </div>

                {/* Connected Entities */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[#9692AA]">Connected Entities:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRole.connectedEntities.map((ent, eIdx) => (
                      <span
                        key={eIdx}
                        className="px-2.5 py-0.5 rounded-full bg-[#E7E0FA] text-[#49358F] text-[11px] font-mono"
                      >
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
