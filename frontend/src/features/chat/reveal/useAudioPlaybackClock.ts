import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type AudioPlaybackClock = {
  progress: number;
  currentTime: number;
  duration: number;
  playing: boolean;
};

const IDLE: AudioPlaybackClock = {
  progress: 0,
  currentTime: 0,
  duration: 0,
  playing: false,
};

/**
 * Playback timeline clock for reveal sync.
 * Source of truth: HTMLAudioElement currentTime / duration.
 */
export function useAudioPlaybackClock(
  audioRef: RefObject<HTMLAudioElement | null>,
  enabled = true,
): AudioPlaybackClock {
  const [clock, setClock] = useState<AudioPlaybackClock>(IDLE);
  const rafRef = useRef<number | null>(null);

  const sample = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      setClock(IDLE);
      return false;
    }
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const currentTime = Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime) : 0;
    const playing = !audio.paused && !audio.ended && duration > 0;
    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    setClock({ progress, currentTime, duration, playing });
    return playing;
  }, [audioRef]);

  useEffect(() => {
    if (!enabled) {
      setClock(IDLE);
      return;
    }

    const tick = () => {
      const playing = sample();
      if (playing) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const onPlay = () => {
      sample();
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    const onPauseOrEnd = () => {
      sample();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const onTimeUpdate = () => {
      sample();
    };

    // Poll attachment: audio element is swapped frequently.
    const attachInterval = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if ((audio as unknown as { __claraClockBound?: boolean }).__claraClockBound) return;
      (audio as unknown as { __claraClockBound?: boolean }).__claraClockBound = true;
      audio.addEventListener('play', onPlay);
      audio.addEventListener('playing', onPlay);
      audio.addEventListener('pause', onPauseOrEnd);
      audio.addEventListener('ended', onPauseOrEnd);
      audio.addEventListener('timeupdate', onTimeUpdate);
      if (!audio.paused) onPlay();
    }, 200);

    sample();

    return () => {
      window.clearInterval(attachInterval);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const audio = audioRef.current;
      if (audio) {
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('playing', onPlay);
        audio.removeEventListener('pause', onPauseOrEnd);
        audio.removeEventListener('ended', onPauseOrEnd);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        delete (audio as unknown as { __claraClockBound?: boolean }).__claraClockBound;
      }
    };
  }, [audioRef, enabled, sample]);

  return clock;
}

/** Resolve page index + local progress from turn timeline and grapheme shares. */
export function resolvePagedPlayback(
  currentTime: number,
  duration: number,
  pageGraphemeCounts: number[],
): { pageIndex: number; localProgress: number } {
  if (!pageGraphemeCounts.length || duration <= 0) {
    return { pageIndex: 0, localProgress: duration > 0 ? Math.min(1, currentTime / duration) : 0 };
  }
  const total = Math.max(1, pageGraphemeCounts.reduce((a, b) => a + b, 0));
  let start = 0;
  for (let i = 0; i < pageGraphemeCounts.length; i += 1) {
    const share = Math.max(1, pageGraphemeCounts[i]!) / total;
    const pageDur = duration * share;
    const end = start + pageDur;
    if (currentTime < end || i === pageGraphemeCounts.length - 1) {
      const local = pageDur > 0 ? Math.min(1, Math.max(0, (currentTime - start) / pageDur)) : 1;
      return { pageIndex: i, localProgress: local };
    }
    start = end;
  }
  return { pageIndex: pageGraphemeCounts.length - 1, localProgress: 1 };
}
