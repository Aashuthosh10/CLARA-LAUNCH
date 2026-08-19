/**
 * Presentation Engine types — FSM, scenes, identity tokens, playback events.
 * Frontend-only; does not alter WebSocket or TTS generation contracts.
 */

export type PresentationEngineState =
  | 'IDLE'
  | 'LOADING_PLAN'
  | 'READY'
  | 'PLAYING_SCENE'
  | 'WAITING_FOR_AUDIO'
  | 'SCENE_COMPLETE'
  | 'PRESENTATION_COMPLETE'
  | 'CANCELLED';

export type TransitionPolicy = 'on_audio_end' | 'manual_only';

export type PresentationScene = {
  sceneId: string;
  presentationId: string;
  /** Stable meaning key — primary activation key for plan-backed presentations. */
  sectionId: string;
  /** Stable content identity for unit-backed presentations (M5.2 additive). */
  unitId?: string | null;
  cardId: string | null;
  cardIndex: number;
  spokenSummary: string;
  displayCaption: string;
  audioReference: string | null;
  estimatedDurationMs: number;
  transitionPolicy: TransitionPolicy;
  isLastScene: boolean;
};

export type PresentationSnapshot = {
  presentationId: string | null;
  engineState: PresentationEngineState;
  scenes: readonly PresentationScene[];
  sceneIndex: number;
  activeScene: PresentationScene | null;
  cardIndex: number;
  displayCaption: string;
  comparisonSection: number;
  audioToken: string | null;
};

export type NarrationPlanSegmentInput = {
  segmentId?: string;
  displayText?: string;
  ttsText?: string;
  cardIndex?: number | null;
  cardId?: string | null;
  isFinalSegment?: boolean;
  /** Stable meaning key for scene sync (CanonicalContent section id). */
  sectionId?: string | null;
  /** Stable content identity for unit-backed activation (M5.2 additive). */
  unitId?: string | null;
};

export type NarrationPlanInput = {
  turnId: string;
  mode?: string;
  segments: NarrationPlanSegmentInput[];
};

export type PlaybackEventType =
  | 'ended'
  | 'error'
  | 'blocked'
  | 'pause'
  | 'stalled'
  | 'loadedmetadata'
  | 'playing';

export type PresentationPlaybackEvent = {
  type: PlaybackEventType;
  presentationId: string;
  audioToken: string;
  sceneId: string;
  durationSec?: number;
};

export type PresentationListener = (snapshot: PresentationSnapshot) => void;

export type ComparisonSectionMapper = (scene: PresentationScene | null) => number;
