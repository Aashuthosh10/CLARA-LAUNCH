import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface HexOrbProps {
  className?: string;
  sizeClass?: string;
}

const SingleHexOrb: React.FC<HexOrbProps> = ({ className = '', sizeClass = 'w-36 sm:w-44 h-36 sm:h-44' }) => {
  return (
    <div className={`relative ${sizeClass} ${className}`}>
      {/* Ambient Glow (+8% Opacity) */}
      <div className="absolute inset-0 m-auto w-36 h-36 rounded-full bg-gradient-to-br from-[#7C3AED]/24 via-[#C084FC]/18 to-transparent blur-2xl" />

      <svg className="w-full h-full" viewBox="0 0 240 240" fill="none">
        <defs>
          <radialGradient id="singleHexOrbGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#DDD6FE" stopOpacity="0.92" />
            <stop offset="70%" stopColor="#7C3AED" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="singleHexStroke1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.83" />
            <stop offset="50%" stopColor="#C084FC" stopOpacity="0.53" />
            <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.18" />
          </linearGradient>

          <linearGradient id="singleHexStroke2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9333EA" stopOpacity="0.73" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        <g transform="translate(120, 120)">
          {/* Hexagon Ripple Pulse (+8% Opacity) */}
          <polygon
            className="hex-orb-ripple origin-center"
            points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23"
            stroke="#7C3AED"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Orbital Orbit Rings (+8% Opacity) */}
          <circle cx="0" cy="0" r="54" stroke="url(#singleHexStroke1)" strokeWidth="1" strokeDasharray="3 6" opacity="0.58" />
          <circle cx="0" cy="0" r="76" stroke="#C084FC" strokeWidth="0.85" strokeDasharray="2 8" opacity="0.43" />

          {/* Hexagon Layer 1 (Outer Geometry, +8% Opacity) */}
          <g className="hex-orb-layer-1 origin-center">
            <polygon
              points="0,-40 34.6,-20 34.6,20 0,40 -34.6,20 -34.6,-20"
              stroke="url(#singleHexStroke1)"
              strokeWidth="1.6"
              fill="#FAF8FF"
              fillOpacity="0.43"
            />
            <circle cx="0" cy="-40" r="2.4" fill="#7C3AED" />
            <circle cx="34.6" cy="-20" r="2" fill="#C084FC" />
            <circle cx="34.6" cy="20" r="2" fill="#7C3AED" />
            <circle cx="0" cy="40" r="2.4" fill="#C084FC" />
            <circle cx="-34.6" cy="20" r="2" fill="#7C3AED" />
            <circle cx="-34.6" cy="-20" r="2" fill="#C084FC" />
          </g>

          {/* Hexagon Layer 2 (Counter-Rotating Facet Ring, +8% Opacity) */}
          <g className="hex-orb-layer-2 origin-center">
            <polygon
              points="0,-30 26,-13 26,13 0,30 -26,13 -26,-13"
              stroke="url(#singleHexStroke2)"
              strokeWidth="1.3"
              strokeDasharray="5 3"
              fill="none"
            />
          </g>

          {/* Hexagon Layer 3 (Inner Prism Facet, +8% Opacity) */}
          <g className="hex-orb-layer-3 origin-center">
            <polygon
              points="0,-20 17.3,-10 17.3,10 0,20 -17.3,10 -17.3,-10"
              stroke="#7C3AED"
              strokeWidth="1.5"
              fill="#EDE9FE"
              fillOpacity="0.58"
            />
          </g>

          {/* Luminous Inner Glowing Orb Core */}
          <circle cx="0" cy="0" r="12" fill="url(#singleHexOrbGrad)" className="hex-orb-core-pulse origin-center" />
          <circle cx="0" cy="0" r="4" fill="#FFFFFF" className="hex-orb-core-pulse origin-center shadow-sm" />

          {/* Orbiting Satellite Hexagon 1 */}
          <g className="hex-orb-satellite-1 origin-center">
            <g transform="translate(54, 0)">
              <polygon points="0,-5.5 4.8,-2.75 4.8,2.75 0,5.5 -4.8,2.75 -4.8,-2.75" stroke="#7C3AED" strokeWidth="1.2" fill="#FFFFFF" />
              <circle cx="0" cy="0" r="1.4" fill="#7C3AED" />
            </g>
          </g>

          {/* Orbiting Satellite Hexagon 2 */}
          <g className="hex-orb-satellite-2 origin-center">
            <g transform="translate(0, -76)">
              <polygon points="0,-5 4.3,-2.5 4.3,2.5 0,5 -4.3,2.5 -4.3,-2.5" stroke="#C084FC" strokeWidth="1" fill="#EDE9FE" />
              <circle cx="0" cy="0" r="1.4" fill="#FFFFFF" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

export const CornerTelemetryAnimations: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Kinetic Rotation for Hexagon Orb Layers
    animate('.hex-orb-layer-1', {
      rotateZ: 360,
      duration: 22000,
      loop: true,
      ease: 'linear',
    });

    animate('.hex-orb-layer-2', {
      rotateZ: -360,
      duration: 16000,
      loop: true,
      ease: 'linear',
    });

    animate('.hex-orb-layer-3', {
      rotateZ: 360,
      duration: 28000,
      loop: true,
      ease: 'linear',
    });

    // 2. Breathing Core Light Pulse (+8% Base & Peak Opacity)
    animate('.hex-orb-core-pulse', {
      scale: [0.92, 1.18, 0.92],
      opacity: [0.73, 1, 0.73],
      duration: 2800,
      loop: true,
      direction: 'alternate',
      ease: 'inOutSine',
      delay: (_el, i) => i * 350,
    });

    // 3. Floating Orbital Hexagon Satellites
    animate('.hex-orb-satellite-1', {
      rotateZ: 360,
      duration: 13000,
      loop: true,
      ease: 'linear',
    });

    animate('.hex-orb-satellite-2', {
      rotateZ: -360,
      duration: 16000,
      loop: true,
      ease: 'linear',
    });

    // 4. Subtle Radial Pulse Ripples (+8% Opacity)
    animate('.hex-orb-ripple', {
      scale: [1, 1.45],
      opacity: [0.48, 0],
      duration: 3200,
      loop: true,
      delay: (_el, i) => i * 1200,
      ease: 'outQuad',
    });

    // Mouse Parallax
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 14;
      const y = (e.clientY / window.innerHeight - 0.5) * 14;

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${x * 0.4}px, ${y * 0.4}px, 0)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-[2] transition-transform duration-700 ease-out"
    >
      {/* 1. TOP-LEFT CORNER HEXAGON ORB (Compact Size) */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
        <SingleHexOrb />
      </div>

      {/* 2. CENTER-LEFT HEXAGON ORB (Compact Size) */}
      <div className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2">
        <SingleHexOrb />
      </div>

      {/* 3. BOTTOM-LEFT CORNER HEXAGON ORB (Compact Size) */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4">
        <SingleHexOrb />
      </div>
    </div>
  );
};
