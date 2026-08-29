import React from 'react';
import { motion } from 'motion/react';
import { CREATORS } from '../data/aboutData';
import { Creator } from '../types';
import { Github, Linkedin, Globe, Sparkles, Code2, Heart, Award, ArrowUpRight } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

export const CreatorsSection: React.FC = () => {
  return (
    <section
      id="creators"
      className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[#06070a] border-t border-gray-900 overflow-hidden"
    >
      {/* Background Lighting */}
      <div className="absolute top-1/2 right-1/3 w-[700px] h-[500px] bg-red-950/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>THE HUMANS BEHIND THE INTELLIGENCE</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight"
          >
            Behind CLARA
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-lg sm:text-xl text-gray-300 font-light"
          >
            Built by people who believe technology should feel <span className="text-red-400 font-medium">human</span>.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            CLARA was conceived and developed by a team passionate about artificial intelligence,
            software engineering, data science, and human-centered technology.
          </motion.p>
        </div>

        {/* Creator Showcase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {CREATORS.map((creator, idx) => (
            <motion.div
              key={creator.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * idx }}
              onMouseEnter={playHoverChime}
              className="p-8 sm:p-9 rounded-3xl bg-[#0c0e18]/90 border border-red-500/25 shadow-2xl relative overflow-hidden group hover:border-red-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-6">
                
                {/* Profile Top Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Futuristic High-tech Avatar Badge */}
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 via-rose-700 to-red-950 p-0.5 shadow-lg shadow-red-950/60">
                      <div className="w-full h-full rounded-2xl bg-[#0d0f19] flex items-center justify-center font-display font-black text-xl text-white">
                        {creator.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0c0e18]" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white font-display group-hover:text-red-300 transition-colors">
                        {creator.name}
                      </h3>
                      <p className="font-mono text-xs text-red-400 font-medium">{creator.role}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{creator.affiliation}</p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-300 leading-relaxed">
                  {creator.bio}
                </p>

                {/* Technical Specialization Tags */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block mb-2">
                    Core Technical Contributions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.specialization.map((spec, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg bg-[#141726] border border-gray-800 text-xs font-mono text-gray-300"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Creator Quote */}
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/15 text-xs text-gray-300 italic">
                  "{creator.quote}"
                </div>

              </div>

              {/* Social / Portfolio Links */}
              <div className="pt-6 mt-6 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">Connect & Architecture:</span>
                <div className="flex items-center gap-2">
                  {creator.githubUrl && (
                    <a
                      href={creator.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-[#121422] border border-gray-800 text-gray-300 hover:text-white hover:border-red-500/50 transition-colors"
                      title="GitHub"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {creator.linkedinUrl && (
                    <a
                      href={creator.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-[#121422] border border-gray-800 text-gray-300 hover:text-white hover:border-red-500/50 transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {creator.portfolioUrl && (
                    <a
                      href={creator.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-[#121422] border border-gray-800 text-gray-300 hover:text-white hover:border-red-500/50 transition-colors"
                      title="Portfolio"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
