import { mintAudioToken } from './planToScenes';
import type { PresentationPlaybackEvent, PlaybackEventType } from './types';

export type AudioEventHandler = (event: PresentationPlaybackEvent) => void;

/**
 * Controls HTMLAudioElement playback only.
 * Mints audioToken per bind; never mutates cards/captions/scenes.
 */
export class PresentationAudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentToken: string | null = null;
  private presentationId: string | null = null;
  private sceneId: string | null = null;
  private onEvent: AudioEventHandler | null = null;
  private detach: (() => void) | null = null;

  setEventHandler(handler: AudioEventHandler | null): void {
    this.onEvent = handler;
  }

  get audioElement(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  get token(): string | null {
    return this.currentToken;
  }

  stop(): void {
    this.invalidate();
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
  }

  /** Invalidate token so late callbacks are ignored; does not pause if keepElement. */
  invalidate(): void {
    this.detach?.();
    this.detach = null;
    this.currentToken = null;
  }

  /**
   * Bind listeners on an existing Audio element (ChatScreen may still construct WAV data URLs).
   * Returns the minted audioToken (also pass the engine.beginAudioBind token if pre-minted).
   */
  bindElement(
    audio: HTMLAudioElement,
    opts: {
      presentationId: string;
      sceneId: string;
      audioToken?: string;
    },
  ): string {
    this.detach?.();
    this.stopElementOnly();

    const token = opts.audioToken ?? mintAudioToken();
    this.currentAudio = audio;
    this.currentToken = token;
    this.presentationId = opts.presentationId;
    this.sceneId = opts.sceneId;

    const emit = (type: PlaybackEventType, durationSec?: number) => {
      if (this.currentToken !== token) return;
      if (!this.presentationId || !this.sceneId) return;
      this.onEvent?.({
        type,
        presentationId: this.presentationId,
        audioToken: token,
        sceneId: this.sceneId,
        durationSec,
      });
    };

    const onEnded = () => emit('ended', audio.duration);
    const onError = () => emit('error');
    const onPause = () => {
      if (!audio.ended) emit('pause');
    };
    const onStalled = () => emit('stalled');
    const onMeta = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        emit('loadedmetadata', audio.duration);
      }
    };
    const onPlaying = () => emit('playing');

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('playing', onPlaying);

    this.detach = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('playing', onPlaying);
    };

    return token;
  }

  private stopElementOnly(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch {
        // ignore
      }
    }
    this.currentAudio = null;
  }

  /**
   * Play base64 WAV; returns promise of play() result.
   * On autoplay block, emits `blocked` with current token.
   */
  async playBase64(
    audioBase64: string,
    opts: { presentationId: string; sceneId: string; audioToken?: string },
  ): Promise<{ audio: HTMLAudioElement; token: string; blocked: boolean }> {
    this.stop();
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    const token = this.bindElement(audio, opts);
    try {
      await audio.play();
      return { audio, token, blocked: false };
    } catch {
      if (this.currentToken === token) {
        this.onEvent?.({
          type: 'blocked',
          presentationId: opts.presentationId,
          audioToken: token,
          sceneId: opts.sceneId,
        });
      }
      return { audio, token, blocked: true };
    }
  }
}
