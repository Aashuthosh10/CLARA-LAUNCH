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

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('touchstart', prevent, { passive: false });
    document.addEventListener('click', prevent);
    return () => {
      document.removeEventListener('touchstart', prevent);
      document.removeEventListener('click', prevent);
    };
  }, []);

  // Secondary display: best-effort fullscreen/maximize.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('kiosk') !== '1') return;
    try {
      // Attempt to maximize + move (allowed only for popups).
      window.moveTo(0, 0);
      window.resizeTo(window.screen.availWidth, window.screen.availHeight);
    } catch {}
    // Best-effort: if Multi-Screen API is available, move to the non-primary screen.
    void (async () => {
      try {
        const anyWin = window as any;
        if (typeof anyWin.getScreenDetails !== 'function') return;
        const details = await anyWin.getScreenDetails();
        const screens = (details?.screens as any[]) || [];
        const primary = details?.currentScreen;
        const secondary = screens.find((s) => s && primary && s !== primary) || screens.find((s) => s && !s.isPrimary);
        const bounds = secondary?.availRect || secondary;
        if (!bounds) return;
        if (typeof bounds.left === 'number' && typeof bounds.top === 'number') {
          window.moveTo(bounds.left, bounds.top);
        }
        if (typeof bounds.width === 'number' && typeof bounds.height === 'number') {
          window.resizeTo(bounds.width, bounds.height);
        }
      } catch {}
    })();
    // Fullscreen may require user gesture unless in kiosk/app mode.
    const tryFs = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };
    void tryFs();
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
