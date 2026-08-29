import React from 'react';
import { motion } from 'motion/react';
import { CREATORS_FIVE, CreatorMember } from '../data/aboutData';
import { Github, Linkedin, Mail, ArrowRight } from 'lucide-react';
import { playHoverChime, playNodeSelectChime } from '../utils/audio';

interface Card03Props {
  onPrevCard?: () => void;
  onNextCard?: () => void;
  onSelectCreator: (creator: CreatorMember) => void;
}

export const Card03Creators: React.FC<Card03Props> = ({
  onPrevCard,
  onNextCard,
  onSelectCreator,
}) => {
  return (
    <section
      id="creators-card"
      className="relative min-h-screen w-full flex flex-col justify-between pt-24 sm:pt-28 pb-8 px-4 sm:px-8 lg:px-12 bg-gradient-to-b from-white via-[#FAF9FF] to-[#F5F2FE] overflow-hidden select-none"
    >
      {/* Ambient Atmospheric Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-br from-[#DDD6FE]/20 via-[#EDE9FE]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header - Scaled for 1m Visibility */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center pt-2 sm:pt-4">
        <h2
          style={{
            fontSize: 'clamp(44px, 5.2vw, 76px)',
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
          }}
          className="font-display font-black text-[#09090B] mb-3"
        >
          THE PEOPLE BEHIND{' '}
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
          </span>
        </h2>

        <p className="text-[#27272A] text-lg sm:text-xl lg:text-2xl max-w-2xl font-medium leading-relaxed">
          Engineered from first principles. Click any creator card to view their profile,
          architecture contributions, and role.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 5 COMPACT PROFILE CARDS IN A SINGLE HORIZONTAL LINE ON DESKTOP            */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-[1580px] mx-auto my-auto py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 xl:gap-6 items-stretch">
          {CREATORS_FIVE.map((creator, idx) => {
            return (
              <motion.div
                key={creator.id}
                onClick={() => {
                  playNodeSelectChime();
                  onSelectCreator(creator);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                onMouseEnter={playHoverChime}
                whileHover={{ y: -6 }}
                className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border-2 border-[#E9D5FF] hover:border-[#7C3AED] shadow-md hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 flex flex-col items-center text-center justify-between group cursor-pointer"
              >
                {/* 1. Portrait Container */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] p-1 shadow-lg group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                    <div className="w-full h-full rounded-3xl bg-[#FAF9FF] flex flex-col items-center justify-center overflow-hidden relative">
                      <span className="font-display font-black text-3xl sm:text-4xl text-[#7C3AED]">
                        {creator.name
                          .split(' ')
                          .filter((w) => w.length > 0)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span className="absolute bottom-1.5 text-[10px] font-mono uppercase tracking-widest text-[#71717A] font-bold">
                        DEV 0{idx + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Name - Big & Bold */}
                <h3 className="font-display font-black text-lg sm:text-xl xl:text-2xl text-[#09090B] group-hover:text-[#7C3AED] transition-colors leading-tight mb-2">
                  {creator.name}
                </h3>

                {/* 3. Role - High contrast */}
                <p className="font-mono text-sm sm:text-base font-bold text-[#6D28D9] mb-5 leading-snug px-1">
                  {creator.role}
                </p>

                {/* 4. Social/Link Icon Row */}
                <div className="flex items-center justify-center gap-3.5 pt-3.5 border-t border-[#F4F4F5] w-full mt-auto">
                  {creator.github && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(creator.github, '_blank');
                      }}
                      className="p-2 rounded-xl text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
                      title="GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </span>
                  )}

                  {creator.linkedin && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(creator.linkedin, '_blank');
                      }}
                      className="p-2 rounded-xl text-[#71717A] hover:text-[#0A66C2] hover:bg-[#F4F4F5] transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </span>
                  )}

                  {creator.email && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = creator.email;
                      }}
                      className="p-2 rounded-xl text-[#71717A] hover:text-[#7C3AED] hover:bg-[#F4F4F5] transition-colors"
                      title="Email Contact"
                    >
                      <Mail className="w-5 h-5" />
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Bar for Card 03 */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between pt-2">
        <button
          onClick={onPrevCard}
          className="text-sm sm:text-base font-mono font-bold text-[#52525B] hover:text-[#09090B] transition-colors cursor-pointer"
        >
          ← PREV: WHAT CLARA CAN DO
        </button>

        <button
          onClick={onNextCard}
          className="flex items-center gap-2 text-sm sm:text-base font-mono font-black text-[#7C3AED] hover:text-[#6D28D9] hover:underline cursor-pointer transition-all"
        >
          <span>NEXT: OUR GUIDE</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
