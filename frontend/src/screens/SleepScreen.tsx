import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'lucide-react';
import { agentLog, auditPointerInteraction } from '../debug/interactionDebug';
import { collegeLogoMark } from '../assets/logo';
import { getDailyThought, getThoughtDayKey } from '../data/dailyThoughts';

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
  '/assets/campus_hd_9.jpg',
  '/assets/campus_hd_10.jpg',
  '/assets/campus_hd_11.png',
  '/assets/campus_hd_12.png',
  '/assets/campus_hd_13.JPG',
  '/assets/campus_hd_14.JPG',
];

function formatSleepClock(now: Date): { time: string; date: string } {
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return { time, date };
}

/** Local wall-clock for SleepScreen — updates on the minute. */
function useLocalWallClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(new Date());
    tick();
    const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return now;
}

export default function SleepScreen({
  onWake,
  onAboutMe,
}: {
  onWake: () => void;
  onAboutMe: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const wakeRequestedRef = useRef(false);
  const now = useLocalWallClock();
  const { time, date } = useMemo(() => formatSleepClock(now), [now]);
  const dailyThought = getDailyThought(now);
  const thoughtDayKey = getThoughtDayKey(now);
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
            className="w-full h-full object-cover scale-105 transition-transform duration-[8s] ease-linear brightness-100 contrast-[1.02]"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Uniform contrast layer for legible kiosk content. */}
      <div
        className="absolute inset-0 z-10 pointer-events-none bg-black/40"
        data-testid="sleep-dark-overlay"
      />

      {/* Light cinematic edge only — keep campus photo near full opacity */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.18) 82%, rgba(0,0,0,0.38) 100%)',
        }}
        data-testid="sleep-vignette"
      />
      <div className="absolute inset-x-0 bottom-0 h-[28%] z-20 pointer-events-none bg-gradient-to-t from-black/30 via-black/10 to-transparent" />

      {/* Top-left: SVIT branding — lower + ~10% larger for kiosk */}
      <div className="absolute top-[min(8.5vh,4.75rem)] left-[min(4vw,3.5rem)] z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="flex items-center gap-3 sm:gap-4 lg:gap-5"
        >
          <div className="flex h-[clamp(5.95rem,15.85vh,10.9rem)] w-auto max-w-[min(35vw,290px)] shrink-0 items-center justify-start">
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
            className="h-[clamp(5.95rem,15.85vh,10.9rem)] w-[3.5px] shrink-0 rounded-sm bg-[#F26522]"
          />

          <div className="flex flex-col justify-center pt-0.5">
            <h1
              className="text-[clamp(2.15rem,5.5vw,4.75rem)] font-black tracking-[0.1em] text-[#F26522] uppercase leading-none"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 2px 18px rgba(0,0,0,0.55)',
              }}
            >
              SAI VIDYA
            </h1>
            <p
              className="mt-1.5 text-[clamp(0.72rem,1.43vw,1.1rem)] font-bold tracking-[0.42em] text-white/95 uppercase"
              style={{ textShadow: '0 1px 10px rgba(0,0,0,0.55)' }}
            >
              Institute of Technology
            </p>
            <p
              className="mt-2 text-[clamp(0.94rem,1.5vw,1.32rem)] font-medium italic text-white/75"
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

      {/* Top-right: real-time local clock */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.9 }}
        className="absolute top-[min(8.5vh,4.75rem)] right-[min(3.5vw,2.75rem)] z-30 text-right pointer-events-none"
        data-testid="sleep-clock"
        aria-live="polite"
      >
        <p
          className="text-[clamp(2.4rem,5vw,3.75rem)] font-bold tabular-nums leading-none text-white tracking-tight"
          style={{
            textShadow:
              '0 0 18px rgba(212, 175, 55, 0.35), 0 2px 14px rgba(0,0,0,0.7)',
          }}
          data-testid="sleep-clock-time"
        >
          {time}
        </p>
        <p
          className="mt-2 text-[clamp(0.85rem,1.5vw,1.15rem)] font-medium text-white/85 tracking-[0.04em]"
          style={{ textShadow: '0 1px 10px rgba(0,0,0,0.65)' }}
          data-testid="sleep-clock-date"
        >
          {date}
        </p>
      </motion.div>

      {/* Center quote — royal gold edge lighting */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 top-[48%] -translate-y-1/2 z-30 flex flex-col items-center text-center pointer-events-none px-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={thoughtDayKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="font-normal text-white max-w-[min(92vw,54rem)] text-[clamp(1.85rem,4.6vw,3.75rem)]"
            style={{
              fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
              lineHeight: 1.28,
              letterSpacing: '0.02em',
              color: '#FFF8E7',
              WebkitTextStroke: '0.35px rgba(212, 175, 55, 0.55)',
              textShadow: [
                '0 0 1px rgba(255, 236, 179, 0.95)',
                '0 0 8px rgba(212, 175, 55, 0.85)',
                '0 0 18px rgba(201, 162, 39, 0.7)',
                '0 0 36px rgba(184, 134, 11, 0.45)',
                '0 0 56px rgba(212, 175, 55, 0.28)',
                '0 3px 18px rgba(0, 0, 0, 0.7)',
              ].join(', '),
            }}
            data-testid="sleep-quote"
          >
            &ldquo;{dailyThought}&rdquo;
          </motion.p>
        </AnimatePresence>

      </motion.div>

      {/* Bottom-center start prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ delay: 1.2, duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-x-0 bottom-[min(7vh,3.75rem)] z-30 flex items-center justify-center gap-3 sm:gap-5 pointer-events-none px-4"
        data-testid="sleep-start-prompt"
      >
        <span className="hidden sm:block h-px w-12 md:w-16 bg-[#D4AF37]/70" aria-hidden />
        <span
          className="text-[clamp(1rem,2vw,1.55rem)] tracking-[0.42em] sm:tracking-[0.55em] uppercase text-white font-bold"
          style={{
            textShadow:
              '0 0 14px rgba(212, 175, 55, 0.45), 0 0 28px rgba(255, 220, 160, 0.25), 0 2px 12px rgba(0,0,0,0.75)',
          }}
        >
          — TAP ANYWHERE TO START —
        </span>
        <span className="hidden sm:block h-px w-12 md:w-16 bg-[#D4AF37]/70" aria-hidden />
      </motion.div>

      {/* Bottom-right: aligned with the start prompt — text left of icon */}
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
        className="group absolute bottom-[min(7vh,3.75rem)] right-[min(3.5vw,2.75rem)] z-40 inline-flex items-center gap-2.5 bg-transparent border-0 p-3 min-h-[52px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 rounded-md"
      >
        <span
          className="text-[clamp(0.72rem,1.15vw,0.95rem)] tracking-[0.1em] uppercase text-white/90 font-semibold transition-colors group-hover:text-white"
          style={{ textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}
        >
          About Me
        </span>
        <span
          className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-[#F26522]/85 bg-black/55 text-white shadow-[0_0_12px_rgba(242,101,34,0.35)] transition-all group-hover:border-[#F26522] group-hover:shadow-[0_0_16px_rgba(242,101,34,0.55)] group-hover:bg-black/70"
          aria-hidden
        >
          <User className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
        </span>
      </motion.button>
    </motion.div>
  );
}
