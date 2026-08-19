import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PresentationAudioManager } from './PresentationAudioManager';
import { PresentationEngine, type LoadPresentationArgs } from './PresentationEngine';
import type { PresentationScene, PresentationSnapshot } from './types';

const IDLE_SNAPSHOT: PresentationSnapshot = {
  presentationId: null,
  engineState: 'IDLE',
  scenes: [],
  sceneIndex: 0,
  activeScene: null,
  cardIndex: 0,
  displayCaption: '',
  comparisonSection: 0,
  audioToken: null,
};

/**
 * React bridge: subscribes to PresentationEngine; exposes derived view state.
 * Does not decide scene transitions or control TTS generation.
 */
export function usePresentationController() {
  const engineRef = useRef<PresentationEngine | null>(null);
  const audioRef = useRef<PresentationAudioManager | null>(null);
  if (!engineRef.current) engineRef.current = new PresentationEngine();
  if (!audioRef.current) audioRef.current = new PresentationAudioManager();

  const [snapshot, setSnapshot] = useState<PresentationSnapshot>(IDLE_SNAPSHOT);

  useEffect(() => {
    const engine = engineRef.current!;
    const audio = audioRef.current!;

    audio.setEventHandler((event) => {
      engine.onAudioEvent(event);
    });

    const unsub = engine.subscribe((snap) => {
      setSnapshot(snap);
    });

    return () => {
      unsub();
      audio.setEventHandler(null);
      engine.setPlayRequestHandler(null);
      engine.cancel();
      audio.stop();
    };
  }, []);

  const loadPresentation = useCallback((args: LoadPresentationArgs) => {
    audioRef.current?.stop();
    return engineRef.current!.loadPresentation(args);
  }, []);

  const play = useCallback(() => engineRef.current!.play(), []);

  const cancel = useCallback(() => {
    engineRef.current?.invalidateAudioToken();
    audioRef.current?.stop();
    engineRef.current?.cancel();
  }, []);

  const next = useCallback(() => {
    engineRef.current?.invalidateAudioToken();
    audioRef.current?.invalidate();
    if (audioRef.current?.audioElement) {
      try {
        audioRef.current.audioElement.pause();
      } catch {
        // ignore
      }
    }
    return engineRef.current!.next();
  }, []);

  const previous = useCallback(() => {
    engineRef.current?.invalidateAudioToken();
    audioRef.current?.invalidate();
    if (audioRef.current?.audioElement) {
      try {
        audioRef.current.audioElement.pause();
      } catch {
        // ignore
      }
    }
    return engineRef.current!.previous();
  }, []);

  const jumpToCardIndex = useCallback((cardIndex: number) => {
    engineRef.current?.invalidateAudioToken();
    audioRef.current?.invalidate();
    if (audioRef.current?.audioElement) {
      try {
        audioRef.current.audioElement.pause();
      } catch {
        // ignore
      }
    }
    return engineRef.current!.jumpToCardIndex(cardIndex);
  }, []);

  const activateBySegmentIndex = useCallback((segmentIndex: number, presentationId?: string) => {
    return engineRef.current!.activateBySegmentIndex(segmentIndex, presentationId);
  }, []);

  const activateBySectionId = useCallback((sectionId: string, presentationId?: string) => {
    return engineRef.current!.activateBySectionId(sectionId, presentationId);
  }, []);

  const activateByUnitId = useCallback((unitId: string, presentationId?: string) => {
    return engineRef.current!.activateByUnitId(unitId, presentationId);
  }, []);

  /**
   * Bind ChatScreen-created Audio to the engine for the active scene.
   * Call after constructing the element and before play().
   */
  const bindPlaybackAudio = useCallback(
    (
      audio: HTMLAudioElement,
      opts?: { scene?: PresentationScene | null; presentationId?: string | null },
    ): string | null => {
      const engine = engineRef.current!;
      const audioMgr = audioRef.current!;
      const snap = engine.snapshot();
      const presentationId = opts?.presentationId ?? snap.presentationId;
      const scene = opts?.scene ?? snap.activeScene;
      if (!presentationId || !scene) return null;

      // Ensure scene matches presentation
      if (scene.presentationId !== presentationId) return null;

      const token = engine.beginAudioBind(presentationId, scene.sceneId);
      if (!token) return null;
      audioMgr.bindElement(audio, {
        presentationId,
        sceneId: scene.sceneId,
        audioToken: token,
      });
      return token;
    },
    [],
  );

  const setPlayRequestHandler = useCallback(
    (handler: ((scene: PresentationScene, presentationId: string) => void) | null) => {
      engineRef.current?.setPlayRequestHandler(handler);
    },
    [],
  );

  const setSceneAdvanceMode = useCallback((mode: 'per_clip' | 'shared_clip') => {
    engineRef.current?.setSceneAdvanceMode(mode);
  }, []);

  const isPresenting = useMemo(() => {
    const s = snapshot.engineState;
    return (
      s === 'READY' ||
      s === 'PLAYING_SCENE' ||
      s === 'WAITING_FOR_AUDIO' ||
      s === 'SCENE_COMPLETE' ||
      s === 'LOADING_PLAN'
    );
  }, [snapshot.engineState]);

  return {
    snapshot,
    isPresenting,
    presentationId: snapshot.presentationId,
    engineState: snapshot.engineState,
    currentCardIdx: snapshot.cardIndex,
    narrationCaption: snapshot.displayCaption,
    comparisonSection: snapshot.comparisonSection,
    activeScene: snapshot.activeScene,
    loadPresentation,
    play,
    cancel,
    next,
    previous,
    jumpToCardIndex,
    activateBySegmentIndex,
    activateBySectionId,
    activateByUnitId,
    bindPlaybackAudio,
    setPlayRequestHandler,
    setSceneAdvanceMode,
    engine: engineRef,
    audioManager: audioRef,
  };
}

export type PresentationControllerApi = ReturnType<typeof usePresentationController>;
