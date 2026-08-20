import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DepartmentSlotImage } from '../../../../features/departments/images/DepartmentSlotImage';
import { useDepartmentImages } from '../../../../features/departments/images/useDepartmentImages';

interface BaseDepartmentCardProps {
  department: string;
  deptTagline: string;
  /** Canonical department identifier used to load department-wise assets. */
  departmentId: string;
  title: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  isHOD?: boolean;
  hodName?: string;
  currentSlide: number;
  /** Visual/template slot index (0..4) used to choose the correct department image. */
  visualSlotIndex?: number | null;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  onClose?: () => void;
}

export default function BaseDepartmentCard({
  department,
  deptTagline,
  departmentId,
  title,
  tagline,
  description,
  icon,
  isHOD,
  hodName,
  currentSlide,
  visualSlotIndex,
  totalSlides,
  onNext,
  onPrev,
  onSelectSlide,
  onClose,
}: BaseDepartmentCardProps) {
  const { images } = useDepartmentImages(departmentId);
  // CARD index mapping:
  // deck slide index is NOT always the same as the visual/template slot index.
  const visual = typeof visualSlotIndex === 'number' ? visualSlotIndex : currentSlide;
  // visual slot 0..4 -> slot1..slot5
  const slotIndex = visual >= 0 && visual <= 4 ? visual : null;
  const slotSrc = slotIndex === null ? '' : images[slotIndex] ?? '';
  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden bg-[linear-gradient(160deg,rgba(243,236,255,0.62)_0%,rgba(235,229,255,0.52)_48%,rgba(226,222,255,0.46)_100%)]"
      data-testid="department-card"
      data-card-index={currentSlide}
      data-total-slides={totalSlides}
      data-department-id={departmentId}
    >
      {/* Header - Department Info (Sticky/Permanent) */}
      <header className="pt-8 pb-4 text-center z-20 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-8 top-8 rounded-full border border-violet-200/55 bg-white/42 p-2 text-violet-700 shadow-[0_10px_30px_rgba(76,29,149,0.12)] transition-colors hover:bg-white/60 hover:text-violet-900"
          >
            <X size={20} />
          </button>
        )}
        <motion.h1 
          key={`dept-${department}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-black tracking-tight text-text-main uppercase"
        >
          {department}
        </motion.h1>
        <motion.p 
          className="text-text-accent text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mt-1 opacity-80"
        >
          {deptTagline}
        </motion.p>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 relative flex items-center justify-center p-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ y: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.3 } }}
            className="w-[80%] min-h-[600px] overflow-hidden rounded-[32px] border border-violet-200/55 bg-[linear-gradient(165deg,rgba(248,244,255,0.92)_0%,rgba(240,235,255,0.88)_52%,rgba(232,227,255,0.86)_100%)] shadow-[0_24px_80px_rgba(67,56,202,0.18)] backdrop-blur-xl flex flex-col md:flex-row"
          >
            {/* Left Column: Text */}
            <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-6">
                <div className="rounded-2xl border border-violet-200/55 bg-white/50 p-3 text-violet-700 shadow-[0_8px_24px_rgba(76,29,149,0.1)]">
                  {icon}
                </div>
                {isHOD && (
                  <span className="rounded-full border border-violet-300/45 bg-violet-100/55 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-700">
                    HOD Message
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-3xl font-bold text-text-main mb-3">
                {title}
              </h2>

              <p className="text-base md:text-lg text-text-accent font-medium mb-6 italic opacity-90">
                {tagline}
              </p>

              <div className="mb-6 whitespace-pre-line text-base leading-relaxed text-slate-700 md:text-lg">
                {description}
              </div>

              {isHOD && hodName && (
                <div className="mt-4 border-t border-violet-300/35 pt-4">
                  <p className="text-base font-bold text-text-main">{hodName}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Head of Department</p>
                </div>
              )}
            </div>

            {/* Right Column: Image */}
            <div className="relative min-h-[250px] flex-1 bg-[linear-gradient(160deg,rgba(234,225,255,0.55)_0%,rgba(246,240,255,0.36)_100%)] md:min-h-full">
              <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_30px_rgba(139,92,246,0.16)]" />
              <DepartmentSlotImage src={slotSrc} />
              <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#f3edff] to-transparent" />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Footer */}
      <div className="pb-8 pt-4 flex flex-col items-center gap-6 z-30">
        {/* Progress Dots */}
        <div className="flex gap-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSlide(idx)}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                idx === currentSlide ? "w-8 bg-violet-600" : "w-1.5 bg-violet-300/55"
              }`}
            />
          ))}
        </div>

        {/* Buttons (Desktop position) */}
        <div className="flex gap-4">
          <button
            data-testid="card-prev"
            onClick={onPrev}
            disabled={currentSlide === 0}
            className="rounded-full border border-violet-200/60 bg-white/75 p-3 text-violet-800 shadow-[0_10px_24px_rgba(76,29,149,0.14)] transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            data-testid="card-next"
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            className="rounded-full bg-violet-700 p-3 text-white shadow-[0_12px_28px_rgba(76,29,149,0.28)] transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
