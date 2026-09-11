import React from 'react';
import { PROJECT_GUIDE } from '../data/aboutData';
import { Sparkles, GraduationCap, Building2, ArrowRight } from 'lucide-react';
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

            {/* Description */}
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
