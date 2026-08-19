/**
 * Independent ACK/earcon player. Must never touch response-TTS scheduler state.
 */

export type AckPlayer = {
  play: (audioBase64: string) => void;
  stop: () => void;
  playing: () => boolean;
};

export function createAckPlayer(opts?: {
  AudioCtor?: typeof Audio;
}): AckPlayer {
  const AudioCtor = opts?.AudioCtor ?? (typeof Audio !== 'undefined' ? Audio : undefined);
  let current: HTMLAudioElement | null = null;

  const stop = () => {
    if (!current) return;
    try {
      current.onended = null;
      current.onerror = null;
      current.pause();
      current.removeAttribute('src');
      current.load();
    } catch {
      // ignore
    }
    current = null;
  };

  return {
    play(audioBase64: string) {
      if (!AudioCtor || !audioBase64) return;
      stop();
      const audio = new AudioCtor(`data:audio/wav;base64,${audioBase64}`);
      audio.dataset.claraChannel = 'ack';
      current = audio;
      audio.onended = () => {
        if (current === audio) current = null;
      };
      audio.onerror = () => {
        if (current === audio) current = null;
      };
      void audio.play().catch(() => {
        if (current === audio) current = null;
      });
    },
    stop,
    playing: () => current !== null && !current.paused,
  };
}
