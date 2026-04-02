import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { DepartmentStageSlide } from '../../lib/collegeLocaleUtils';
import { useLanguage } from '../../context/LanguageContext';

export type { DepartmentStageSlide };

function getThemeClass(label: string) {
  const l = label.toLowerCase();
  if (l.includes('ai') || l.includes('data') || l.includes('machine')) return 'theme-ai';
  if (l.includes('ece') || l.includes('electronics')) return 'theme-ece';
  if (l.includes('mech') || l.includes('civil')) return 'theme-core';
  if (l.includes('mba') || l.includes('management') || l.includes('business')) return 'theme-mba';
  if (l.includes('cse') || l.includes('ise') || l.includes('cyber') || l.includes('computer')) return 'theme-cse';
  return 'theme-default';
}

function CinematicBackground({ themeClass }: { themeClass: string; key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className={`absolute inset-0 pointer-events-none rounded-3xl ${themeClass}`}
    >
      {themeClass === 'theme-cse' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#0f172a,_#000000_100%)] opacity-90" />}
      {themeClass === 'theme-ai' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#3b0764,_#000000_100%)] opacity-90" />}
      {themeClass === 'theme-ece' && <div className="absolute inset-0 bg-[linear-gradient(45deg,_#064e3b,_#000000_100%)] opacity-90" />}
      {themeClass === 'theme-core' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_#3f3f46,_#000000_100%)] opacity-90" />}
      {themeClass === 'theme-mba' && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#422006,_#000000_100%)] opacity-90" />}
      {themeClass === 'theme-default' && <div className="absolute inset-0 bg-black opacity-90" />}
    </motion.div>
  );
}

export default function DepartmentCardStage({
  departmentLabel,
  chipText,
  slides,
  currentCardIdx,
  onCardClick,
}: {
  departmentLabel: string;
  chipText?: string;
  slides: DepartmentStageSlide[];
  currentCardIdx: number;
  onCardClick?: (idx: number) => void;
}) {
  const { t, language } = useLanguage();
  const maxIdx = Math.max(0, slides.length - 1);
  const safeIdx = slides.length ? Math.min(Math.max(0, currentCardIdx), maxIdx) : 0;
  const current = slides[safeIdx];
  const translatedDept = departmentLabel ? t(departmentLabel) : 'Campus';
  const chipDisplay = chipText?.trim() || (departmentLabel.trim() ? translatedDept : 'Campus');
  const themeClass = useMemo(() => getThemeClass(chipDisplay), [chipDisplay]);

  // Use the same helper dictionary here for empty states to stay fully localized
  const DEPT_LABELS: Record<string, { department: string; unlisted: string }> = {
    English: { department: 'Department', unlisted: 'This department is not listed in the campus knowledge file yet.' },
    Kannada: { department: 'ವಿಭಾಗ', unlisted: 'ಈ ವಿಭಾಗವು ಕ್ಯಾಂಪಸ್ ಜ್ಞಾನದಲ್ಲಿ ಇನ್ನೂ ಪಟ್ಟಿ ಮಾಡಲಾಗಿಲ್ಲ.' },
    Hindi: { department: 'विभाग', unlisted: 'यह विभाग अभी कैंपस नॉलेज में सूचीबद्ध नहीं है।' },
    Tamil: { department: 'துறை', unlisted: 'இந்தத் துறை இன்னும் கேம்பஸ் அறிவில் பட்டியலிடப்படவில்லை.' },
    Telugu: { department: 'విభాగం', unlisted: 'ఈ విభాగం ఇంకా క్యాంపస్ నాలెడ్జ్‌లో జాబితా చేయబడలేదు.' },
    Malayalam: { department: 'വിഭാഗം', unlisted: 'ഈ വിഭാഗം ഇതുവരെ ക്യാമ്പസ് അറിവിൽ ലിസ്റ്റ് ചെയ്തിട്ടില്ല.' },
  };
  const L = DEPT_LABELS[language] ?? DEPT_LABELS.English;

  if (!slides.length || !current) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-8 rounded-3xl overflow-hidden isolation-auto">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10" />
        <div className="relative z-10 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-4">
            {chipDisplay}
          </div>
          <h2 className="text-3xl font-semibold text-white mb-2">{L.department}</h2>
          <p className="text-white/60">
            {L.unlisted}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col p-8 rounded-3xl shadow-2xl overflow-hidden isolation-auto justify-center">
      <AnimatePresence mode="popLayout">
        <CinematicBackground key={themeClass} themeClass={themeClass} />
      </AnimatePresence>
      
      {/* Heavy Backdrop Blur + 1px Border (Glassmorphism) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[24px] border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] rounded-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${chipText ?? departmentLabel}-${safeIdx}`}
          initial={{ scale: 0.9, opacity: 0, filter: "blur(10px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ scale: 0.9, opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center text-center self-center w-full max-w-4xl px-4"
        >
          <div className="mb-6 inline-block px-5 py-2 rounded-full bg-white/10 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white/90 text-[15px] font-medium tracking-wider">
            {chipDisplay}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-xl tracking-tight">
            {current.title}
          </h2>
          <p className="text-lg md:text-2xl text-white/80 whitespace-pre-line leading-relaxed max-w-3xl">
            {current.content}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-12 right-12 mt-auto flex gap-4 pt-8">
          {slides.map((_, i) => (
            <button
              onClick={() => onCardClick?.(i)}
              key={`${chipText ?? departmentLabel}-progress-${i}`}
              aria-label={`Go to card ${i + 1}`}
              className={`h-2 flex-1 rounded-full cursor-pointer transition-colors ${
                i === safeIdx ? 'bg-violet-600 shadow-[0_0_12px_rgba(168,85,247,0.8)]' : 'bg-white/20 hover:bg-violet-300'
              }`}
            />
          ))}
      </div>
    </div>
  );
}
