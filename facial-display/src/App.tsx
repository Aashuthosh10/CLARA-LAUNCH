import React, { useEffect, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';

import RobotFace from './components/RobotFace';
import { useParentChannel } from './hooks/useParentChannel';
import { useWordLipSyncMotor } from './hooks/useWordLipSyncMotor';

export default function App() {
  const ch = useParentChannel();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const mouthScale = useMotionValue(0);
  const lipSync = useWordLipSyncMotor(mouthScale, {
    onStart: (id) => {
      void id;
      setIsSpeaking(true);
      setIsThinking(false);
    },
    onEnd: () => {
      setIsSpeaking(false);
      setIsThinking(false);
    },
    onStop: () => {
      setIsSpeaking(false);
      setIsThinking(false);
    },
  });

  const lipSyncRef = useRef(lipSync);
  lipSyncRef.current = lipSync;

  useEffect(() => {
    return ch.onSpeech((e) => {
      lipSyncRef.current.start(e);
    });
  }, [ch]);

  useEffect(() => {
    return ch.onThinking(() => {
      // Thinking is suppressed once speaking begins.
      if (lipSyncRef.current.currentTurnRef.current) return;
      setIsThinking(true);
    });
  }, [ch]);

  useEffect(() => {
    return ch.onInterrupt((e) => {
      const ls = lipSyncRef.current;
      if (!ls.currentTurnRef.current || e.turnId === ls.currentTurnRef.current) {
        ls.stopAll();
        setIsThinking(false);
      }
    });
  }, [ch]);

  useEffect(() => {
    // Robust sync: audio can end slightly earlier than our planned word timeline.
    // Use clara_idle as a hard-stop within ~100ms to eliminate tail overhang.
    return ch.onIdle((e) => {
      const ls = lipSyncRef.current;
      if (!ls.currentTurnRef.current) return;
      if (e.turnId !== ls.currentTurnRef.current) return;
      window.setTimeout(() => {
        if (ls.currentTurnRef.current === e.turnId) ls.stopAll();
      }, 90);
    });
  }, [ch]);

  // Secondary display / kiosk: enter borderless fullscreen when not already
  // running under Chrome --kiosk (which has no window chrome).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('kiosk') !== '1') return;

    const tryFs = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
        }
      } catch {
        try {
          const el = document.documentElement as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
          };
          if (!document.fullscreenElement && el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          }
        } catch {
          /* ignore */
        }
      }
    };

    void tryFs();
    const onVis = () => {
      if (document.visibilityState === 'visible') void tryFs();
    };
    document.addEventListener('visibilitychange', onVis);
    // One-shot pointer unlock: allow a real user gesture to enter fullscreen if auto failed.
    const onPtr = () => {
      void tryFs();
    };
    window.addEventListener('pointerdown', onPtr, { once: true, capture: true });
    const interval = window.setInterval(() => {
      if (!document.fullscreenElement) void tryFs();
      else window.clearInterval(interval);
    }, 2000);
    window.setTimeout(() => window.clearInterval(interval), 20000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', onPtr, true);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Under Chrome --kiosk, keep touch lock. Under popup fallback, don't block the
    // first pointer gesture needed for requestFullscreen.
    if (params.get('bridge') === '1') {
      const prevent = (e: Event) => e.preventDefault();
      document.addEventListener('touchstart', prevent, { passive: false });
      document.addEventListener('click', prevent);
      return () => {
        document.removeEventListener('touchstart', prevent);
        document.removeEventListener('click', prevent);
      };
    }
    return undefined;
  }, []);

  return (
    <RobotFace
      isSpeaking={isSpeaking}
      isThinking={isThinking}
      isListening={false}
      mouthScale={mouthScale}
    />
  );
}
