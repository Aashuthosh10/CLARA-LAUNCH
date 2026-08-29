import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Users, Calendar, MapPin, Search, Clock, 
  HelpCircle, Sparkles, BookOpen, AlertCircle, Compass 
} from 'lucide-react';
import { playHoverChime, playChime } from '../utils/audio';

export const InformationUniverse: React.FC = () => {
  const [hoveredFragment, setHoveredFragment] = useState<string | null>(null);

  const fragments = [
    { id: 'f1', label: 'Faculty Office Hours', icon: Clock, note: 'Scattered across 14 department pinboards', x: '10%', y: '18%', rot: -3 },
    { id: 'f2', label: 'Exam Regulations §4.2', icon: FileText, note: 'Buried in 120-page PDF handbook', x: '72%', y: '14%', rot: 4 },
    { id: 'f3', label: 'Robotics Lab 3 Relocation', icon: MapPin, note: 'Announced on a physical hallway notice', x: '22%', y: '48%', rot: -2 },
    { id: 'f4', label: 'Dr. Sarah Vance Availability', icon: Users, note: 'Only visible if you knock on Room 412', x: '76%', y: '42%', rot: 3 },
    { id: 'f5', label: 'Gate Pass & Visitor Tokens', icon: Calendar, note: 'Manual paper registration ledger', x: '12%', y: '74%', rot: 2 },
    { id: 'f6', label: 'Scholarship Cutoff Deadline', icon: AlertCircle, note: 'Hidden inside departmental circular #28', x: '68%', y: '72%', rot: -4 },
    { id: 'f7', label: 'Dean Consultation Slot', icon: BookOpen, note: 'Conflicting appointment emails', x: '42%', y: '24%', rot: 1 },
  ];

  return (
    <section
      id="fragments"
      className="relative min-h-screen flex flex-col justify-center items-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#EFEDFA] via-[#F5F3FC] to-[#FAF9FF] overflow-hidden"
    >
      {/* Background Soft Aurora Blobs */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[450px] bg-[#D8CDF7]/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[400px] bg-[#B9E8FF]/35 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-dot-subtle opacity-40 pointer-events-none" />

      {/* Floating Disconnected Fragments (Ambient Universe Layer) */}
      <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none">
        {fragments.map((frag) => {
          const Icon = frag.icon;
          const isHovered = hoveredFragment === frag.id;

          return (
            <motion.div
              key={frag.id}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{
                left: frag.x,
                top: frag.y,
                transform: `rotate(${frag.rot}deg)`,
              }}
              className="absolute hidden md:block pointer-events-auto"
              onMouseEnter={() => {
                setHoveredFragment(frag.id);
                playHoverChime();
              }}
              onMouseLeave={() => setHoveredFragment(null)}
            >
              <div
                className={`p-3.5 sm:p-4 rounded-2xl glass-panel border transition-all duration-300 shadow-sm cursor-default max-w-[220px] ${
                  isHovered
                    ? 'border-[#8066D9] shadow-lg shadow-purple-500/10 scale-105 bg-white/90'
                    : 'border-white/80 hover:border-[#C7B9F2]'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-7 h-7 rounded-xl bg-[#E7E0FA]/80 flex items-center justify-center text-[#6247B5]">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#24213A] truncate font-display">
                    {frag.label}
                  </span>
                </div>
                <p className="text-[11px] text-[#65627A] font-light leading-snug">
                  {frag.note}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Narrative Center Stage */}
      <div className="relative z-10 max-w-3xl mx-auto text-center my-auto space-y-10">
        
        {/* Subtle pill marker */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9]"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#8066D9]" />
          <span className="uppercase tracking-wider text-[11px]">The Institutional Dilemma</span>
        </motion.div>

        {/* First Tension Heading */}
        <div className="space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-3xl sm:text-5xl md:text-6xl font-light text-[#24213A] tracking-tight"
          >
            Information is <span className="font-bold text-[#49358F]">everywhere.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-xl text-[#65627A] font-light leading-relaxed max-w-xl mx-auto"
          >
            Campuses, hospitals, and enterprises hold immense knowledge — yet it remains trapped
            in static PDFs, disconnected portals, and unsearchable directories.
          </motion.p>
        </div>

        {/* Dramatic Cinematic Turning Question */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="p-8 sm:p-10 rounded-3xl glass-panel border border-white/90 shadow-xl max-w-2xl mx-auto space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#B9E8FF]/30 rounded-full blur-2xl pointer-events-none" />

          <p className="font-display text-xl sm:text-2xl font-light text-[#65627A]">
            “But where do you begin?”
          </p>

          <div className="w-12 h-0.5 bg-gradient-to-r from-[#8066D9] to-[#B9E8FF] mx-auto rounded-full" />

          <h3 className="font-display text-2xl sm:text-4xl font-bold text-gradient-violet tracking-tight">
            What if you could simply ask?
          </h3>
        </motion.div>

      </div>
    </section>
  );
};
