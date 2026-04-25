import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

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

/** Shared with in-chat language gate (ChatScreen). */
export const LANGUAGE_OPTIONS: { name: Language; label: string }[] = [
  { name: 'English', label: 'English' },
  { name: 'Kannada', label: 'ಕನ್ನಡ' },
  { name: 'Hindi', label: 'हिन्दी' },
  { name: 'Tamil', label: 'தமிழ்' },
  { name: 'Telugu', label: 'తెలుగు' },
  { name: 'Malayalam', label: 'മലയാളം' },
];

export default function LanguageSelect({
  onSelect,
  onHome
}: {
  onSelect: (language: Language) => void;
  onHome: () => void;
}) {
  const { setLanguage, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAMPUS_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (lang: Language) => {
    setSelectedLang(lang);
    setTimeout(() => {
      setLanguage(lang);
      onSelect(lang);
    }, 400); // Allow time for the refined animation
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center p-12 arctic-gradient"
    >
      {/* Background Slideshow (Faded for light theme) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }} /* Very subtle for light theme */
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

      {/* Subtle Light Overlay Instead of Dark Cinematic */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-white/40" />
      </div>

      {/* Home Button - Top Right */}
      <motion.button
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
        whileTap={{ scale: 0.97 }}
        onClick={onHome}
        className="absolute top-12 right-12 z-30 flex items-center justify-center w-16 h-16 rounded-2xl glass interactive-button group"
      >
        <Home className="w-6 h-6 text-slate-600 group-hover:text-slate-900 transition-colors" />
      </motion.button>

      {/* Content Layer */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
        <motion.h2
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-5xl font-bold text-slate-900 mb-20 tracking-wide text-center"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {t('selectLanguage')}
        </motion.h2>

        <div className="grid grid-cols-3 gap-10 w-full max-w-5xl px-8">
          {LANGUAGE_OPTIONS.map((lang, index) => {
            const isSelected = selectedLang === lang.name;
            const isAnySelected = selectedLang !== null;

            return (
              <motion.button
                key={lang.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: isAnySelected ? (isSelected ? 1 : 0.4) : 1,
                  y: 0,
                  scale: isSelected ? 1.05 : 1,
                  boxShadow: isSelected ? '0 0 30px rgba(255,255,255,0.15)' : 'none',
                  borderColor: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'
                }}
                transition={{
                  delay: isAnySelected ? 0 : index * 0.08,
                  duration: 0.4,
                  ease: "easeOut"
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(lang.name)}
                disabled={isAnySelected}
                className={`
                  relative overflow-hidden rounded-3xl flex flex-col items-center justify-center py-14 px-10
                  glass interactive-card transition-all duration-300
                  ${isSelected ? 'ring-2 ring-[#7FA6B8]/50 shadow-lg scale-105' : 'hover:bg-white/70'}
                `}
              >
                <span className="text-4xl justify-center items-center font-bold text-slate-900 mb-3" style={{ display: 'flex' }}>
                  {lang.label}
                </span>
                <span className="text-sm tracking-[0.2em] uppercase font-medium text-slate-500">
                  {lang.name}
                </span>

                {/* Subtle refined accent */}
                <div className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full bg-[#7FA6B8]/40" />
              </motion.button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="mt-24 text-slate-500 text-sm tracking-[0.5em] uppercase font-medium"
        >
          Touch to begin your experience
        </motion.div>
      </div>
    </motion.div>
  );
}
