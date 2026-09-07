import { useCallback, useEffect, useRef } from 'react';
import {
  AUTO_LISTEN_CONFIG,
  type AutoListenWaitMode,
} from '../lib/voice/autoListenConfig';

export type AutoListenArmReason = 'tts_complete' | 'manual_resume' | 'after_warning';

type UseAutoListenLifecycleArgs = {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  claraBusy: boolean;
  suppressed: boolean;
  onNameTimeout: () => void;
  onNormalInactivity: () => void;
  onClosingTimeout: () => void;
  /**
   * NO_INPUT (silence / ambient / empty recognition) while auto-armed.
   * attempt=1 → human warning #1 then re-arm after that TTS.
   * attempt=2 → human warning #2 + orb instruction; mic stays off.
   */
  onNoInputFailure: (attempt: 1 | 2) => void;
};

/**
 * Single owner for post-TTS auto-arm + wait-mode inactivity + no-input counting.
 * Does not own SpeechRecognition itself — only schedules start/stop.
 */
export function useAutoListenLifecycle({
  startListening,
  stopListening,
  isListening,
  claraBusy,
  suppressed,
  onNameTimeout,
  onNormalInactivity,
  onClosingTimeout,
  onNoInputFailure,
}: UseAutoListenLifecycleArgs) {
  const genRef = useRef(0);
  const modeRef = useRef<AutoListenWaitMode | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const waitTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const noInputCountRef = useRef(0);
  const awaitingManualRef = useRef(false);
  const startRef = useRef(startListening);
  const stopRef = useRef(stopListening);
  const onNameRef = useRef(onNameTimeout);
  const onNormalRef = useRef(onNormalInactivity);
  const onClosingRef = useRef(onClosingTimeout);
  const onNoInputRef = useRef(onNoInputFailure);
  startRef.current = startListening;
  stopRef.current = stopListening;
  onNameRef.current = onNameTimeout;
  onNormalRef.current = onNormalInactivity;
  onClosingRef.current = onClosingTimeout;
  onNoInputRef.current = onNoInputFailure;

  const clearSettle = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const clearWait = useCallback(() => {
    if (waitTimerRef.current !== null) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  }, []);

  const clearRestart = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const disarm = useCallback(
    (opts?: { stopMic?: boolean; clearNoInput?: boolean }) => {
      genRef.current += 1;
      armedRef.current = false;
      modeRef.current = null;
      clearSettle();
      clearWait();
      clearRestart();
      if (opts?.clearNoInput) {
        noInputCountRef.current = 0;
        awaitingManualRef.current = false;
      }
      if (opts?.stopMic !== false) {
        stopRef.current();
      }
    },
    [clearRestart, clearSettle, clearWait],
  );

  const startWaitTimer = useCallback(
    (mode: AutoListenWaitMode, gen: number) => {
      clearWait();
      const ms =
        mode === 'name'
          ? AUTO_LISTEN_CONFIG.nameWaitMs
          : mode === 'closing'
            ? AUTO_LISTEN_CONFIG.closingWaitMs
            : AUTO_LISTEN_CONFIG.normalInactivityMs;
      waitTimerRef.current = window.setTimeout(() => {
        waitTimerRef.current = null;
        if (gen !== genRef.current) return;
        if (modeRef.current !== mode) return;
        armedRef.current = false;
        stopRef.current();
        if (mode === 'name') onNameRef.current();
        else if (mode === 'closing') onClosingRef.current();
        else onNormalRef.current();
      }, ms);
    },
    [clearWait],
  );

  const armNow = useCallback(
    (mode: AutoListenWaitMode, gen: number) => {
      if (gen !== genRef.current) return;
      if (suppressed || claraBusy) return;
      if (awaitingManualRef.current) return;
      armedRef.current = true;
      modeRef.current = mode;
      startWaitTimer(mode, gen);
      if (!isListening) {
        startRef.current();
      }
    },
    [claraBusy, isListening, startWaitTimer, suppressed],
  );

  const scheduleArmAfterTts = useCallback(
    (mode: AutoListenWaitMode, _reason: AutoListenArmReason = 'tts_complete') => {
      if (suppressed) return;
      if (awaitingManualRef.current) return;
      genRef.current += 1;
      const gen = genRef.current;
      armedRef.current = false;
      modeRef.current = mode;
      clearSettle();
      clearWait();
      clearRestart();
      stopRef.current();
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        armNow(mode, gen);
      }, AUTO_LISTEN_CONFIG.postTtsSettleMs);
    },
    [armNow, clearRestart, clearSettle, clearWait, suppressed],
  );

  const notifyMeaningfulSpeech = useCallback(() => {
    clearSettle();
    clearWait();
    clearRestart();
    armedRef.current = false;
    modeRef.current = null;
    noInputCountRef.current = 0;
    awaitingManualRef.current = false;
    genRef.current += 1;
  }, [clearRestart, clearSettle, clearWait]);

  /**
   * Recognition ended without a usable transcript while auto-armed.
   * Counts as NO_INPUT (not REPEAT). Does not send backend traffic.
   */
  const notifyRecognitionEndedWithoutSpeech = useCallback(() => {
    if (!armedRef.current || !modeRef.current) return;
    if (suppressed || claraBusy) return;
    if (awaitingManualRef.current) return;

    const gen = genRef.current;
    const mode = modeRef.current;
    noInputCountRef.current += 1;
    const attempt = noInputCountRef.current;

    if (attempt >= AUTO_LISTEN_CONFIG.maxNoInputWarnings) {
      armedRef.current = false;
      modeRef.current = null;
      awaitingManualRef.current = true;
      clearRestart();
      clearWait();
      stopRef.current();
      onNoInputRef.current(2);
      return;
    }

    // First failure: stop mic, emit warning; ChatScreen re-arms after warning TTS.
    armedRef.current = false;
    clearRestart();
    clearWait();
    stopRef.current();
    onNoInputRef.current(1);

    // Soft gap then allow re-arm only if still same gen/mode expectation —
    // ChatScreen owns re-arm via scheduleArmAfterTts after warning TTS ends.
    void mode;
    void gen;
  }, [claraBusy, clearRestart, clearWait, suppressed]);

  /** Manual orb tap after second warning — cancel manual-wait and allow arming again. */
  const notifyManualResume = useCallback(() => {
    awaitingManualRef.current = false;
    noInputCountRef.current = 0;
    clearSettle();
    clearWait();
    clearRestart();
  }, [clearRestart, clearSettle, clearWait]);

  const isArmed = useCallback(() => armedRef.current, []);
  const currentMode = useCallback(() => modeRef.current, []);
  const generation = useCallback(() => genRef.current, []);
  const isAwaitingManual = useCallback(() => awaitingManualRef.current, []);
  const noInputCount = useCallback(() => noInputCountRef.current, []);

  useEffect(() => {
    return () => {
      disarm({ stopMic: true, clearNoInput: true });
    };
  }, [disarm]);

  useEffect(() => {
    if (!claraBusy) return;
    clearSettle();
    clearRestart();
    if (armedRef.current) {
      armedRef.current = false;
      stopRef.current();
    }
  }, [claraBusy, clearRestart, clearSettle]);

  useEffect(() => {
    if (!suppressed) return;
    disarm({ stopMic: true, clearNoInput: true });
  }, [disarm, suppressed]);

  return {
    scheduleArmAfterTts,
    notifyMeaningfulSpeech,
    notifyRecognitionEndedWithoutSpeech,
    notifyManualResume,
    disarm,
    isArmed,
    currentMode,
    generation,
    isAwaitingManual,
    noInputCount,
  };
}
