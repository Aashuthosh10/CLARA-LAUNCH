import React, { useState, useEffect } from 'react';
import { playHoverChime, playNodeSelectChime } from '../utils/audio';

interface NavbarProps {
  currentCardIndex: number;
  onSelectCard: (cardIndex: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCardIndex,
  onSelectCard,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navCards = [
    { label: 'Overview', index: 0 },
    { label: 'Capabilities', index: 1 },
    { label: 'Creators', index: 2 },
    { label: 'Our Guide', index: 3 },
  ];

  return (
    <header
      data-testid="about-me-navbar"
      className="fixed top-6 sm:top-8 left-0 right-0 z-50 px-4 py-2 sm:py-3 flex justify-center pointer-events-none transition-all duration-300"
    >
      {/* Centered Floating 4-Pills — lowered + ~20% larger for 13.3" kiosk */}
      <nav
        className={`pointer-events-auto inline-flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 rounded-full transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-2xl shadow-purple-950/15 border-2 border-[#DDD6FE]'
            : 'bg-white/92 backdrop-blur-md shadow-xl shadow-purple-950/10 border-2 border-[#E9D5FF]'
        }`}
      >
        {navCards.map((card) => {
          const isActive = currentCardIndex === card.index;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => {
                onSelectCard(card.index);
                playNodeSelectChime();
              }}
              onMouseEnter={playHoverChime}
              className={`px-7 sm:px-11 py-4 sm:py-5 rounded-full text-[23px] sm:text-[28px] font-black transition-all duration-200 cursor-pointer whitespace-nowrap tracking-tight ${
                isActive
                  ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-600/35 scale-[1.03]'
                  : 'text-[#27272A] hover:text-[#7C3AED] hover:bg-[#F5F3FF]'
              }`}
            >
              {card.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
