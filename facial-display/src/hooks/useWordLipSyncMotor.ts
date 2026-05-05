import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MotionValue } from 'motion/react';

import type { ClaraSpeechEvent } from './useParentChannel';

type MotorOptions = {
  onStart?: (turnId: string) => void;
  onEnd?: (turnId: string) => void;
  onStop?: (turnId: string | null) => void;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function splitWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

function wordShapeFactor(word: string): number {
  const w = word.toLowerCase();
  const vowelCount = (w.match(/[aeiou]/g) ?? []).length;
  const hasOpenVowel = /[aou]/.test(w);
  const hasPlosive = /[bmp]/.test(w);
  const lengthFactor = Math.min(1.18, Math.max(0.86, w.length / 7));
  return lengthFactor * (hasOpenVowel ? 1.08 : 1) * (hasPlosive ? 0.94 : 1) * (vowelCount > 2 ? 1.04 : 1);
}

function jittered(ms: number) {
  return Math.max(24, ms * (0.92 + Math.random() * 0.16));
}

export function useWordLipSyncMotor(mouthScale: MotionValue<number>, opts: MotorOptions = {}) {
  const rafRef = useRef<number | null>(null);
  const currentTurnRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const optsRef = useRef(opts);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const cancelFrame = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancelActive = useCallback((notify: boolean) => {
    const stoppedTurnId = currentTurnRef.current;
    generationRef.current += 1;
    currentTurnRef.current = null;
    cancelFrame();
    mouthScale.set(0);
    if (notify) optsRef.current.onStop?.(stoppedTurnId);
  }, [cancelFrame, mouthScale]);

  const stopAll = useCallback(() => cancelActive(true), [cancelActive]);

  const isCurrent = useCallback((turnId: string, generation: number) => {
    return currentTurnRef.current === turnId && generationRef.current === generation;
  }, []);

  const animateTo = useCallback(
    (turnId: string, generation: number, to: number, durationMs: number) =>
      new Promise<boolean>((resolve) => {
        cancelFrame();
        const from = mouthScale.get();
        const startedAt = performance.now();
        const duration = Math.max(1, durationMs);
        const target = clamp01(to);

        const tick = (now: number) => {
          if (!isCurrent(turnId, generation)) {
            resolve(false);
            return;
          }
          const progress = clamp01((now - startedAt) / duration);
          const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          mouthScale.set(from + (target - from) * eased);
          if (progress >= 1) {
            rafRef.current = null;
            resolve(true);
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      }),
    [cancelFrame, isCurrent, mouthScale],
  );

  const wait = useCallback(
    (turnId: string, generation: number, durationMs: number) =>
      new Promise<boolean>((resolve) => {
        cancelFrame();
        const deadline = performance.now() + Math.max(0, durationMs);
        const tick = (now: number) => {
          if (!isCurrent(turnId, generation)) {
            resolve(false);
            return;
          }
          if (now >= deadline) {
            rafRef.current = null;
            resolve(true);
            return;
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }),
    [cancelFrame, isCurrent],
  );

  const start = useCallback(
    (speech: ClaraSpeechEvent) => {
      cancelActive(false);
      const turnId = speech.turnId;
      const generation = generationRef.current;
      currentTurnRef.current = turnId;
      optsRef.current.onStart?.(turnId);

      void (async () => {
        for (let i = 0; i < speech.sentences.length; i += 1) {
          if (!isCurrent(turnId, generation)) return;
          const sentence = speech.sentences[i] ?? '';
          const words = splitWords(sentence);
          const sentenceMs = Math.max(0, speech.durationsMs[i] ?? 0);
          if (!words.length || sentenceMs <= 0) continue;

          const gapMs = i < speech.sentences.length - 1 ? Math.min(140, Math.max(60, sentenceMs * 0.04)) : 0;
          const usableMs = Math.max(words.length * 90, sentenceMs - gapMs);
          const baseWordMs = usableMs / words.length;

          for (const word of words) {
            if (!isCurrent(turnId, generation)) return;
            const totalWordMs = jittered(baseWordMs * wordShapeFactor(word));
            const openMs = totalWordMs * 0.25;
            const midMs = totalWordMs * 0.5;
            const closeMs = totalWordMs * 0.25;
            const openAmount = /[aou]/i.test(word) ? 1 : 0.82;
            const midAmount = /[fvsz]/i.test(word) ? 0.38 : 0.58;

            if (!(await animateTo(turnId, generation, openAmount, openMs))) return;
            if (!(await animateTo(turnId, generation, midAmount, midMs))) return;
            if (!(await animateTo(turnId, generation, 0, closeMs))) return;
            if (!(await wait(turnId, generation, 10 + Math.random() * 22))) return;
          }

          if (gapMs > 0 && !(await wait(turnId, generation, gapMs))) return;
        }

        if (!isCurrent(turnId, generation)) return;
        mouthScale.set(0);
        currentTurnRef.current = null;
        optsRef.current.onEnd?.(turnId);
      })();
    },
    [animateTo, cancelActive, isCurrent, mouthScale, wait],
  );

  const stopAllRef = useRef(stopAll);
  stopAllRef.current = stopAll;
  useEffect(
    () => () => {
      stopAllRef.current();
    },
    [],
  );

  return useMemo(() => ({ start, stopAll, currentTurnRef }), [start, stopAll]);
}
