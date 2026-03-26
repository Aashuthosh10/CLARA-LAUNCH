import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { AuroraText } from '@/components/ui/aurora-text';

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

export default function SleepScreen({ onWake }: { onWake: () => void }) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

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
      className="relative w-full h-full overflow-hidden cursor-pointer bg-black"
      onClick={onWake}
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
          className="absolute inset-0 z-0"
        >
          <img
            src={CAMPUS_IMAGES[currentIndex]}
            alt="Campus"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic Overlay: Gradient and Vignette */}
      <div className="absolute inset-0 z-10">
        {/* Dark cinematic gradient overlay: darker top/bottom, lighter center */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/78" />

        {/* Vignette effect */}
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Top-Left: Institutional Identity Block */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
        className="absolute top-16 left-16 z-20 flex items-center gap-10"
      >
        {/* Logo */}
        <div className="w-40 h-40 flex-shrink-0">
          <img
            src="/svit-logo.png"
            alt="Logo"
            className="w-full h-full object-contain filter drop-shadow-lg brightness-110"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Vertical Divider Line */}
        <div className="w-px h-24 bg-white/20" />

        {/* Institutional Typography */}
        <div className="flex flex-col justify-center text-white text-left">
          <h1
            className="text-3xl font-bold tracking-[0.02em] uppercase leading-none"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            SAI VIDYA
          </h1>
          <h2
            className="text-sm font-medium tracking-[0.3em] uppercase mt-2 opacity-90"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            INSTITUTE OF TECHNOLOGY
          </h2>

          {/* Thin Underline */}
          <div className="w-full h-px bg-white/20 mt-2 mb-2" />

          <p
            className="text-xs font-light italic tracking-[0.1em] opacity-80"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Learn to lead
          </p>
        </div>
      </motion.div>

      {/* Full-screen centered hero typography */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 1 }}
        className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
      >
        {/* Subtle spotlight glow behind hero text */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(117,140,255,0.14)_0%,rgba(134,87,255,0.10)_35%,rgba(0,0,0,0)_72%)]" />

        <div
          className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center [filter:drop-shadow(0_0_15px_rgba(59,130,246,0.3))]"
          style={{ fontFamily: "'Playfair Display', 'Times New Roman', serif" }}
        >
          <p className="text-5xl md:text-6xl font-medium leading-[1.1] tracking-normal text-white whitespace-nowrap">
            Tomorrow&apos;s intelligence, engineered by today&apos;s minds.
          </p>
          <p className="mt-4 text-3xl md:text-4xl font-medium leading-[1.2] tracking-normal text-white">
            Step closer to awaken{' '}
            <AuroraText
              colors={['#00E5FF', '#3B82F6', '#9333EA', '#60A5FA']}
              className="font-bold [filter:drop-shadow(0_0_8px_rgba(59,130,246,0.6))]"
            >
              CLARA
            </AuroraText>
            .
          </p>
        </div>
      </motion.div>

      {/* Center Bottom: TAP TO WAKE */}
      <div className="absolute bottom-20 left-0 right-0 z-30 flex flex-col items-center justify-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.span
            animate={{ opacity: [0.35, 0.72, 0.35] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-base tracking-[0.28em] uppercase text-white/70 font-light"
          >
            {t('tapToWake')}
          </motion.span>
          <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        </motion.div>
      </div>

      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l border-t border-white/5 m-8 z-20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r border-b border-white/5 m-8 z-20 pointer-events-none" />
    </motion.div>
  );
}
