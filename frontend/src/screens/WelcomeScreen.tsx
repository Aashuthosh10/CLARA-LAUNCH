import React from 'react';
import { Home, AudioLines } from 'lucide-react';
import { motion } from 'motion/react';
import type { Variants } from 'motion/react';
import SiriOrb from '../components/SiriOrb';
import fullTextBgImage from '../assets/full_text_bg.png';

const WelcomeScreen: React.FC = () => {
  const [isListening, setIsListening] = React.useState(false);
  const greeting = "Good afternoon. I am CLARA, your campus assistant. How may I help you today?";
  const words = greeting.split(' ');

  // Animation variants for word-by-word reveal
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.5,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as const, // Smooth cinematic ease
      },
    },
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-[#F8FAFC] font-['Inter',sans-serif]">
      
      {/* ─── Full-Screen Background Image ─── */}
      <div 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        style={{ 
          backgroundImage: `url(${fullTextBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Subtle radial vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(241,245,249,0.3)_100%)] pointer-events-none z-0"></div>

      {/* Top Controls */}
      <div className="absolute top-8 left-8 z-20">
        <button className="flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 hover:bg-white/60 transition-all text-slate-700 hover:scale-105 active:scale-95">
          <Home className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      <div className="absolute top-8 right-8 z-20">
        <button className="flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 hover:bg-white/60 transition-all text-blue-500 hover:scale-105 active:scale-95">
          <AudioLines className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-[900px] px-8 pb-32">
        
        {/* Animated Greeting Typography */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center text-[#0F172A] font-medium tracking-[-0.03em] leading-[1.2] text-[64px] sm:text-[72px]"
        >
          {words.map((word, i) => {
            const isClara = word.replace(/[,.]/g, '') === "CLARA";
            const isPunctuation = word.endsWith('.') || word.endsWith(',');
            
            return (
              <motion.span
                key={i}
                variants={wordVariants}
                className={`inline-block mr-[0.25em] ${isClara ? 'font-bold text-[#0F172A]' : 'text-[#0F172A]'} ${word === 'assistant.' || word === 'today?' ? 'block sm:inline' : ''}`}
              >
                {word}
              </motion.span>
            );
          })}
        </motion.div>
      </div>

      {/* ─── Bottom Center Siri Orb ─── */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1, ease: "easeOut" }}
          className="relative cursor-pointer group"
          onClick={() => setIsListening(!isListening)}
        >
          {/* Reflection below the orb */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-blue-400/10 blur-xl rounded-[100%] scale-150 opacity-50"></div>
          
          <SiriOrb isListening={isListening} amplitude={isListening ? 0.3 : 0.05} />
          
          {/* Subtle Label */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-full text-center">
            <span className={`text-[11px] font-bold tracking-[0.3em] uppercase transition-colors whitespace-nowrap ${isListening ? 'text-indigo-500 animate-pulse' : 'text-slate-400 group-hover:text-indigo-500'}`}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </span>
          </div>
        </motion.div>
      </div>


      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeScreen;
