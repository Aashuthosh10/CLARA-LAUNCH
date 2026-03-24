import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLanguage } from './context/LanguageContext';

// Screens
import SleepScreen from './screens/SleepScreen';
import LanguageSelect from './screens/LanguageSelect';
import ChatScreen from './screens/ChatScreen';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:6969/ws/clara';
const VOICE_INPUT_MODE = (import.meta.env.VITE_VOICE_INPUT_MODE || 'browser').toLowerCase() === 'backend' ? 'backend' : 'browser';

export default function App() {
  const { language } = useLanguage();
  const { state, payload, isConnected, setManualState, sendMessage, retryConnect, showOfflineBanner } = useWebSocket(WS_URL);
  const [urlOverrideState, setUrlOverrideState] = React.useState<number | null>(null);

  const effectiveState = urlOverrideState !== null ? urlOverrideState : state;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('state');
    if (s !== null) {
      const n = parseInt(s, 10);
      if (n >= 0 && n <= 8) setUrlOverrideState(n);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = parseInt(e.key);
      if (key >= 0 && key <= 8) {
        setUrlOverrideState(null);
        setManualState(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setManualState]);

  const renderState = () => {
    switch (effectiveState) {
      case 0:
        return (
          <motion.div key="sleep" className="w-full h-full">
            <SleepScreen
              onWake={() => {
                sendMessage({ action: 'wake' });
                setManualState(3);
              }}
            />
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="lang" className="w-full h-full">
            <LanguageSelect
              onSelect={(language) => {
                sendMessage({ action: 'language_selected', language });
                setManualState(5);
              }}
              onHome={() => setManualState(0)}
            />
          </motion.div>
        );
      case 4:
      case 5:
        return (
          <motion.div key="chat" className="w-full h-full">
            <ChatScreen
              messages={payload?.messages ?? []}
              isListening={payload?.isListening ?? false}
              isSpeaking={payload?.isSpeaking ?? false}
              isProcessing={payload?.isProcessing ?? false}
              payload={payload}
              isConnected={isConnected}
              voiceInputMode={VOICE_INPUT_MODE}
              onBack={() => setManualState(3)}
              onOrbTap={() => sendMessage({ action: 'mic_start' })}
              sendMessage={sendMessage}
            />
          </motion.div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="text-center p-10 border border-black/5 rounded-3xl">
              <h1 className="text-2xl font-bold mb-4">State {effectiveState}</h1>
              <button onClick={() => setManualState(0)} className="px-6 py-2 bg-black text-white rounded-full">Return Home</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full bg-[#FAFAFA] overflow-hidden font-sans">
      {/* Dynamic Background Accents */}
      <div className="absolute inset-0 warm-glow-light pointer-events-none z-0" />
      
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="absolute top-0 left-0 right-0 z-[100] p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 text-xs text-center backdrop-blur-md">
          System connectivity issues. <button onClick={retryConnect} className="underline font-bold">Retry Connection</button>
        </div>
      )}

      {/* Main Content Stage */}
      <main className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {renderState()}
        </AnimatePresence>
      </main>

      {/* Premium Kiosk Frame */}
      <div className="absolute inset-0 border-[24px] border-white/40 pointer-events-none z-50 rounded-[48px] shadow-inner" />
      <div className="absolute inset-0 border-[1px] border-black/5 pointer-events-none z-50 rounded-[48px]" />

      {/* Dev Metadata */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/50 backdrop-blur-lg border border-black/5 rounded-full text-[10px] text-gray-400 uppercase tracking-tighter z-50">
          Clara Kiosk Engine • State {effectiveState} • {isConnected ? 'Online' : 'Offline'}
        </div>
      )}
    </div>
  );
}
