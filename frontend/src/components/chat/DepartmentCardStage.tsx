import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { DepartmentStageSlide } from '../../lib/collegeLocaleUtils';
import { useLanguage } from '../../context/LanguageContext';

export type { DepartmentStageSlide };

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
  const { language } = useLanguage();
  const maxIdx = Math.max(0, slides.length - 1);
  const safeIdx = slides.length ? Math.min(Math.max(0, currentCardIdx), maxIdx) : 0;
  const current = slides[safeIdx];
  const chipDisplay = chipText?.trim() || (departmentLabel.trim() ? departmentLabel : 'Campus');

  const DEPT_LABELS: Record<string, { department: string; unlisted: string }> = {
    English: { department: 'Department', unlisted: 'This department is not listed in the campus knowledge file yet.' },
    Kannada: { department: 'ವಿಭಾಗ', unlisted: 'ಈ ವಿಭಾಗವು ಕ್ಯಾಂಪಸ್ ಜ್ಞಾನದಲ್ಲಿ ಇನ್ನೂ ಪಟ್ಟಿ ಮಾಡಲಾಗಿಲ್ಲ.' },
    Hindi: { department: 'विभाग', unlisted: 'यह विभाग अभी कैंपस नॉलेज में सूचीबद्ध नहीं है।' },
    Tamil: { department: 'துறை', unlisted: 'இந்தத் துறை ಇನ್ನೂ கேம்பஸ் அறிவில் பட்டியலிடப்படவில்லை.' },
    Telugu: { department: 'విభాగం', unlisted: 'ఈ విభాగం ఇంకా క్యాంపస్ నాలెడ్జ్‌లో జాబితా చేయబడలేదు.' },
    Malayalam: { department: 'ವಿഭാഗം', unlisted: 'ഈ വിഭാഗം ഇതുവരെ ക്യാമ്പസ് അറിവിൽ ലിസ്റ്റ് ചെയ്തിട്ടില്ല.' },
  };
  const L = DEPT_LABELS[language] ?? DEPT_LABELS.English;

  if (!slides.length || !current) {
    return (
      <div className="premium-stage-container">
        <div className="premium-stage-border-outer" />
        <div className="premium-stage-border-inner" />
        <div className="relative z-10 text-center">
          <div className="premium-stage-chip">
            {chipDisplay}
          </div>
          <h2 className="premium-stage-title" style={{ fontSize: '3rem' }}>{L.department}</h2>
          <p className="premium-stage-body mx-auto">
            {L.unlisted}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-stage-container" data-testid="department-card-stage">
      {/* Structural Borders */}
      <div className="premium-stage-border-outer" />
      <div className="premium-stage-border-inner" />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${chipText ?? departmentLabel}-${safeIdx}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-start w-full"
        >
          {/* Label / Chip */}
          <div className="premium-stage-chip">
            {chipDisplay}
          </div>

          {/* Title - Elegant Serif */}
          <h2 className="premium-stage-title">
            {current.title}
          </h2>

          {/* Body Content */}
          <p className="premium-stage-body">
            {current.content}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Elegant Progress Indicators */}
      <div className="premium-stage-indicators">
        {slides.map((_, i) => (
          <button
            onClick={() => onCardClick?.(i)}
            key={`${chipText ?? departmentLabel}-progress-${i}`}
            aria-label={`Go to card ${i + 1}`}
            className={`premium-indicator-bar ${i === safeIdx ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
