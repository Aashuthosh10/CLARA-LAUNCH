import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, User, Bot, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'clara';
  text: string;
}

export default function VoiceConversation({ 
  messages = [], 
  isListening = false,
  onBack 
}: { 
  messages?: Message[];
  isListening?: boolean;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col p-12 relative"
    >
      {/* Back Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="absolute top-12 left-12 glass w-16 h-16 rounded-full flex items-center justify-center z-20"
      >
        <ArrowLeft className="w-6 h-6 text-stone-400" />
      </motion.button>

      {/* Transcript Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-24 py-12 space-y-12 mb-32"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-start gap-4 max-w-[70%] ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center glass flex-shrink-0 mt-1 ${msg.role === 'clara' ? 'border-neo-mint/30' : ''}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-stone-400" /> : <Bot className="w-5 h-5 text-neo-mint" />}
                </div>
                
                <div className={`p-6 rounded-2xl glass ${msg.role === 'clara' ? 'bg-white/5 border-neo-mint/10' : ''}`}>
                  <p className="text-xl text-stone-100 leading-relaxed font-light">
                    {msg.text}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Thinking Indicator */}
        {!isListening && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="flex items-center gap-2 text-stone-500 text-sm tracking-widest uppercase italic">
              <span className="animate-pulse">{t('claraIsThinking')}</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-neo-mint animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-neo-mint animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-1 h-1 rounded-full bg-neo-mint animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mic Section */}
      <div className="h-64 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            animate={isListening ? {
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0px rgba(168, 230, 207, 0)',
                '0 0 40px rgba(168, 230, 207, 0.3)',
                '0 0 0px rgba(168, 230, 207, 0)'
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`w-32 h-32 rounded-full flex items-center justify-center glass border-2 ${isListening ? 'border-neo-mint' : 'border-white/10'}`}
          >
            <Mic className={`w-12 h-12 ${isListening ? 'text-neo-mint' : 'text-stone-600'}`} />
            
            {/* Ripple Animation */}
            {isListening && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border border-neo-mint"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                  className="absolute inset-0 rounded-full border border-neo-mint"
                />
              </>
            )}
          </motion.div>

          <motion.div
            animate={{ opacity: isListening ? 1 : 0.5 }}
            className="mt-6 text-sm tracking-[0.4em] uppercase font-medium text-stone-400"
          >
            {isListening ? t('listening') : t('tapToSpeak')}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
