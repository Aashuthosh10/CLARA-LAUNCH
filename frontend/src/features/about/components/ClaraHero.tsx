import React, { useEffect, useRef, useState } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import { HeroThreeBackground } from './HeroThreeBackground';
import { ClaraRoboticFace } from './ClaraRoboticFace';
import { CornerTelemetryAnimations } from './CornerTelemetryAnimations';
import {
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { playHoverChime } from '../utils/audio';

interface ClaraHeroProps {
  onOpenLiveDemo: () => void;
  onExploreCapabilities?: () => void;
  showSwipeHint?: boolean;
}

export const ClaraHero: React.FC<ClaraHeroProps> = ({
  onOpenLiveDemo,
  onExploreCapabilities,
  showSwipeHint = true,
}) => {
  const titleLettersRef = useRef<HTMLHeadingElement>(null);
  const rightSideRef = useRef<HTMLDivElement>(null);
  const actionBtnsRef = useRef<HTMLDivElement>(null);
  const [mouseOffset, setMouseOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // --- ANIME.JS: KINETIC ENTRANCE TIMELINE ---
    const timeline = createTimeline({
      defaults: {
        ease: 'outExpo',
        duration: 1000,
      },
    });

    // 1. Right Side Robotic Face Entrance
    if (rightSideRef.current) {
      timeline.add(rightSideRef.current, {
        opacity: [0, 1],
        translateX: [30, 0],
        scale: [0.95, 1],
        duration: 1400,
        ease: 'outCubic',
      });
    }

    // 2. Animate Title Characters Stagger
    if (titleLettersRef.current) {
      const letters = titleLettersRef.current.querySelectorAll('.hero-letter');
      timeline.add(
        letters,
        {
          opacity: [0, 1],
          translateY: [35, 0],
          rotateZ: [-3, 0],
          delay: stagger(35),
          duration: 850,
          ease: 'outBack',
        },
        '-=1200'
      );
    }

    // 3. Subtitle & Narrative Flow
    timeline.add(
      '.hero-text-fade',
      {
        opacity: [0, 1],
        translateY: [18, 0],
        delay: stagger(75),
        duration: 750,
        ease: 'outQuad',
      },
      '-=600'
    );

    // 4. Action Buttons Pop
    if (actionBtnsRef.current) {
      const buttons = actionBtnsRef.current.querySelectorAll('.hero-btn');
      timeline.add(
        buttons,
        {
          opacity: [0, 1],
          scale: [0.95, 1],
          delay: stagger(80),
          duration: 700,
          ease: 'outElastic(1, .6)',
        },
        '-=400'
      );
    }
  }, []);

  // Parallax Mouse Tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x: x * 18, y: y * 14 });
  };

  return (
    <section
      id="enter"
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full flex flex-col justify-between pt-32 sm:pt-36 pb-8 px-6 sm:px-10 lg:px-14 xl:px-20 bg-white overflow-hidden select-none"
    >
      {/* 1. THREE.JS SUBTLE LOW-OPACITY BACKGROUND */}
      <HeroThreeBackground className="z-0" />

      {/* 2. DEDICATED LEFT-SIDE REFINED HEXAGON ORBS */}
      <CornerTelemetryAnimations />

      {/* 3. ATMOSPHERIC RADIAL GLOW BEHIND CLARA VISUAL */}
      <div
        className="absolute top-1/2 right-[6%] lg:right-[10%] -translate-y-1/2 w-[700px] xl:w-[850px] h-[700px] xl:h-[850px] pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle at 72% 45%, rgba(125, 80, 235, 0.12), transparent 42%)',
          zIndex: 0,
        }}
      />

      {/* ========================================================================= */}
      {/* MAIN HERO INNER: BALANCED TWO-COLUMN VIEWPORT OCCUPATION                  */}
      {/* ========================================================================= */}
      <div className="relative z-10 my-auto w-full max-w-[1800px] mx-auto min-h-[calc(100vh-140px)] flex items-center py-4 sm:py-6">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
          
          {/* ----------------- LEFT COLUMN: 8 COLUMNS FOR MASSIVE SINGLE-LINE TITLE ------------------ */}
          <div className="lg:col-span-8 xl:col-span-8 flex flex-col items-start text-left w-full max-w-[1150px]">
            
            {/* MAIN TITLE: MEET CLARA (Massive Scale + Brushed Metal Look) */}
            <h1
              ref={titleLettersRef}
              style={{
                fontSize: 'clamp(92px, 8.2vw, 160px)',
                lineHeight: 0.88,
                letterSpacing: '-0.045em',
              }}
              className="font-display font-black mb-8 sm:mb-10 flex flex-nowrap items-baseline gap-x-4 sm:gap-x-7 max-w-full whitespace-nowrap"
            >
              {/* MEET (Brushed Gunmetal / Dark Titanium Metallic) */}
              <span className="inline-flex overflow-hidden py-1 relative">
                {'MEET'.split('').map((char, charIdx) => (
                  <span
                    key={charIdx}
                    className="hero-letter inline-block font-black relative"
                    style={{
                      background: 'linear-gradient(180deg, #4B5563 0%, #374151 32%, #1F2937 68%, #0F172A 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.22))',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {char}
                  </span>
                ))}
              </span>

              {/* CLARA (Brushed Anodized Purple Titanium Metal) */}
              <span className="inline-flex overflow-hidden py-1 relative">
                {'CLARA'.split('').map((char, charIdx) => (
                  <span
                    key={charIdx}
                    className="hero-letter inline-block font-black relative"
                    style={{
                      background: 'linear-gradient(180deg, #A855F7 0%, #8B5CF6 32%, #7C3AED 68%, #581C87 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 4px 20px rgba(124,58,237,0.35))',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </h1>

            {/* HERO TAGLINE: An institution that can talk back. (Single Line) */}
            <h2
              style={{
                fontSize: 'clamp(34px, 3.2vw, 54px)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
              }}
              className="hero-text-fade font-display font-bold text-[#18181B] mb-8 sm:mb-10 w-full max-w-[1000px] whitespace-normal xl:whitespace-nowrap"
            >
              An institution that can{' '}
              <span className="font-extrabold italic text-[#7C3AED]">talk back.</span>
            </h2>

            {/* CLARA BRIEF: High-visibility description */}
            <p className="hero-text-fade text-[24px] sm:text-[27px] lg:text-[29px] xl:text-[31px] text-[#18181B] font-medium leading-[1.5] tracking-[-0.01em] w-full max-w-[960px] mb-10 sm:mb-12">
              CLARA is an AI-powered virtual receptionist designed for educational institutions, helping students, faculty, visitors, and staff find information, interact with the institution, connect with the right people, and manage appointments through natural conversation.
            </p>

            {/* HERO CTA BUTTONS: Height 72px */}
            <div
              ref={actionBtnsRef}
              className="flex items-center gap-4 w-full sm:w-auto"
            >
              {/* PRIMARY BUTTON: ENTER CLARA */}
              <button
                onClick={onOpenLiveDemo}
                onMouseEnter={playHoverChime}
                className="hero-btn w-full sm:w-[260px] h-[70px] rounded-full font-black text-[20px] sm:text-[22px] text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-2xl shadow-purple-600/40 hover:shadow-purple-600/60 transition-all duration-300 hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-3 cursor-pointer border-2 border-[#6D28D9]"
              >
                <Sparkles className="w-6 h-6 text-white" />
                <span>ENTER CLARA</span>
              </button>
            </div>

          </div>

          {/* ----------------- RIGHT COLUMN: 4 COLUMNS WITH BALANCED ROBOTIC FACE ----------------- */}
          <div
            ref={rightSideRef}
            className="lg:col-span-4 xl:col-span-4 flex items-center justify-center relative w-full"
          >
            <ClaraRoboticFace mouseOffset={mouseOffset} />
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SWIPE TO EXPLORE INDICATOR                                                */}
      {/* ========================================================================= */}
      {showSwipeHint && (
        <div
          onClick={onExploreCapabilities}
          className="relative z-10 flex items-center justify-center gap-2.5 text-xs font-mono text-[#52525B] pb-2 pt-1 cursor-pointer group hover:text-[#7C3AED] transition-colors"
        >
          <span className="tracking-widest uppercase text-[12px] font-bold text-[#7C3AED] group-hover:underline">
            SWIPE TO EXPLORE →
          </span>
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 font-mono text-[#7C3AED] text-sm">
            ▶
          </span>
        </div>
      )}
    </section>
  );
};
