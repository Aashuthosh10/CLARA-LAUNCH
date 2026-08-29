import React from 'react';
import { PROJECT_GUIDE } from '../data/aboutData';
import { Sparkles, GraduationCap, Building2, Quote, ArrowRight } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

interface Card04Props {
  onPrevCard?: () => void;
  onGoToOverview?: () => void;
  onOpenLiveDemo?: () => void;
}

export const Card04OurGuide: React.FC<Card04Props> = ({
  onPrevCard,
  onGoToOverview,
  onOpenLiveDemo,
}) => {
  return (
    <section
      id="guide-card"
      className="relative min-h-screen w-full flex flex-col justify-between pt-24 sm:pt-28 pb-8 px-4 sm:px-8 lg:px-14 bg-gradient-to-b from-white via-[#FAF8FE] to-[#F3EEFE] overflow-hidden select-none"
    >
      {/* 1. Refined Ambient Lighting and Atmospheric Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-gradient-to-tr from-[#7C3AED]/10 via-[#DDD6FE]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* 2. Top Header - Scaled for 1m Visibility */}
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center pt-2 sm:pt-4">
        <h2
          style={{
            fontSize: 'clamp(44px, 5.2vw, 76px)',
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
          }}
          className="font-display font-black text-[#09090B] mb-3"
        >
          OUR{' '}
          <span
            className="inline-block"
            style={{
              background: 'linear-gradient(180deg, #A855F7 0%, #8B5CF6 32%, #7C3AED 68%, #581C87 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 3px 12px rgba(124,58,237,0.3))',
            }}
          >
            GUIDE
          </span>
        </h2>

        <p className="text-[#27272A] text-lg sm:text-xl lg:text-2xl max-w-xl font-medium leading-relaxed">
          The person who helped shape the journey.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. SINGLE-PERSON PRESTIGIOUS FEATURE CARD (LARGE & CLEAR)                 */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-5xl mx-auto my-auto py-4">
        <div
          onMouseEnter={playHoverChime}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-7 sm:p-11 lg:p-14 border-2 border-[#DDD6FE] shadow-2xl shadow-purple-600/15 flex flex-col md:flex-row items-center gap-8 lg:gap-14"
        >
          {/* Large Dignified Portrait */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-3xl bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] p-1 shadow-2xl shadow-purple-500/30 flex items-center justify-center">
              <div className="w-full h-full rounded-3xl bg-[#FAF9FF] flex flex-col items-center justify-center overflow-hidden relative">
                <GraduationCap className="w-20 h-20 sm:w-24 sm:h-24 text-[#7C3AED] mb-1" />
                <span className="font-display font-black text-sm sm:text-base text-[#49358F]">
                  FACULTY MENTOR
                </span>
                <span className="absolute bottom-2 text-xs font-mono text-[#71717A] uppercase tracking-widest font-bold">
                  PROJECT GUIDE
                </span>
              </div>
            </div>

            {/* Verification Shield Pill */}
            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs sm:text-sm font-mono font-black tracking-wider uppercase shadow-lg flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-white" />
              <span>ACADEMIC GUIDE</span>
            </div>
          </div>

          {/* Guide Credentials & Narrative */}
          <div className="flex flex-col text-center md:text-left space-y-4">
            <div>
              <h3 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#09090B] tracking-tight">
                {PROJECT_GUIDE.name}
              </h3>
              <p className="font-mono text-base sm:text-xl font-bold text-[#7C3AED] mt-1.5">
                {PROJECT_GUIDE.role}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-sm sm:text-base font-semibold text-[#52525B] mt-2">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#7C3AED]" />
                  {PROJECT_GUIDE.department}
                </span>
                <span>•</span>
                <span>{PROJECT_GUIDE.institution}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-base sm:text-lg lg:text-xl text-[#27272A] font-medium leading-relaxed">
              {PROJECT_GUIDE.description}
            </p>

            {/* Guide Quote */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] relative text-left">
              <Quote className="w-6 h-6 text-[#7C3AED]/40 absolute top-4 right-4" />
              <p className="text-sm sm:text-base lg:text-lg text-[#49358F] italic font-semibold leading-relaxed">
                “{PROJECT_GUIDE.quote}”
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Controls */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between pt-2">
        <button
          onClick={onPrevCard}
          className="text-sm sm:text-base font-mono font-bold text-[#52525B] hover:text-[#09090B] transition-colors cursor-pointer"
        >
          ← PREV: THE CREATORS
        </button>

        <div className="flex items-center gap-3.5">
          <button
            onClick={onGoToOverview}
            className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-mono font-bold text-[#7C3AED] bg-white border border-[#DDD6FE] hover:bg-[#FAF8FF] transition-all cursor-pointer shadow-xs"
          >
            ↺ BACK TO CARD 01
          </button>

          <button
            onClick={onOpenLiveDemo}
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm sm:text-base font-black text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-lg shadow-purple-500/30 transition-all cursor-pointer"
          >
            <span>ENTER CLARA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
