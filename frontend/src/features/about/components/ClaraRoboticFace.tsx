import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { playNodeSelectChime, playHoverChime } from '../utils/audio';

interface ClaraRoboticFaceProps {
  mouseOffset: { x: number; y: number };
}

export const ClaraRoboticFace: React.FC<ClaraRoboticFaceProps> = ({ mouseOffset }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expression, setExpression] = useState<'happy' | 'listening' | 'analytical'>('happy');
  const containerRef = useRef<HTMLDivElement>(null);
  const eyeLeftRef = useRef<SVGPathElement>(null);
  const eyeRightRef = useRef<SVGPathElement>(null);
  const mouthRef = useRef<SVGPathElement>(null);

  // Periodic organic blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4200);

    return () => clearInterval(blinkInterval);
  }, []);

  // Continuous subtle robotic breathing & floating animation
  useEffect(() => {
    animate('.robot-face-float', {
      translateY: [-10, 10, -10],
      rotateZ: [-0.8, 0.8, -0.8],
      duration: 5200,
      loop: true,
      ease: 'inOutQuad',
    });

    animate('.hud-orbit-ring', {
      rotateZ: 360,
      duration: 26000,
      loop: true,
      ease: 'linear',
    });

    animate('.hud-orbit-ring-reverse', {
      rotateZ: -360,
      duration: 34000,
      loop: true,
      ease: 'linear',
    });
  }, []);

  const handleClick = () => {
    playNodeSelectChime();
    const nextExpr = expression === 'happy' ? 'listening' : expression === 'listening' ? 'analytical' : 'happy';
    setExpression(nextExpr);

    animate('#robot-chassis', {
      scale: [0.96, 1.04, 1],
      duration: 400,
      ease: 'outElastic(1, .5)',
    });
  };

  // Dynamic eye look target based on mouse offset
  const eyeLookX = Math.max(-14, Math.min(14, mouseOffset.x * 0.65));
  const eyeLookY = Math.max(-12, Math.min(12, mouseOffset.y * 0.65));
  const headTiltX = mouseOffset.x * 0.75;
  const headTiltY = mouseOffset.y * 0.75;
  const headRotateZ = mouseOffset.x * 0.12;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={() => {
        setIsHovered(true);
        playHoverChime();
      }}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `translate3d(${headTiltX}px, ${headTiltY}px, 0) rotateZ(${headRotateZ}deg)`,
        transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      className="relative w-full max-w-[480px] md:max-w-[540px] lg:max-w-[580px] xl:max-w-[640px] aspect-square flex items-center justify-center cursor-pointer select-none pointer-events-auto group opacity-95 hover:opacity-100 transition-opacity duration-500"
    >
      {/* ========================================================================= */}
      {/* 1. HOLOGRAPHIC TELEMETRY ORBITAL HUD RINGS (Softer Ambient Opacity)       */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        
        {/* Outer Telemetry Ring */}
        <svg className="hud-orbit-ring absolute w-[96%] h-[96%] text-[#DDD6FE]/40" viewBox="0 0 400 400">
          <circle
            cx="200"
            cy="200"
            r="192"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="6 10"
          />
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="1.8"
            strokeDasharray="35 190 25 160"
            opacity="0.35"
          />
          <path d="M 200 4 L 200 14 M 200 386 L 200 396 M 4 200 L 14 200 M 386 200 L 396 200" stroke="#7C3AED" strokeWidth="1.5" opacity="0.4" />
        </svg>

        {/* Counter-rotating Inner HUD Ring */}
        <svg className="hud-orbit-ring-reverse absolute w-[84%] h-[84%] text-[#C084FC]/30" viewBox="0 0 300 300">
          <circle
            cx="150"
            cy="150"
            r="142"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="12 20"
          />
          <circle
            cx="150"
            cy="150"
            r="134"
            fill="none"
            stroke="#9333EA"
            strokeWidth="1.2"
            strokeDasharray="50 100"
            opacity="0.3"
          />
        </svg>

        {/* Soft Ambient Core Glow */}
        <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#7C3AED]/15 via-[#C084FC]/10 to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. THE EXPANDED ROBOTIC FACE & CHASSIS (NO NOSE / NO NOTIFICATIONS)        */}
      {/* ========================================================================= */}
      <div id="robot-chassis" className="robot-face-float relative w-[95%] h-[95%] flex items-center justify-center">
        
        <svg
          viewBox="0 0 500 420"
          className="w-full h-full filter drop-shadow-[0_20px_40px_rgba(124,58,237,0.22)]"
        >
          <defs>
            {/* Metallic Violet & Pearl White Gradients */}
            <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#F5F3FF" />
              <stop offset="85%" stopColor="#EDE9FE" />
              <stop offset="100%" stopColor="#DDD6FE" />
            </linearGradient>

            <linearGradient id="cageBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>

            <linearGradient id="visorDarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="50%" stopColor="#0F0E26" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>

            {/* Neon Glow Filters */}
            <filter id="neonFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ------------------------------------------------------------- */}
          {/* A. ROBOT EAR MODULES & AUDIO SENSORS (LEFT & RIGHT)           */}
          {/* ------------------------------------------------------------- */}
          {/* Left Ear Audio Cup */}
          <g transform="translate(18, 140)">
            <rect x="0" y="0" width="34" height="95" rx="14" fill="url(#chassisGrad)" stroke="#7C3AED" strokeWidth="2" />
            <rect x="8" y="15" width="18" height="65" rx="8" fill="#18181B" />
            <circle cx="17" cy="48" r="4.5" fill="#7C3AED" opacity="0.8" />
            <circle cx="17" cy="48" r="3.5" fill="#C084FC" />
            <line x1="12" y1="26" x2="22" y2="26" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="70" x2="24" y2="70" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Right Ear Audio Cup */}
          <g transform="translate(448, 140)">
            <rect x="0" y="0" width="34" height="95" rx="14" fill="url(#chassisGrad)" stroke="#7C3AED" strokeWidth="2" />
            <rect x="8" y="15" width="18" height="65" rx="8" fill="#18181B" />
            <circle cx="17" cy="48" r="4.5" fill="#7C3AED" opacity="0.8" />
            <circle cx="17" cy="48" r="3.5" fill="#C084FC" />
            <line x1="12" y1="26" x2="22" y2="26" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="70" x2="24" y2="70" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* B. OUTER TRANSLUCENT CYBERNETIC HELMET CAGE                   */}
          {/* ------------------------------------------------------------- */}
          <path
            d="M 120 70 C 180 30, 320 30, 380 70 C 445 115, 455 240, 395 295 C 340 345, 160 345, 105 295 C 45 240, 55 115, 120 70 Z"
            fill="url(#chassisGrad)"
            stroke="url(#cageBorderGrad)"
            strokeWidth="3.5"
            fillOpacity="0.9"
          />

          {/* Structural Geometric Lines & Exoskeleton Accents */}
          <path d="M 250 35 L 250 95" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <path d="M 180 48 L 195 98" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M 320 48 L 305 98" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <path d="M 85 160 C 130 110, 370 110, 415 160" fill="none" stroke="#7C3AED" strokeWidth="2" opacity="0.4" />
          <path d="M 100 270 C 160 320, 340 320, 400 270" fill="none" stroke="#7C3AED" strokeWidth="2" opacity="0.4" />

          {/* Chin Base Node */}
          <rect x="210" y="325" width="80" height="28" rx="10" fill="#09090B" stroke="#7C3AED" strokeWidth="1.8" />
          <line x1="225" y1="339" x2="275" y2="339" stroke="#C084FC" strokeWidth="1.8" strokeLinecap="round" filter="url(#subtleGlow)" />

          {/* ------------------------------------------------------------- */}
          {/* C. DEEP OBSIDIAN VISOR (CLEAN, EXPANSIVE & NO NOSE PROTRUSION) */}
          {/* ------------------------------------------------------------- */}
          <rect
            x="105"
            y="110"
            width="290"
            height="180"
            rx="54"
            fill="url(#visorDarkGrad)"
            stroke="url(#cageBorderGrad)"
            strokeWidth="3"
          />

          {/* Subtle Visor Crystal Glare */}
          <path
            d="M 130 130 C 200 120, 300 120, 370 130 C 330 140, 170 140, 130 130 Z"
            fill="#FFFFFF"
            opacity="0.14"
          />

          {/* ------------------------------------------------------------- */}
          {/* D. GLOWING NEON CYBERNETIC EYES (DYNAMIC GAZE & BLINK)        */}
          {/* ------------------------------------------------------------- */}
          <g
            transform={`translate(${eyeLookX}, ${eyeLookY})`}
            style={{ transition: 'transform 0.1s ease-out' }}
          >
            {/* Left Eye */}
            <g transform="translate(180, 178)">
              {isBlinking ? (
                <line
                  x1="-26"
                  y1="0"
                  x2="26"
                  y2="0"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonFilter)"
                />
              ) : expression === 'happy' ? (
                <path
                  ref={eyeLeftRef}
                  d="M -24 6 C -24 -20, 24 -20, 24 6"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="url(#neonFilter)"
                />
              ) : expression === 'listening' ? (
                <circle
                  cx="0"
                  cy="0"
                  r="15"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  filter="url(#neonFilter)"
                />
              ) : (
                <path
                  d="M -22 -4 L 0 8 L 22 -4"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonFilter)"
                />
              )}
              <circle cx="0" cy="0" r="22" fill="#7C3AED" opacity="0.22" />
            </g>

            {/* Right Eye */}
            <g transform="translate(320, 178)">
              {isBlinking ? (
                <line
                  x1="-26"
                  y1="0"
                  x2="26"
                  y2="0"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonFilter)"
                />
              ) : expression === 'happy' ? (
                <path
                  ref={eyeRightRef}
                  d="M -24 6 C -24 -20, 24 -20, 24 6"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="url(#neonFilter)"
                />
              ) : expression === 'listening' ? (
                <circle
                  cx="0"
                  cy="0"
                  r="15"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  filter="url(#neonFilter)"
                />
              ) : (
                <path
                  d="M -22 -4 L 0 8 L 22 -4"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonFilter)"
                />
              )}
              <circle cx="0" cy="0" r="22" fill="#7C3AED" opacity="0.22" />
            </g>
          </g>

          {/* ------------------------------------------------------------- */}
          {/* E. GLOWING NEON SMILE / VOCAL EQUALIZER                       */}
          {/* ------------------------------------------------------------- */}
          <g transform={`translate(${eyeLookX * 0.4}, ${eyeLookY * 0.4})`}>
            {expression === 'happy' ? (
              // Friendly Radiant Smile
              <path
                ref={mouthRef}
                d="M 195 244 C 220 268, 280 268, 305 244"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="5.5"
                strokeLinecap="round"
                filter="url(#neonFilter)"
              />
            ) : expression === 'listening' ? (
              // Voice Waveform
              <g transform="translate(205, 250)">
                <line x1="0" y1="-8" x2="0" y2="8" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" filter="url(#subtleGlow)" />
                <line x1="18" y1="-14" x2="18" y2="14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" filter="url(#subtleGlow)" />
                <line x1="36" y1="-20" x2="36" y2="20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" filter="url(#neonFilter)" />
                <line x1="54" y1="-20" x2="54" y2="20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" filter="url(#neonFilter)" />
                <line x1="72" y1="-14" x2="72" y2="14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" filter="url(#subtleGlow)" />
                <line x1="90" y1="-8" x2="90" y2="8" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" filter="url(#subtleGlow)" />
              </g>
            ) : (
              // Sleek Ready Line
              <line
                x1="210"
                y1="250"
                x2="290"
                y2="250"
                stroke="#FFFFFF"
                strokeWidth="4.5"
                strokeLinecap="round"
                filter="url(#neonFilter)"
              />
            )}
          </g>
        </svg>

      </div>
    </div>
  );
};
