import React from 'react';
import { PROJECT_GUIDE } from '../data/aboutData';
import { Sparkles, Building2, ArrowRight } from 'lucide-react';
import { playHoverChime } from '../utils/audio';

interface Card04Props {
  onPrevCard?: () => void;
  onGoToOverview?: () => void;
  onOpenLiveDemo?: () => void;
}

export const Card04OurGuide: React.FC<Card04Props> = ({
  onOpenLiveDemo,
}) => {
  return (
    <section
      id="guide-card"
      className="relative min-h-screen w-full flex flex-col justify-between pt-[11.5rem] sm:pt-[12.5rem] pb-32 px-4 sm:px-8 lg:px-14 bg-gradient-to-b from-white via-[#FAF8FE] to-[#F3EEFE] overflow-hidden select-none"
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
          {/* Portrait — same card treatment as creator profile tiles */}
          <div className="relative shrink-0">
            <div
              className="relative w-44 sm:w-52 lg:w-60 aspect-[0.64] rounded-[22px] border border-[#E9D5FF] shadow-[0_8px_22px_rgba(76,29,149,0.12)] overflow-hidden"
              data-testid="guide-portrait"
            >
              <img
                src={PROJECT_GUIDE.image}
                alt={`${PROJECT_GUIDE.name} portrait`}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />
              <div className="absolute inset-x-3 bottom-4 px-2 text-center text-white">
                <p className="font-mono text-[10px] sm:text-xs font-bold tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  Project Guide
                </p>
              </div>
            </div>

            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs sm:text-sm font-mono font-black tracking-wider uppercase shadow-lg flex items-center gap-2 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-white" />
              <span>ACADEMIC GUIDE</span>
            </div>
          </div>

          {/* Guide Credentials & Narrative */}
          <div className="flex flex-col text-center md:text-left space-y-4">
            <div>
              <h3
                data-testid="guide-name"
                className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#09090B] tracking-tight"
              >
                {PROJECT_GUIDE.name}
              </h3>
              <p
                data-testid="guide-role"
                className="font-mono text-base sm:text-xl font-bold text-[#7C3AED] mt-1.5"
              >
                {PROJECT_GUIDE.role}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-sm sm:text-base font-semibold text-[#52525B] mt-2">
                <span
                  data-testid="guide-department"
                  className="inline-flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-[#7C3AED]" />
                  {PROJECT_GUIDE.department}
                </span>
              </div>
            </div>

            <p
              data-testid="guide-description"
              className="text-base sm:text-lg lg:text-xl text-[#27272A] font-medium leading-relaxed"
            >
              {PROJECT_GUIDE.description}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Prominent ENTER CLARA — same canonical start as SleepScreen */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center pt-6 pb-2">
        <button
          type="button"
          onClick={onOpenLiveDemo}
          onMouseEnter={playHoverChime}
          data-testid="enter-clara"
          aria-label="Enter CLARA"
          className="flex items-center justify-center gap-3.5 min-h-[88px] px-12 sm:px-16 rounded-full text-[24px] sm:text-[28px] font-black text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-2xl shadow-purple-600/45 hover:shadow-purple-600/60 border-2 border-[#6D28D9] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>ENTER CLARA</span>
          <ArrowRight className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>
      </div>
    </section>
  );
};
