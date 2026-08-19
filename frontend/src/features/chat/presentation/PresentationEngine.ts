import { mintAudioToken, mintPresentationId, mapSceneToComparisonSection } from './planToScenes';
import type {
  NarrationPlanInput,
  PresentationEngineState,
  PresentationListener,
  PresentationPlaybackEvent,
  PresentationScene,
  PresentationSnapshot,
} from './types';
import { cardsToScenes, planToScenes, singleScenePresentation } from './planToScenes';

type TransitionTable = Partial<
  Record<PresentationEngineState, Partial<Record<PresentationEngineState, true>>>
>;

/** Legal FSM edges (from → to). */
const LEGAL: TransitionTable = {
  IDLE: { LOADING_PLAN: true },
  LOADING_PLAN: { READY: true, PRESENTATION_COMPLETE: true, CANCELLED: true, IDLE: true },
  READY: { PLAYING_SCENE: true, WAITING_FOR_AUDIO: true, CANCELLED: true },
  PLAYING_SCENE: {
    WAITING_FOR_AUDIO: true,
    SCENE_COMPLETE: true,
    CANCELLED: true,
    PLAYING_SCENE: true, // re-activate / jump within play
  },
  WAITING_FOR_AUDIO: {
    PLAYING_SCENE: true,
    SCENE_COMPLETE: true,
    CANCELLED: true,
  },
  SCENE_COMPLETE: {
    PLAYING_SCENE: true,
    WAITING_FOR_AUDIO: true,
    PRESENTATION_COMPLETE: true,
    CANCELLED: true,
  },
  PRESENTATION_COMPLETE: { LOADING_PLAN: true, CANCELLED: true, IDLE: true },
  CANCELLED: { LOADING_PLAN: true, IDLE: true },
};

export type LoadPresentationArgs =
  | {
      kind: 'plan';
      plan: NarrationPlanInput;
      estimatedTotalDurationMs?: number | null;
    }
  | {
      kind: 'cards';
      cards: unknown[];
      turnId: string;
      estimatedTotalDurationMs?: number | null;
    }
  | {
      kind: 'single';
      turnId: string;
      cardId: string;
      caption?: string;
      spokenSummary?: string;
      estimatedDurationMs?: number;
    };

/**
 * Sole authority for presentation scene / card / caption transitions.
 * Does not generate TTS or touch React/DOM audio.
 */
export class PresentationEngine {
  private engineState: PresentationEngineState = 'IDLE';
  private presentationId: string | null = null;
  private scenes: PresentationScene[] = [];
  private sceneIndex = 0;
  private audioToken: string | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<PresentationListener>();
  private pendingPlayRequest: ((scene: PresentationScene, presentationId: string) => void) | null =
    null;
  /**
   * `per_clip` (default): each audio end completes the scene; next scene starts when
   * ChatScreen calls activateBySectionId for the next streamed chunk.
   * `shared_clip`: one WAV spans many scenes; estimatedDurationMs fallback advances
   * card/caption without stopping audio; real audio end completes the presentation.
   */
  private sceneAdvanceMode: 'per_clip' | 'shared_clip' = 'per_clip';

  /** Optional hook: ChatScreen / audio layer should start the clip for this scene. */
  setPlayRequestHandler(
    handler: ((scene: PresentationScene, presentationId: string) => void) | null,
  ): void {
    this.pendingPlayRequest = handler;
  }

  setSceneAdvanceMode(mode: 'per_clip' | 'shared_clip'): void {
    this.sceneAdvanceMode = mode;
  }

  subscribe(listener: PresentationListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  get state(): PresentationEngineState {
    return this.engineState;
  }

  get currentPresentationId(): string | null {
    return this.presentationId;
  }

  get currentAudioToken(): string | null {
    return this.audioToken;
  }

  snapshot(): PresentationSnapshot {
    const active = this.scenes[this.sceneIndex] ?? null;
    return {
      presentationId: this.presentationId,
      engineState: this.engineState,
      scenes: this.scenes,
      sceneIndex: this.sceneIndex,
      activeScene: active,
      cardIndex: active?.cardIndex ?? 0,
      displayCaption: active?.displayCaption ?? '',
      comparisonSection: mapSceneToComparisonSection(active),
      audioToken: this.audioToken,
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    this.listeners.forEach((l) => {
      try {
        l(snap);
      } catch {
        // listeners must not break the engine
      }
    });
  }

  private transition(to: PresentationEngineState, reason: string): boolean {
    const from = this.engineState;
    if (from === to) return true;
    if (!LEGAL[from]?.[to]) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[PresentationEngine] illegal transition ignored', { from, to, reason });
      }
      return false;
    }
    this.engineState = to;
    return true;
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  /** Invalidate audio ownership so stale ended callbacks cannot advance scenes. */
  invalidateAudioToken(): void {
    this.clearFallbackTimer();
    this.audioToken = null;
  }

  private ownsPresentation(id: string | null | undefined): boolean {
    return Boolean(id && this.presentationId && id === this.presentationId);
  }

  private ownsAudio(token: string | null | undefined): boolean {
    return Boolean(token && this.audioToken && token === this.audioToken);
  }

  cancel(): void {
    this.invalidateAudioToken();
    const from = this.engineState;
    if (from === 'IDLE') {
      this.scenes = [];
      this.sceneIndex = 0;
      this.presentationId = null;
      this.emit();
      return;
    }
    if (
      from === 'CANCELLED' ||
      from === 'PRESENTATION_COMPLETE' ||
      from === 'LOADING_PLAN' ||
      from === 'READY' ||
      from === 'PLAYING_SCENE' ||
      from === 'WAITING_FOR_AUDIO' ||
      from === 'SCENE_COMPLETE'
    ) {
      this.transition('CANCELLED', 'cancel');
    }
    this.scenes = [];
    this.sceneIndex = 0;
    // Normalize to IDLE after dispose so next load is clean.
    this.transition('IDLE', 'cancel_dispose');
    this.presentationId = null;
    this.emit();
  }

  loadPresentation(args: LoadPresentationArgs): string {
    // Atomic replace: drop prior presentation first.
    if (this.engineState !== 'IDLE' && this.engineState !== 'CANCELLED') {
      this.invalidateAudioToken();
      this.transition('CANCELLED', 'replace');
    }
    if (this.engineState === 'CANCELLED' || this.engineState === 'PRESENTATION_COMPLETE') {
      this.transition('IDLE', 'reset_before_load');
    }

    if (!this.transition('LOADING_PLAN', 'loadPresentation')) {
      // Force from IDLE
      this.engineState = 'IDLE';
      this.transition('LOADING_PLAN', 'loadPresentation_retry');
    }

    const presentationId = mintPresentationId();
    this.presentationId = presentationId;
    this.sceneIndex = 0;

    let scenes: PresentationScene[] = [];
    if (args.kind === 'plan') {
      scenes = planToScenes(args.plan, presentationId, {
        estimatedTotalDurationMs: args.estimatedTotalDurationMs,
      });
    } else if (args.kind === 'cards') {
      scenes = cardsToScenes(args.cards, presentationId, args.turnId, {
        estimatedTotalDurationMs: args.estimatedTotalDurationMs,
      });
    } else {
      scenes = singleScenePresentation(presentationId, args);
    }

    this.scenes = scenes;

    if (!scenes.length) {
      this.transition('PRESENTATION_COMPLETE', 'zero_scenes');
      this.emit();
      return presentationId;
    }

    this.transition('READY', 'load_success');
    this.emitDiag('PRESENTATION_STARTED', {
      presentationId,
      sectionIds: scenes.map((s) => s.sectionId),
      sceneCount: scenes.length,
    });
    this.emit();
    return presentationId;
  }

  play(): boolean {
    if (this.engineState !== 'READY' && this.engineState !== 'SCENE_COMPLETE') {
      if (this.engineState === 'PLAYING_SCENE' || this.engineState === 'WAITING_FOR_AUDIO') {
        return true;
      }
      return false;
    }
    return this.activateSceneAt(this.sceneIndex, 'play');
  }

  next(): boolean {
    if (!this.presentationId) return false;
    if (
      this.engineState !== 'PLAYING_SCENE' &&
      this.engineState !== 'WAITING_FOR_AUDIO' &&
      this.engineState !== 'SCENE_COMPLETE' &&
      this.engineState !== 'READY'
    ) {
      return false;
    }
    const nextIdx = Math.min(this.scenes.length - 1, this.sceneIndex + 1);
    if (nextIdx === this.sceneIndex && this.scenes[nextIdx]?.isLastScene) {
      this.invalidateAudioToken();
      this.transition('SCENE_COMPLETE', 'next_at_end');
      this.transition('PRESENTATION_COMPLETE', 'next_complete');
      this.emit();
      return true;
    }
    return this.activateSceneAt(nextIdx, 'next');
  }

  previous(): boolean {
    if (!this.presentationId) return false;
    if (
      this.engineState !== 'PLAYING_SCENE' &&
      this.engineState !== 'WAITING_FOR_AUDIO' &&
      this.engineState !== 'SCENE_COMPLETE' &&
      this.engineState !== 'READY'
    ) {
      return false;
    }
    const prevIdx = Math.max(0, this.sceneIndex - 1);
    return this.activateSceneAt(prevIdx, 'previous');
  }

  jump(sceneId: string): boolean {
    if (!this.presentationId) return false;
    const idx = this.scenes.findIndex((s) => s.sceneId === sceneId);
    if (idx < 0) return false;
    return this.activateSceneAt(idx, 'jump');
  }

  jumpToCardIndex(cardIndex: number): boolean {
    if (!this.presentationId || !this.scenes.length) return false;
    const idx = this.scenes.findIndex((s) => s.cardIndex === cardIndex);
    const target = idx >= 0 ? idx : Math.max(0, Math.min(this.scenes.length - 1, cardIndex));
    return this.activateSceneAt(target, 'jumpToCardIndex');
  }

  /**
   * Activate scene by canonical section_id (meaning key).
   * Auto-playback must not use array position — only section identity.
   */
  activateBySectionId(sectionId: string, presentationId?: string): boolean {
    if (presentationId && !this.ownsPresentation(presentationId)) return false;
    if (!this.presentationId || !this.scenes.length) return false;
    const sid = (sectionId || '').trim();
    if (!sid) return false;

    const idx = this.scenes.findIndex((s) => (s.sectionId || '').trim() === sid);
    if (idx < 0) {
      this.emitDiag('SCENE_ACTIVATE_REJECTED', { sectionId: sid, reason: 'unknown_section' });
      return false;
    }

    const active = this.scenes[this.sceneIndex];
    if (
      idx === this.sceneIndex &&
      (this.engineState === 'PLAYING_SCENE' ||
        this.engineState === 'WAITING_FOR_AUDIO' ||
        this.engineState === 'READY')
    ) {
      this.emitDiag('SCENE_ENTERED', {
        sectionId: sid,
        segmentId: active?.sceneId,
        sceneIndex: this.sceneIndex,
      });
      this.emitDiag('SEGMENT_STARTED', {
        sectionId: sid,
        segmentId: active?.sceneId,
        sceneIndex: this.sceneIndex,
      });
      return true;
    }

    // Order guard for auto-playback (per_clip): only same, next, or first on READY.
    if (this.sceneAdvanceMode === 'per_clip') {
      const allowed =
        idx === this.sceneIndex ||
        idx === this.sceneIndex + 1 ||
        (this.engineState === 'READY' && idx === 0);
      if (!allowed) {
        this.emitDiag('SCENE_ACTIVATE_REJECTED', {
          sectionId: sid,
          reason: 'out_of_order',
          requestedIndex: idx,
          currentIndex: this.sceneIndex,
        });
        return false;
      }
    }

    const ok = this.activateSceneAt(idx, 'section');
    if (ok) {
      const scene = this.scenes[idx];
      this.emitDiag('SCENE_ENTERED', {
        sectionId: sid,
        segmentId: scene?.sceneId,
        sceneIndex: idx,
      });
      this.emitDiag('SEGMENT_STARTED', {
        sectionId: sid,
        segmentId: scene?.sceneId,
        sceneIndex: idx,
      });
    }
    return ok;
  }

  /**
   * Activate scene by canonical unit identity (M5.2).
   * Unit-backed presentations may repeat `sectionId`, so `unitId` becomes the primary key.
   */
  activateByUnitId(unitId: string, presentationId?: string): boolean {
    if (presentationId && !this.ownsPresentation(presentationId)) return false;
    if (!this.presentationId || !this.scenes.length) return false;
    const uid = (unitId || '').trim();
    if (!uid) return false;

    const idx = this.scenes.findIndex((s) => (s.unitId || '').trim() === uid);
    if (idx < 0) {
      this.emitDiag('SCENE_ACTIVATE_REJECTED', { unitId: uid, reason: 'unknown_unit' });
      return false;
    }

    const active = this.scenes[this.sceneIndex];
    if (
      idx === this.sceneIndex &&
      (this.engineState === 'PLAYING_SCENE' ||
        this.engineState === 'WAITING_FOR_AUDIO' ||
        this.engineState === 'READY')
    ) {
      this.emitDiag('SCENE_ENTERED', {
        unitId: uid,
        segmentId: active?.sceneId,
        sceneIndex: this.sceneIndex,
      });
      return true;
    }

    // Order guard for auto-playback (per_clip): only same, next, or first on READY.
    if (this.sceneAdvanceMode === 'per_clip') {
      const allowed =
        idx === this.sceneIndex ||
        idx === this.sceneIndex + 1 ||
        (this.engineState === 'READY' && idx === 0);
      if (!allowed) {
        this.emitDiag('SCENE_ACTIVATE_REJECTED', {
          unitId: uid,
          reason: 'out_of_order',
          requestedIndex: idx,
          currentIndex: this.sceneIndex,
        });
        return false;
      }
    }

    const ok = this.activateSceneAt(idx, 'unit');
    if (ok) {
      const scene = this.scenes[idx];
      this.emitDiag('SCENE_ENTERED', {
        unitId: uid,
        segmentId: scene?.sceneId,
        sceneIndex: idx,
      });
    }
    return ok;
  }

  /**
   * Thin wrapper: resolve segment index → sectionId, then activate by meaning.
   * Prefer activateBySectionId for auto-playback.
   */
  activateBySegmentIndex(segmentIndex: number, presentationId?: string): boolean {
    if (presentationId && !this.ownsPresentation(presentationId)) return false;
    if (!this.presentationId || !this.scenes.length) return false;
    const idx = Math.max(0, Math.min(this.scenes.length - 1, Math.floor(segmentIndex)));
    const sectionId = this.scenes[idx]?.sectionId;
    if (sectionId) {
      return this.activateBySectionId(sectionId, presentationId);
    }
    if (
      idx === this.sceneIndex &&
      (this.engineState === 'PLAYING_SCENE' || this.engineState === 'WAITING_FOR_AUDIO')
    ) {
      return true;
    }
    return this.activateSceneAt(idx, 'segment');
  }

  /**
   * Bind a new audio token for the active scene (called when playback actually starts).
   * Returns the token for PresentationAudioManager.
   */
  beginAudioBind(presentationId: string, sceneId: string): string | null {
    if (!this.ownsPresentation(presentationId)) return null;
    const active = this.scenes[this.sceneIndex];
    if (!active || active.sceneId !== sceneId) return null;
    this.clearFallbackTimer();
    const token = mintAudioToken();
    this.audioToken = token;
    if (this.engineState === 'WAITING_FOR_AUDIO' || this.engineState === 'READY') {
      this.transition('PLAYING_SCENE', 'audio_bound');
    } else if (this.engineState === 'PLAYING_SCENE') {
      // token refresh mid-scene (rebind)
    } else {
      this.transition('WAITING_FOR_AUDIO', 'audio_bind_wait');
      this.transition('PLAYING_SCENE', 'audio_bound');
    }
    this.scheduleFallbackIfNeeded(active, token);
    this.emit();
    return token;
  }

  onAudioEvent(event: PresentationPlaybackEvent): void {
    if (!this.ownsPresentation(event.presentationId)) return;
    if (!this.ownsAudio(event.audioToken)) return;

    const active = this.scenes[this.sceneIndex];
    if (!active || active.sceneId !== event.sceneId) return;

    if (event.type === 'stalled' || event.type === 'pause' || event.type === 'loadedmetadata') {
      // Stay in PLAYING/WAITING — no scene advance.
      if (event.type === 'loadedmetadata' && typeof event.durationSec === 'number' && event.durationSec > 0) {
        // Refresh fallback using real duration when estimate was crude.
        this.scheduleFallbackIfNeeded(
          { ...active, estimatedDurationMs: Math.max(400, Math.floor(event.durationSec * 1000)) },
          event.audioToken,
        );
      }
      return;
    }

    if (event.type === 'playing') {
      if (this.engineState === 'WAITING_FOR_AUDIO') {
        this.transition('PLAYING_SCENE', 'playing');
        this.emit();
      }
      return;
    }

    if (event.type === 'ended' || event.type === 'error' || event.type === 'blocked') {
      this.handleSceneAudioFinished(event.audioToken, false);
    }
  }

  private scheduleFallbackIfNeeded(scene: PresentationScene, token: string): void {
    this.clearFallbackTimer();
    // Primary advance is audio ended. Fallback timers only for shared-clip multi-scene.
    if (this.sceneAdvanceMode !== 'shared_clip') return;
    if (scene.transitionPolicy === 'manual_only') return;
    const ms = Math.max(800, scene.estimatedDurationMs || 2500);
    const presentationId = this.presentationId;
    const sceneId = scene.sceneId;
    this.fallbackTimer = setTimeout(() => {
      this.fallbackTimer = null;
      if (!this.ownsPresentation(presentationId)) return;
      if (!this.ownsAudio(token)) return;
      const cur = this.scenes[this.sceneIndex];
      if (!cur || cur.sceneId !== sceneId) return;
      if (this.engineState !== 'PLAYING_SCENE' && this.engineState !== 'WAITING_FOR_AUDIO') return;
      this.handleSceneAudioFinished(token, true);
    }, ms);
  }

  /**
   * Shared-clip: duration fallback advances card/caption without stopping audio.
   * Per-clip: real audio end completes the scene (next clip activates the next scene).
   */
  private handleSceneAudioFinished(token: string, fromFallback = false): void {
    if (!this.ownsAudio(token)) return;

    const active = this.scenes[this.sceneIndex];
    if (!active) {
      this.clearFallbackTimer();
      this.audioToken = null;
      this.transition('SCENE_COMPLETE', 'audio_finished');
      this.transition('PRESENTATION_COMPLETE', 'no_active');
      this.emit();
      return;
    }

    // Shared-clip fallback tick: advance visuals only.
    if (
      fromFallback &&
      this.sceneAdvanceMode === 'shared_clip' &&
      !active.isLastScene &&
      this.sceneIndex < this.scenes.length - 1
    ) {
      this.clearFallbackTimer();
      this.sceneIndex += 1;
      const next = this.scenes[this.sceneIndex];
      if (next && this.ownsAudio(token)) {
        this.scheduleFallbackIfNeeded(next, token);
      }
      this.emit();
      return;
    }

    this.clearFallbackTimer();
    this.audioToken = null;

    const finishedSection = active.sectionId;
    const finishedSegment = active.sceneId;
    this.emitDiag('SEGMENT_FINISHED', {
      sectionId: finishedSection,
      segmentId: finishedSegment,
      sceneIndex: this.sceneIndex,
    });
    this.emitDiag('SCENE_EXITED', {
      sectionId: finishedSection,
      segmentId: finishedSegment,
      sceneIndex: this.sceneIndex,
    });

    if (!this.transition('SCENE_COMPLETE', 'audio_finished')) {
      return;
    }
    this.emit();

    if (
      this.sceneAdvanceMode === 'shared_clip' ||
      active.isLastScene ||
      this.sceneIndex >= this.scenes.length - 1
    ) {
      this.transition('PRESENTATION_COMPLETE', 'last_or_shared_end');
      this.emitDiag('PRESENTATION_COMPLETED', {
        sectionId: finishedSection,
        presentationId: this.presentationId,
      });
      this.emit();
    }
    // per_clip + more scenes: stay SCENE_COMPLETE until activateBySectionId / jump.
  }

  private emitDiag(event: string, fields: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[PresentationEngine] ${event}`, fields);
    }
  }

  private activateSceneAt(index: number, reason: string): boolean {
    if (!this.presentationId || !this.scenes.length) return false;
    const idx = Math.max(0, Math.min(this.scenes.length - 1, index));
    const scene = this.scenes[idx];
    if (!scene) return false;

    this.invalidateAudioToken();
    this.sceneIndex = idx;

    // From SCENE_COMPLETE / READY / PLAYING → WAITING then notify play
    if (this.engineState === 'SCENE_COMPLETE' || this.engineState === 'READY') {
      this.transition('WAITING_FOR_AUDIO', reason);
    } else if (this.engineState === 'PLAYING_SCENE' || this.engineState === 'WAITING_FOR_AUDIO') {
      this.transition('WAITING_FOR_AUDIO', reason);
    } else if (this.engineState === 'IDLE' || this.engineState === 'CANCELLED') {
      return false;
    }

    this.emit();
    this.pendingPlayRequest?.(scene, this.presentationId);
    return true;
  }
}
