import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface BaseDepartmentCardProps {
  department: string;
  deptTagline: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  isHOD?: boolean;
  hodName?: string;
  currentSlide: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
  onSelectSlide: (idx: number) => void;
  onClose?: () => void;
}

export default function BaseDepartmentCard({
  department,
  deptTagline,
  title,
  tagline,
  description,
  image,
  icon,
  isHOD,
  hodName,
  currentSlide,
  totalSlides,
  onNext,
  onPrev,
  onSelectSlide,
  onClose,
}: BaseDepartmentCardProps) {
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
    <div className="relative w-full h-full flex flex-col bg-bg-beige bg-doodle overflow-hidden">
      {/* Header - Department Info (Sticky/Permanent) */}
      <header className="pt-8 pb-4 text-center z-20 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-8 top-8 p-2 rounded-full bg-white/50 text-text-accent hover:bg-white hover:text-text-main transition-colors shadow-sm"
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
            className="w-[80%] bg-[#f8f5ee] rounded-[32px] shadow-2xl border border-[#dcd7cc] overflow-hidden flex flex-col md:flex-row min-h-[600px]"
          >
            {/* Left Column: Text */}
            <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/50 rounded-2xl shadow-sm text-text-accent">
                  {icon}
                </div>
                {isHOD && (
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-text-accent/10 text-text-accent px-3 py-1 rounded-full">
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

              <div className="text-base md:text-lg text-[#5a5651] leading-relaxed mb-6 whitespace-pre-line">
                {description}
              </div>

              {isHOD && hodName && (
                <div className="mt-4 pt-4 border-t border-text-accent/20">
                  <p className="text-base font-bold text-text-main">{hodName}</p>
                  <p className="text-[10px] text-text-accent uppercase tracking-wider font-bold">Head of Department</p>
                </div>
              )}
            </div>

            {/* Right Column: Image */}
            <div className="flex-1 relative min-h-[250px] md:min-h-full bg-[#f1ebd9]/30">
              <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_30px_#f1ebd9]" />
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
                style={{
                   maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                   WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                }}
              />
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#f8f5ee] to-transparent z-10" />
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
                idx === currentSlide ? "w-8 bg-text-main" : "w-1.5 bg-text-accent/30"
              }`}
            />
          ))}
        </div>

        {/* Buttons (Desktop position) */}
        <div className="flex gap-4">
          <button
            onClick={onPrev}
            disabled={currentSlide === 0}
            className="p-3 rounded-full bg-white border border-[#dcd7cc] text-text-main shadow-md disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            className="p-3 rounded-full bg-text-main text-white shadow-md disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
