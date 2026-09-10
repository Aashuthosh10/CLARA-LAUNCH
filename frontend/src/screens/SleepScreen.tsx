import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'lucide-react';
import { agentLog, auditPointerInteraction } from '../debug/interactionDebug';
import { collegeLogoMark } from '../assets/logo';

/** Existing approved campus assets — cinematic darkening applied in CSS overlays. */
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
            auditPointerInteraction(e.clientX, e.clientY),
          );
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Wake CLARA"
      data-testid="sleep-screen"
    >
      {/* Background Slideshow — existing approved assets only */}
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
            alt=""
            className="w-full h-full object-cover scale-105 transition-transform duration-[8s] ease-linear brightness-[0.45] contrast-[1.05]"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic vignette + contrast (reference atmosphere) */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.88) 100%)',
        }}
        data-testid="sleep-vignette"
      />
      <div className="absolute inset-x-0 bottom-0 h-[45%] z-10 pointer-events-none bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
      <div className="absolute inset-0 z-10 pointer-events-none bg-black/25" />

      {/* Top-left: SVIT branding */}
      <div className="absolute top-[min(4vh,2.75rem)] left-[min(4vw,3.5rem)] z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="flex items-center gap-3 sm:gap-4 lg:gap-5"
        >
          <div className="flex h-[clamp(4.5rem,12vh,7.5rem)] w-auto max-w-[min(28vw,220px)] shrink-0 items-center justify-start">
            <img
              src={collegeLogoMark}
              alt=""
              role="presentation"
              draggable={false}
              decoding="async"
              className="pointer-events-none block max-h-full max-w-full w-auto object-contain object-left bg-transparent shadow-none"
            />
          </div>

          <div
            aria-hidden
            className="h-[clamp(4.5rem,12vh,7.5rem)] w-[3px] shrink-0 rounded-sm bg-[#F26522]"
          />

          <div className="flex flex-col justify-center pt-0.5">
            <h1
              className="text-[clamp(1.65rem,4.2vw,3.6rem)] font-black tracking-[0.1em] text-[#F26522] uppercase leading-none"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 2px 18px rgba(0,0,0,0.55)',
              }}
            >
              SAI VIDYA
            </h1>
            <p
              className="mt-1.5 text-[clamp(0.55rem,1.1vw,0.85rem)] font-bold tracking-[0.42em] text-white/95 uppercase"
              style={{ textShadow: '0 1px 10px rgba(0,0,0,0.55)' }}
            >
              Institute of Technology
            </p>
            <p
              className="mt-2 text-[clamp(0.7rem,1.15vw,1rem)] font-medium italic text-white/75"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: '0.03em',
                textShadow: '0 1px 8px rgba(0,0,0,0.5)',
              }}
            >
              Learn to lead
            </p>
          </div>
        </motion.div>
      </div>

      {/* Top-right: About Me — text left of icon, subtle (not a pill) */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onAboutMe();
        }}
        data-testid="about-me-entry"
        aria-label="About Me"
        className="group absolute top-[min(3.5vh,2.25rem)] right-[min(3.5vw,2.75rem)] z-40 inline-flex items-center gap-2.5 bg-transparent border-0 p-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 rounded-md"
      >
        <span
          className="text-[10px] sm:text-[11px] font-medium tracking-[0.08em] text-white/90 transition-colors group-hover:text-white"
          style={{ textShadow: '0 1px 10px rgba(0,0,0,0.65)' }}
        >
          About Me
        </span>
        <span
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#F26522]/85 bg-black/55 text-white shadow-[0_0_14px_rgba(242,101,34,0.35)] transition-all group-hover:border-[#F26522] group-hover:shadow-[0_0_18px_rgba(242,101,34,0.55)] group-hover:bg-black/70"
          aria-hidden
        >
          <User className="h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5" strokeWidth={1.75} />
        </span>
      </motion.button>

      {/* Center quote */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-[48%] -translate-y-1/2 z-30 flex flex-col items-center text-center pointer-events-none px-6"
      >
        <p
          className="font-normal text-white max-w-[min(92vw,54rem)] text-[clamp(1.85rem,4.6vw,3.75rem)]"
          style={{
            fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
            lineHeight: 1.28,
            letterSpacing: '0.02em',
            textShadow:
              '0 0 28px rgba(255, 214, 140, 0.28), 0 0 48px rgba(212, 175, 55, 0.12), 0 4px 22px rgba(0,0,0,0.65)',
          }}
          data-testid="sleep-quote"
        >
          &ldquo;Tomorrow&apos;s intelligence, engineered by
          <br />
          today&apos;s minds.&rdquo;
        </p>
      </motion.div>

      {/* Bottom-center start prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ delay: 1.2, duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-x-0 bottom-[min(7vh,3.75rem)] z-30 flex items-center justify-center gap-3 sm:gap-5 pointer-events-none px-4"
        data-testid="sleep-start-prompt"
      >
        <span className="hidden sm:block h-px w-10 md:w-14 bg-white/45" aria-hidden />
        <span
          className="text-[clamp(0.7rem,1.35vw,1.05rem)] tracking-[0.42em] sm:tracking-[0.55em] uppercase text-white/90 font-light"
          style={{
            textShadow: '0 0 18px rgba(255, 220, 160, 0.22), 0 2px 12px rgba(0,0,0,0.7)',
          }}
        >
          — TAP ANYWHERE TO START —
        </span>
        <span className="hidden sm:block h-px w-10 md:w-14 bg-white/45" aria-hidden />
      </motion.div>
    </motion.div>
  );
}
