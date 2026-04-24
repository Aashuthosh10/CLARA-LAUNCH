import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLanguage } from './context/LanguageContext';

// Screens
import SleepScreen from './screens/SleepScreen';
import LanguageSelect from './screens/LanguageSelect';
import ChatScreen from './screens/ChatScreen';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:6969/ws/clara';
const WS_TOKEN = (import.meta.env.VITE_WS_TOKEN || '').trim();
const WS_URL = WS_TOKEN
  ? `${WS_BASE_URL}${WS_BASE_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(WS_TOKEN)}`
  : WS_BASE_URL;
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
              onHome={() => setManualState(0)}
              onOrbTap={() => sendMessage({ action: 'mic_start' })}
              sendMessage={sendMessage}
            />
          </motion.div>
        );
      default:
        return (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="glass p-12 rounded-3xl text-center">
              <h2 className="text-3xl font-display italic mb-4 text-white">State {effectiveState}</h2>
              <p className="text-stone-400 tracking-widest uppercase text-sm">
                This interface is currently under development.
              </p>
              <button
                onClick={() => setManualState(0)}
                className="mt-8 px-8 py-4 border border-white/10 rounded-full hover:bg-white/5 transition-colors text-white"
              >
                Return to Sleep
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans">
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="absolute top-0 left-0 right-0 z-[100] p-4 bg-amber-500/20 border-b border-amber-500/40 text-amber-200 text-xs text-center backdrop-blur-md">
          System connectivity issues. <button onClick={retryConnect} className="underline font-bold">Retry Connection</button>
        </div>
      )}

      {/* Main Content — Full Screen, No Wrapper */}
      <main className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {renderState()}
        </AnimatePresence>
      </main>
    </div>
  );
}
