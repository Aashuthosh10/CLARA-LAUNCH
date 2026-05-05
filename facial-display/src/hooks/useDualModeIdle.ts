import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

export type IdleEyeVariant = 'happy' | 'curious' | 'heart' | 'sad' | 'sleep';

type MacroGaze = { x: number; y: number };
type MicroDrift = { x: number; y: number };

const POSITIONS: Record<'center' | 'left' | 'right' | 'up' | 'down', MacroGaze> = {
  center: { x: 0, y: 0 },
  left: { x: -68, y: 6 },
  right: { x: 68, y: 6 },
  up: { x: 0, y: -42 },
  down: { x: 0, y: 38 },
};

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function scheduleIdle(
  timersRef: MutableRefObject<number[]>,
  fn: () => void,
  ms: number,
) {
  const id = window.setTimeout(() => {
    timersRef.current = timersRef.current.filter((t) => t !== id);
    fn();
  }, ms);
  timersRef.current.push(id);
}

/**
 * IDLE-only animation loops. Automatically cleared while `isSpeaking` is true.
 */
export function useDualModeIdle(isSpeaking: boolean) {
  const isSpeakingRef = useRef(isSpeaking);
  const timersRef = useRef<number[]>([]);
  const idleSinceRef = useRef(Date.now());
  const heartLockUntilRef = useRef(0);

  const [macroGaze, setMacroGaze] = useState<MacroGaze>({ x: 0, y: 0 });
  const [microDrift, setMicroDrift] = useState<MicroDrift>({ x: 0, y: 0 });
  const [idleVariant, setIdleVariant] = useState<IdleEyeVariant>('happy');
  const [blinkShut, setBlinkShut] = useState(false);

  const clearIdleTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (isSpeaking) {
      clearIdleTimers();
      setMacroGaze({ x: 0, y: 0 });
      setMicroDrift({ x: 0, y: 0 });
      setBlinkShut(false);
      setIdleVariant('happy');
      heartLockUntilRef.current = 0;
      return;
    }

    idleSinceRef.current = Date.now();
    heartLockUntilRef.current = 0;

    const guard = () => isSpeakingRef.current;

    function pickIdleVariant(): IdleEyeVariant {
      const idleMs = Date.now() - idleSinceRef.current;
      if (idleMs >= 22000 && Math.random() < 0.48) return 'sleep';
      if (idleMs >= 10000 && Math.random() < 0.28) return 'sad';
      if (Math.random() < 0.1) return 'heart';
      if (Math.random() < 0.26) return 'curious';
      return 'happy';
    }

    function loopEyeMovement() {
      scheduleIdle(timersRef, () => {
        if (guard()) return;
        const keys = Object.keys(POSITIONS) as (keyof typeof POSITIONS)[];
        const pick = keys[Math.floor(Math.random() * keys.length)]!;
        setMacroGaze(POSITIONS[pick]);
        loopEyeMovement();
      }, randBetween(2000, 4000));
    }

    function loopMicroDrift() {
      scheduleIdle(timersRef, () => {
        if (guard()) return;
        setMicroDrift({
          x: randBetween(-2, 2),
          y: randBetween(-2, 2),
        });
        loopMicroDrift();
      }, randBetween(900, 1600));
    }

    function loopBlink() {
      scheduleIdle(timersRef, () => {
        if (guard()) return;
        setBlinkShut(true);
        scheduleIdle(timersRef, () => {
          if (!guard()) setBlinkShut(false);
        }, randBetween(110, 165));
        loopBlink();
      }, randBetween(5000, 8000));
    }

    function loopEmotionCycle(nextDelayMs: number) {
      scheduleIdle(timersRef, () => {
        if (guard()) return;
        const now = Date.now();
        if (now < heartLockUntilRef.current) {
          loopEmotionCycle(randBetween(350, 700));
          return;
        }

        const next = pickIdleVariant();
        setIdleVariant(next);

        if (next === 'heart') {
          const dur = randBetween(1500, 2000);
          heartLockUntilRef.current = Date.now() + dur;
          scheduleIdle(timersRef, () => {
            if (guard()) return;
            setIdleVariant('happy');
            heartLockUntilRef.current = 0;
          }, dur);
        }

        loopEmotionCycle(randBetween(7000, 11000));
      }, nextDelayMs);
    }

    loopEyeMovement();
    loopMicroDrift();
    loopBlink();
    loopEmotionCycle(randBetween(2500, 4500));

    return clearIdleTimers;
  }, [isSpeaking, clearIdleTimers]);

  return {
    macroGaze,
    microDrift,
    idleVariant,
    blinkShut,
  };
}
