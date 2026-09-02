import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { AuroraText } from '@/components/ui/aurora-text';
import { agentLog, auditPointerInteraction } from '../debug/interactionDebug';
import { collegeLogoMark } from '../assets/logo';

const CAMPUS_IMAGES = [
  '/assets/campus_hd_1.jpg',
  '/assets/campus_hd_2.jpg',
  '/assets/campus_hd_3.jpg',
  '/assets/campus_hd_4.jpg',
  '/assets/campus_hd_5.jpg',
  '/assets/campus_hd_6.jpg',
  '/assets/campus_hd_7.jpg',
  '/assets/campus_hd_8.jpg',
];

export default function SleepScreen({
  onWake,
  onAboutMe,
}: {
  onWake: () => void;
  onAboutMe: () => void;
}) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const wakeRequestedRef = useRef(false);
  const requestWake = () => {
    if (wakeRequestedRef.current) return;
    wakeRequestedRef.current = true;
    onWake();
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    agentLog('H5', 'SleepScreen.tsx:lifecycle', 'SleepScreen mounted');
    return () => {
      agentLog('H5', 'SleepScreen.tsx:lifecycle', 'SleepScreen unmounted');
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAMPUS_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full overflow-hidden bg-black"
      onPointerDown={requestWake}
      onClick={requestWake}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          requestWake();
        }
      }}
      onPointerDownCapture={(e: React.PointerEvent) => {
        if (import.meta.env.DEV) {
          agentLog(
            'H1',
            'SleepScreen.tsx:pointer',
            'pointer tap capture',
            auditPointerInteraction(e.clientX, e.clientY)
          );
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Wake CLARA"
      data-testid="sleep-screen"
    >
      {/* Background Slideshow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute inset-0 z-0 bg-black"
        >
          <img
            src={CAMPUS_IMAGES[currentIndex]}
            alt="Campus"
            className="w-full h-full object-cover scale-100 transition-transform duration-[5s] ease-linear brightness-50"
          />
        </motion.div>
      </AnimatePresence>

      {/* Dark Vignetee Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-radial-gradient from-transparent via-black/20 to-black/90" />

      {/* Bottom Readability Gradient (Integrated) */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] z-20 pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Global Dark Contrast Overlay for Visual Balance */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-black/20" />

      {/* Top Left: Premium Institutional Branding */}
      <div className="absolute top-12 left-16 z-30">
         <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="flex items-center gap-4 lg:gap-5"
        >
          <div className="flex min-h-[100px] h-[min(20vh,200px)] w-auto max-w-[min(42vw,360px)] shrink-0 items-center justify-start">
            <img
              src={collegeLogoMark}
              alt=""
              role="presentation"
              draggable={false}
              decoding="async"
              className="pointer-events-none block max-h-full max-w-full w-auto object-contain object-left bg-transparent shadow-none"
            />
          </div>

          {/* Vertical Divider — aligned to brand mark tile height */}
          <div
            aria-hidden
            className="h-[min(20vh,200px)] min-h-[100px] w-[4px] shrink-0 rounded-sm bg-[#E85D04]"
          />

          <div className="flex flex-col justify-center pt-1">
            <h1 className="text-5xl lg:text-[64px] font-black tracking-[0.12em] text-[#F26522] uppercase leading-none drop-shadow-md" style={{ fontFamily: "Inter, sans-serif" }}>
              SAI VIDYA
            </h1>
            <p className="text-xs lg:text-[14px] font-bold tracking-[0.45em] text-white/90 uppercase mt-2 drop-shadow-sm pr-1">
              Institute of Technology
            </p>
            
            {/* Horizontal Divider */}
            <div className="h-[3px] w-full bg-[#555555] mt-3 mb-2 rounded-sm"></div>
            
            <p className="text-sm lg:text-[17px] font-medium text-white/60 italic drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "0.03em" }}>
              Learn to lead
            </p>
          </div>
        </motion.div>
      </div>

      {/* Center: Quote & Interaction (Experience Core) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-[42%] -translate-y-1/2 z-30 flex flex-col items-center text-center pointer-events-none"
      >
        <p 
          className="text-4xl md:text-5xl font-normal text-white max-w-[55%]" 
          style={{ 
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1.55,
            letterSpacing: "0.85px",
            textShadow: "0 4px 24px rgba(255,255,255,0.1), 0 2px 10px rgba(0,0,0,0.6)"
          }}
        >
          "Tomorrow&apos;s intelligence, engineered by today&apos;s minds."
        </p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ delay: 1.5, duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-16 flex flex-col items-center gap-4"
        >
          <span className="text-xs md:text-sm tracking-[0.6em] uppercase text-white/50 font-light drop-shadow-md">
            TAP ANYWHERE TO START
          </span>
          <div className="h-[1px] w-8 bg-white/20 rounded-full" />
        </motion.div>
      </motion.div>

      {/* Prominent About Me entry */}
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onAboutMe();
        }}
        data-testid="about-me-entry"
        className="group absolute bottom-10 left-10 z-40 inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/60 bg-white/20 px-8 py-4 text-sm font-black tracking-[0.18em] text-white uppercase shadow-[0_8px_32px_rgba(76,29,149,0.32),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl transition-all duration-300 hover:scale-105 hover:border-white/90 hover:bg-white/30 hover:shadow-[0_12px_40px_rgba(124,58,237,0.45),inset_0_1px_0_rgba(255,255,255,0.85)] focus:outline-none focus:ring-4 focus:ring-white/40"
      >
        <span className="flex h-3 w-3 rounded-full bg-violet-600 shadow-[0_0_14px_rgba(124,58,237,0.9)]" aria-hidden="true" />
        About Me
      </motion.button>

      {/* Decorative Accents */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-40 right-0 w-96 h-96 bg-purple-500/5 blur-[150px] rounded-full translate-x-1/2 pointer-events-none" />
    </motion.div>
  );
}
