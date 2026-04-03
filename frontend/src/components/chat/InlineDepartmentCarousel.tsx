import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { useLanguage } from '../../context/LanguageContext';
import type { DepartmentStageSlide } from '../../lib/collegeLocaleUtils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function InlineDepartmentCarousel({
  departmentLabel,
  slides,
  currentCardIdx,
  onCardClick,
  onClose
}: {
  departmentLabel: string;
  slides: DepartmentStageSlide[];
  currentCardIdx: number;
  onCardClick?: (idx: number) => void;
  onClose?: () => void;
}) {
  const { t } = useLanguage();
  const maxIdx = Math.max(0, slides.length - 1);
  const safeIdx = slides.length ? Math.min(Math.max(0, currentCardIdx), maxIdx) : 0;
  const current = slides[safeIdx];
  const translatedDept = departmentLabel ? t(departmentLabel) : 'Department';

  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');

  const dragControls = useDragControls();

  const paginate = (newDirection: number) => {
    let nextIdx = safeIdx + newDirection;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx > maxIdx) nextIdx = maxIdx;
    
    if (nextIdx !== safeIdx) {
      setSwipeDirection(newDirection > 0 ? 'right' : 'left');
      onCardClick?.(nextIdx);
    }
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = offset.x;

    if (swipe < -40) {
      paginate(1); // Swiped left -> next slide
    } else if (swipe > 40) {
      paginate(-1); // Swiped right -> prev slide
    }
  };

  if (!slides || slides.length === 0 || !current) return null;

  return (
    <motion.div 
      layoutId={`dept-${departmentLabel}`}
      className="relative w-[92%] h-[82%] mx-auto flex flex-col p-10 rounded-[2.5rem] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_12px_60px_rgba(0,0,0,0.06)] overflow-hidden isolation-auto mt-6"
    >
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-6 z-20">
        <div className="px-5 py-2.5 rounded-full bg-violet-100/60 text-violet-700 text-[13px] font-bold tracking-[0.15em] uppercase border border-violet-200/50 shadow-sm">
          {translatedDept}
        </div>
        {onClose && (
           <button 
             onClick={onClose}
             className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
           >
             <X size={20} />
           </button>
        )}
      </div>

      {/* Slide Content Area */}
      <div className="flex-1 relative w-full flex flex-col justify-center items-center overflow-hidden">
        
        {/* Subtle Next/Prev Arrows */}
        {safeIdx > 0 && (
          <button 
            onClick={() => paginate(-1)}
            className="absolute left-0 z-30 p-2 text-slate-300 hover:text-violet-500 transition-colors hidden md:block"
          >
             <ChevronLeft size={40} strokeWidth={1.5} />
          </button>
        )}
        {safeIdx < maxIdx && (
          <button 
            onClick={() => paginate(1)}
            className="absolute right-0 z-30 p-2 text-slate-300 hover:text-violet-500 transition-colors hidden md:block"
          >
             <ChevronRight size={40} strokeWidth={1.5} />
          </button>
        )}

        {/* Carousel AnimatePresence Container */}
        <div className="relative w-full h-full max-w-[90%] flex items-center px-4 md:px-12">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={safeIdx}
              drag="x"
              dragControls={dragControls}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={{ x: swipeDirection === 'right' ? 80 : -80, opacity: 0, scale: 0.96 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: swipeDirection === 'right' ? -80 : 80, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-full h-full flex flex-col justify-center cursor-grab active:cursor-grabbing pb-8"
            >
               <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4 drop-shadow-sm tracking-tight text-center sm:text-left leading-tight">
                  {current.title}
               </h2>
               <div className="text-[19px] md:text-[23px] text-slate-700 font-medium leading-[1.65] max-w-[95%] whitespace-pre-line text-center sm:text-left flex-1 overflow-y-auto no-scrollbar">
                  {current.content}
               </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination Indicators */}
      <div className="flex gap-2.5 justify-center items-center mt-auto pt-6 z-20 border-t border-slate-200/50 w-full max-w-[60%] mx-auto">
        {slides.map((_, i) => (
           <button
             key={i}
             onClick={() => {
                setSwipeDirection(i > safeIdx ? 'right' : 'left');
                onCardClick?.(i);
             }}
             className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === safeIdx 
                  ? 'w-12 bg-violet-600 shadow-[0_0_12px_rgba(139,92,246,0.6)]' 
                  : 'w-3 bg-slate-300/80 hover:bg-violet-400'
             }`}
             aria-label={`Go to slide ${i + 1}`}
           />
        ))}
      </div>
    </motion.div>
  );
}
