import React from 'react';
import { motion } from 'motion/react';
import { CREATORS_FIVE, CreatorMember } from '../data/aboutData';
import { ArrowRight } from 'lucide-react';
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
  const displayName = (name: string) =>
    name
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part) => (part.length <= 2 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`))
      .join(' ');

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 xl:gap-7 items-stretch">
          {CREATORS_FIVE.map((creator, idx) => {
            return (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                onMouseEnter={playHoverChime}
                whileHover={{ y: -6 }}
                className="relative aspect-[0.64] rounded-[22px] border border-[#E9D5FF] hover:border-[#A78BFA] shadow-[0_8px_22px_rgba(76,29,149,0.12)] hover:shadow-[0_16px_34px_rgba(76,29,149,0.2)] transition-all duration-300 group overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    playNodeSelectChime();
                    onSelectCreator(creator);
                  }}
                  className="absolute inset-0 w-full h-full text-left cursor-pointer focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#A78BFA]"
                  aria-label={`Open profile for ${creator.name}`}
                >
                  <img
                    src={creator.image}
                    alt={`${creator.name} portrait`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-3 bottom-4 px-2 text-center text-white">
                    <h3 className="font-display font-black text-lg sm:text-xl xl:text-[21px] leading-tight mb-2 whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {displayName(creator.name)}
                    </h3>
                    <p className="font-mono text-xs sm:text-sm font-bold text-white leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {creator.role}
                    </p>
                  </div>
                </button>
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
