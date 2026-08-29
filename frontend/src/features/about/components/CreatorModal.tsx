import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreatorMember } from '../data/aboutData';
import { Github, Linkedin, Mail, X, Sparkles } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

interface CreatorModalProps {
  creator: CreatorMember | null;
  onClose: () => void;
}

export const CreatorModal: React.FC<CreatorModalProps> = ({ creator, onClose }) => {
  return (
    <AnimatePresence>
      {creator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none" role="dialog" aria-modal="true" aria-labelledby="creator-profile-name">
          {/* 1. Frosted Glass Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-[#09090B]/50 backdrop-blur-lg cursor-pointer"
          />

          {/* 2. macOS Window Style Center-Expanded Card (Big & Readable) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.84, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 12 }}
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 28,
              mass: 0.8,
            }}
            className="relative z-10 w-full max-w-[820px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-3xl p-7 sm:p-9 shadow-2xl shadow-purple-950/30 border-2 border-[#DDD6FE] flex flex-col pointer-events-auto"
          >
            {/* Top macOS-style control bar with Red/Yellow/Green Traffic Lights */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#F4F4F5]">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-4 h-4 rounded-full bg-[#EF4444] hover:opacity-80 transition-opacity cursor-pointer inline-block"
                  title="Close"
                  aria-label="Close creator profile"
                />
                <span className="w-4 h-4 rounded-full bg-[#F59E0B] inline-block opacity-80" />
                <span className="w-4 h-4 rounded-full bg-[#10B981] inline-block opacity-80" />
                <span className="font-mono text-xs sm:text-sm font-bold text-[#71717A] ml-2.5 uppercase tracking-wider">
                  CREATOR PROFILE
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                onMouseEnter={playHoverChime}
                className="p-2 rounded-full text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                aria-label="Close creator profile"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Creator Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] p-1 shadow-lg flex items-center justify-center shrink-0">
                <img
                  src={creator.image}
                  alt={`${creator.name} portrait`}
                  className="w-full h-full rounded-3xl object-cover"
                />
              </div>

              <div className="flex flex-col text-center sm:text-left">
                <h3 id="creator-profile-name" className="font-display font-black text-2xl sm:text-3xl text-[#09090B] tracking-tight">
                  {creator.name}
                </h3>
                <p className="font-mono text-base sm:text-lg font-bold text-[#7C3AED] mt-1">
                  {creator.role}
                </p>
              </div>
            </div>

            {/* Bio Narrative */}
            <div className="text-left mb-6">
              <h4 className="text-xs sm:text-sm font-mono font-bold text-[#71717A] uppercase tracking-wider mb-2">
                About & Contributions
              </h4>
              <p className="text-base sm:text-lg text-[#27272A] font-medium leading-relaxed">
                {creator.bio}
              </p>
            </div>

            {/* Specializations Tags */}
            <div className="text-left mb-7">
              <h4 className="text-xs sm:text-sm font-mono font-bold text-[#71717A] uppercase tracking-wider mb-2.5">
                Specializations
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {creator.specialization.map((spec) => (
                  <span
                    key={spec}
                    className="px-4 py-1.5 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-sm sm:text-base font-semibold text-[#6D28D9] flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                    <span>{spec}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Social Links Row & Action Button */}
            <div className="flex items-center justify-between pt-5 border-t border-[#F4F4F5] mt-auto">
              <div className="flex items-center gap-3.5">
                {creator.github && (
                  <a
                    href={creator.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] border border-[#E4E4E7] transition-all"
                    title="GitHub"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}

                {creator.linkedin && (
                  <a
                    href={creator.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl text-[#71717A] hover:text-[#0A66C2] hover:bg-[#F4F4F5] border border-[#E4E4E7] transition-all"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}

                {creator.email && (
                  <a
                    href={creator.email}
                    className="p-2.5 rounded-xl text-[#71717A] hover:text-[#7C3AED] hover:bg-[#F4F4F5] border border-[#E4E4E7] transition-all"
                    title="Email Contact"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-7 py-3 rounded-full text-sm sm:text-base font-black text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
