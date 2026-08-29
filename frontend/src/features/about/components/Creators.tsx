import React from 'react';
import { motion } from 'motion/react';
import { CREATORS } from '../data/aboutData';
import { User, Code2, Sparkles, Terminal, Cpu, Lightbulb, Compass, Github, Linkedin, Mail } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

export const Creators: React.FC = () => {
  return (
    <section
      id="creators"
      className="relative min-h-screen flex flex-col justify-center py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAF9FF] via-[#F5F3FC] to-[#EFEDFA] overflow-hidden"
    >
      {/* Ambient Lighting */}
      <div className="absolute top-1/3 left-1/4 w-[700px] h-[500px] bg-[#D8CDF7]/30 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-mono text-[#8066D9] mb-3"
          >
            <Code2 className="w-3.5 h-3.5 text-[#8066D9]" />
            <span>BEHIND CLARA — ARCHITECTS & RESEARCHERS</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-[#24213A] tracking-tight"
          >
            The Humans Behind the Intelligence
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-base sm:text-lg text-[#65627A] font-light max-w-xl mx-auto"
          >
            Engineered from first principles to bridge institutional knowledge, conversational AI, and genuine human connection.
          </motion.p>
        </div>

        {/* Creator Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {CREATORS.map((profile, idx) => (
            <motion.div
              key={profile.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.2 }}
              onMouseEnter={playHoverChime}
              className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/90 shadow-xl space-y-5 hover:shadow-2xl transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7254C7] via-[#8066D9] to-[#B9E8FF] p-0.5 shadow-md shadow-purple-500/15 shrink-0">
                  <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center text-[#6247B5]">
                    <User className="w-8 h-8 text-[#8066D9]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#24213A]">
                    {profile.name}
                  </h3>
                  <p className="font-mono text-xs text-[#8066D9] font-semibold">
                    {profile.role}
                  </p>
                  <p className="text-xs text-[#9692AA]">
                    {profile.affiliation}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs sm:text-sm text-[#65627A] font-light leading-relaxed">
                {profile.bio}
              </p>

              {/* Philosophy Quote */}
              <div className="p-4 rounded-2xl bg-[#F5F3FC] border border-[#D8CDF7] text-xs text-[#49358F] italic leading-relaxed">
                “{profile.quote}”
              </div>

              {/* Specialization Areas */}
              <div className="space-y-1.5 pt-1">
                <span className="font-mono text-[10px] uppercase font-bold text-[#9692AA] tracking-wider block">
                  Core Specializations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.specialization.map((spec, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2.5 py-1 rounded-full bg-white border border-[#E7E0FA] text-[11px] font-mono text-[#24213A]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
