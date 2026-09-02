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
            className="relative z-10 w-full max-w-[1080px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-gradient-to-br from-white via-[#FAF9FF] to-[#EDE9FE] rounded-[30px] shadow-2xl shadow-purple-950/30 border-2 border-[#DDD6FE] flex flex-col pointer-events-auto"
          >
            <button
              type="button"
              onClick={onClose}
              onMouseEnter={playHoverChime}
              className="absolute top-5 right-5 z-20 p-2 rounded-full text-[#71717A] hover:text-[#09090B] hover:bg-white/70 transition-colors cursor-pointer"
              aria-label="Close creator profile"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-[60%_40%] min-h-[520px]">
              {/* Portrait: blended into the card with a left-edge vignette */}
              <div className="relative order-1 sm:order-2 min-h-[300px] sm:min-h-full overflow-hidden">
                <img
                  src={creator.image}
                  alt={`${creator.name} portrait`}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>

              <div className="relative order-2 sm:order-1 flex flex-col text-left px-7 sm:px-10 py-10 sm:py-12 overflow-hidden">
                <h3 id="creator-profile-name" className="font-display font-black text-4xl sm:text-6xl leading-[0.98] text-[#11102B] tracking-[-0.04em]">
                  {creator.name}
                </h3>
                <div className="mt-5 mb-8 h-1 w-24 bg-gradient-to-r from-[#7C3AED] to-[#C084FC]" />
                <p className="font-mono text-sm sm:text-base font-bold uppercase tracking-[0.18em] text-[#6D28D9]">
                  {creator.role}
                </p>

                {/* Bio Narrative */}
                <div className="text-left mt-9 mb-7 max-w-xl">
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

                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
