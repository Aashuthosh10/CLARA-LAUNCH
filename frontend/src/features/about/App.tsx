import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { ClaraHero } from './components/ClaraHero';
import { Card02CapabilitiesMindMap } from './components/Card02CapabilitiesMindMap';
import { Card03Creators } from './components/Card03Creators';
import { Card04OurGuide } from './components/Card04OurGuide';
import { CreatorModal } from './components/CreatorModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { playNodeSelectChime } from './utils/audio';
import { CreatorMember } from './data/aboutData';

const TOTAL_CARDS = 4;
const AUTO_TRANSITION_DELAY_MS = 10000; // 10 seconds of inactivity

export default function App() {
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [selectedCreator, setSelectedCreator] = useState<CreatorMember | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const isTransitioningRef = useRef(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const goToCard = useCallback((index: number) => {
    const target = Math.max(0, Math.min(TOTAL_CARDS - 1, index));
    if (target !== currentCardIndex) {
      setHasInteracted(true);
      setCurrentCardIndex(target);
      playNodeSelectChime();
    }
  }, [currentCardIndex]);

  const nextCard = useCallback((isAutoAdvance: boolean = false) => {
    if (!isAutoAdvance) {
      if (currentCardIndex < TOTAL_CARDS - 1) {
        goToCard(currentCardIndex + 1);
      }
    } else {
      // Auto cycle wrap around (0 -> 1 -> 2 -> 3 -> 0)
      setCurrentCardIndex((prev) => (prev + 1) % TOTAL_CARDS);
    }
  }, [currentCardIndex, goToCard]);

  const prevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      goToCard(currentCardIndex - 1);
    }
  }, [currentCardIndex, goToCard]);

  // =========================================================================
  // 10-SECOND INACTIVITY AUTO-ADVANCE ENGINE
  // =========================================================================
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Do not auto-advance if creator modal is open
    if (selectedCreator !== null) {
      return;
    }

    inactivityTimerRef.current = setTimeout(() => {
      nextCard(true);
    }, AUTO_TRANSITION_DELAY_MS);
  }, [selectedCreator, nextCard]);

  // Set up listeners for user activity to reset 10-sec timer
  useEffect(() => {
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Start timer on initial mount
    resetInactivityTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // =========================================================================
  // KEYBOARD NAVIGATION (ArrowLeft, ArrowRight)
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCreator !== null) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        nextCard();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCreator, nextCard, prevCard]);

  // =========================================================================
  // TRACKPAD / WHEEL GESTURE HANDLING
  // =========================================================================
  useEffect(() => {
    let wheelTimeout: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      if (selectedCreator !== null) return;

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      accumulatedDelta += delta;

      if (isTransitioningRef.current) return;

      if (Math.abs(accumulatedDelta) > 60) {
        isTransitioningRef.current = true;
        if (accumulatedDelta > 0) {
          nextCard();
        } else {
          prevCard();
        }
        accumulatedDelta = 0;

        if (wheelTimeout) clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          isTransitioningRef.current = false;
        }, 650);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [selectedCreator, nextCard, prevCard]);

  // =========================================================================
  // TOUCH SWIPE HANDLERS (Mobile/Tablet)
  // =========================================================================
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const diff = dragStartX - endX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextCard();
      } else {
        prevCard();
      }
    }
    setDragStartX(null);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 w-screen h-screen bg-[#FAF9FF] text-[#24213A] overflow-hidden select-none"
    >
      {/* 1. Frosted Glass Top Navigation Header */}
      <Navbar
        currentCardIndex={currentCardIndex}
        onSelectCard={goToCard}
      />

      {/* 2. CONTINUOUS SPATIAL CANVAS (Horizontal Sliding Window) */}
      <motion.div
        className="flex w-[400vw] h-full"
        animate={{ x: `-${currentCardIndex * 100}vw` }}
        transition={{
          type: 'spring',
          stiffness: 140,
          damping: 24,
          mass: 0.9,
        }}
      >
        {/* CARD 01 — HERO */}
        <div className="w-screen h-full overflow-y-auto shrink-0 relative flex flex-col">
          <ClaraHero
            onOpenLiveDemo={() => goToCard(1)}
            onExploreCapabilities={() => goToCard(1)}
            showSwipeHint={!hasInteracted && currentCardIndex === 0}
          />
        </div>

        {/* CARD 02 — WHAT CLARA CAN DO (Mind-Map with Click-to-Expand Cards) */}
        <div className="w-screen h-full overflow-y-auto shrink-0 relative flex flex-col">
          <Card02CapabilitiesMindMap
            onNextCard={() => goToCard(2)}
          />
        </div>

        {/* CARD 03 — THE PEOPLE BEHIND CLARA (5 Compact Cards) */}
        <div className="w-screen h-full overflow-y-auto shrink-0 relative flex flex-col">
          <Card03Creators
            onPrevCard={() => goToCard(1)}
            onNextCard={() => goToCard(3)}
            onSelectCreator={setSelectedCreator}
          />
        </div>

        {/* CARD 04 — OUR GUIDE (Single Person Feature) */}
        <div className="w-screen h-full overflow-y-auto shrink-0 relative flex flex-col">
          <Card04OurGuide
            onPrevCard={() => goToCard(2)}
            onGoToOverview={() => goToCard(0)}
            onOpenLiveDemo={() => goToCard(0)}
          />
        </div>
      </motion.div>

      {/* 3. SLEEK CARD INDICATOR & DOCKS AT BOTTOM */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 rounded-full bg-white/95 backdrop-blur-md border-2 border-[#DDD6FE] shadow-xl shadow-purple-600/15">
        {/* Previous Button */}
        <button
          type="button"
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            currentCardIndex === 0
              ? 'text-[#D4D4D8] cursor-not-allowed opacity-40'
              : 'text-[#52525B] hover:text-[#7C3AED] hover:bg-[#F5F3FF]'
          }`}
          title="Previous Card (Left Arrow)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* 01 — 04 Indicator */}
        <div className="flex items-center gap-2 font-mono text-sm sm:text-base font-black tracking-widest text-[#09090B]">
          <span className="text-[#7C3AED]">0{currentCardIndex + 1}</span>
          <span className="text-[#A1A1AA]">—</span>
          <span className="text-[#71717A]">04</span>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2 px-2">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goToCard(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentCardIndex === idx
                  ? 'w-8 bg-[#7C3AED]'
                  : 'w-2.5 bg-[#E4E4E7] hover:bg-[#C4B5FD]'
              }`}
              title={`Jump to Card 0${idx + 1}`}
            />
          ))}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => nextCard()}
          disabled={currentCardIndex === TOTAL_CARDS - 1}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            currentCardIndex === TOTAL_CARDS - 1
              ? 'text-[#D4D4D8] cursor-not-allowed opacity-40'
              : 'text-[#52525B] hover:text-[#7C3AED] hover:bg-[#F5F3FF]'
          }`}
          title="Next Card (Right Arrow)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 4. Centered macOS-style Creator Modal (Rendered outside sliding track) */}
      <CreatorModal
        creator={selectedCreator}
        onClose={() => setSelectedCreator(null)}
      />
    </div>
  );
}
