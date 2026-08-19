/**
 * Authoritative response-TTS scheduler.
 * ACK/earcon playback must never call these methods.
 */

import { playbackWatchdogMs, validateTtsAudioBase64 } from './audioValidation';

export type ResponseTtsClipStatus =
  | 'PENDING'
  | 'READY'
  | 'PLAYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ResponseTtsPhase =
  | 'IDLE'
  | 'PENDING'
  | 'GENERATING'
  | 'READY'
  | 'PLAYING'
  | 'COMPLETED'
  | 'FAILED';

export type ResponseTtsCompleteSource = 'response-ended' | 'response-error' | 'watchdog';

export type ResponseTtsClip = {
  sequence: number;
  turnId: string;
  audioBase64: string;
  segmentKey: string;
  unitId: string | null;
  sectionId: string | null;
  segmentId: string | null;
  isOverview: boolean;
  cardsToSync: unknown[] | null;
  totalDurationEstimateMs: number | null;
  status: ResponseTtsClipStatus;
  decodedBytes: number;
  durationMs: number | null;
  watchdogMs: number;
};

export type ResponseTtsSnapshot = {
  turnId: string | null;
  phase: ResponseTtsPhase;
  playhead: number;
  expectedCount: number | null;
  clips: ResponseTtsClip[];
};

export type IngestClipInput = {
  turnId: string;
  sequence: number;
  audioBase64?: string | null;
  audioUnavailable?: boolean;
  unitId?: string | null;
  sectionId?: string | null;
  segmentId?: string | null;
  isOverview?: boolean;
  cardsToSync?: unknown[] | null;
  totalDurationEstimateMs?: number | null;
  segmentKey?: string;
};

function terminal(status: ResponseTtsClipStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}

export function createResponseTtsScheduler() {
  let turnId: string | null = null;
  let phase: ResponseTtsPhase = 'IDLE';
  let playhead = 0;
  let expectedCount: number | null = null;
  let clips: ResponseTtsClip[] = [];

  const snapshot = (): ResponseTtsSnapshot => ({
    turnId,
    phase,
    playhead,
    expectedCount,
    clips: clips.map((c) => ({ ...c })),
  });

  const refreshPhase = () => {
    if (!turnId) {
      phase = 'IDLE';
      return;
    }
    if (clips.length === 0) {
      phase = expectedCount === 0 ? 'FAILED' : 'GENERATING';
      return;
    }
    const anyPlaying = clips.some((c) => c.status === 'PLAYING');
    if (anyPlaying) {
      phase = 'PLAYING';
      return;
    }
    const requiredForTerminal = expectedCount ?? clips.length;
    const allTerminal =
      requiredForTerminal > 0 &&
      clips.length >= requiredForTerminal &&
      clips.slice(0, requiredForTerminal).every((c) => terminal(c.status));
    if (allTerminal) {
      const anyPlayed = clips.some((c) => c.status === 'COMPLETED');
      phase = anyPlayed ? 'COMPLETED' : 'FAILED';
      return;
    }
    const required = expectedCount ?? clips.length;
    const readyOrTerminal = clips
      .slice(0, required)
      .filter((c) => c && (c.status === 'READY' || terminal(c.status)));
    const hasReady = clips.some((c) => c.status === 'READY');
    if (readyOrTerminal.length >= required && hasReady) {
      phase = 'READY';
      return;
    }
    phase = 'GENERATING';
  };

  const beginTurn = (nextTurnId: string) => {
    const tid = nextTurnId.trim();
    if (!tid) return snapshot();
    turnId = tid;
    phase = 'PENDING';
    playhead = 0;
    expectedCount = null;
    clips = [];
    return snapshot();
  };

  const cancel = () => {
    clips = clips.map((c) =>
      terminal(c.status) ? c : { ...c, status: 'CANCELLED' as const },
    );
    playhead = clips.length;
    phase = turnId ? 'COMPLETED' : 'IDLE';
    return snapshot();
  };

  const reset = () => {
    turnId = null;
    phase = 'IDLE';
    playhead = 0;
    expectedCount = null;
    clips = [];
    return snapshot();
  };

  const setExpectedCount = (count: number) => {
    if (!Number.isInteger(count) || count < 0) return snapshot();
    expectedCount = count;
    while (clips.length < count) {
      clips.push({
        sequence: clips.length,
        turnId: turnId || '',
        audioBase64: '',
        segmentKey: `${turnId || 'na'}|pending|${clips.length}`,
        unitId: null,
        sectionId: null,
        segmentId: null,
        isOverview: false,
        cardsToSync: null,
        totalDurationEstimateMs: null,
        status: 'PENDING',
        decodedBytes: 0,
        durationMs: null,
        watchdogMs: playbackWatchdogMs(null),
      });
    }
    refreshPhase();
    return snapshot();
  };

  const ingestClip = (input: IngestClipInput): ResponseTtsSnapshot => {
    const incomingTurn = input.turnId.trim();
    if (!incomingTurn) return snapshot();
    if (turnId && incomingTurn !== turnId) return snapshot();
    if (!turnId) beginTurn(incomingTurn);
    const sequence = input.sequence;
    if (!Number.isInteger(sequence) || sequence < 0) return snapshot();

    while (clips.length <= sequence) {
      clips.push({
        sequence: clips.length,
        turnId: incomingTurn,
        audioBase64: '',
        segmentKey: `${incomingTurn}|pending|${clips.length}`,
        unitId: null,
        sectionId: null,
        segmentId: null,
        isOverview: false,
        cardsToSync: null,
        totalDurationEstimateMs: null,
        status: 'PENDING',
        decodedBytes: 0,
        durationMs: null,
        watchdogMs: playbackWatchdogMs(null),
      });
    }

    const existing = clips[sequence]!;
    if (terminal(existing.status) || existing.status === 'PLAYING' || existing.status === 'READY') {
      refreshPhase();
      return snapshot();
    }

    const failed = input.audioUnavailable === true;
    const validation = failed
      ? ({ ok: false, reason: 'empty' } as const)
      : validateTtsAudioBase64(input.audioBase64);
    const segmentKey =
      input.segmentKey ||
      `${incomingTurn}|tts|${sequence}|${typeof input.audioBase64 === 'string' ? input.audioBase64.length : 0}`;

    clips[sequence] = {
      sequence,
      turnId: incomingTurn,
      audioBase64: validation.ok ? String(input.audioBase64) : '',
      segmentKey,
      unitId: input.unitId?.trim() || existing.unitId,
      sectionId: input.sectionId?.trim() || existing.sectionId,
      segmentId: input.segmentId?.trim() || existing.segmentId,
      isOverview: Boolean(input.isOverview),
      cardsToSync: input.cardsToSync ?? existing.cardsToSync,
      totalDurationEstimateMs: input.totalDurationEstimateMs ?? existing.totalDurationEstimateMs,
      status: validation.ok ? 'READY' : 'FAILED',
      decodedBytes: validation.ok ? validation.decodedBytes : 0,
      durationMs: validation.ok ? validation.durationMs : null,
      watchdogMs: playbackWatchdogMs(validation.ok ? validation.durationMs : null),
    };
    refreshPhase();
    return snapshot();
  };

  const isPresentationReady = (): boolean => {
    if (!turnId) return false;
    const required = expectedCount ?? (clips.length > 0 ? clips.length : null);
    if (required === null || required <= 0) return false;
    if (clips.length < required) return false;
    const slice = clips.slice(0, required);
    if (slice.some((c) => c.status === 'PENDING')) return false;
    return slice.some((c) => c.status === 'READY' || c.status === 'PLAYING' || c.status === 'COMPLETED');
  };

  const nextPlayable = (): ResponseTtsClip | null => {
    for (let i = playhead; i < clips.length; i += 1) {
      const clip = clips[i];
      if (!clip) continue;
      if (clip.status === 'READY') {
        playhead = i;
        return clip;
      }
      if (clip.status === 'PENDING') return null;
      if (clip.status === 'PLAYING') return clip;
    }
    return null;
  };

  const markPlaying = (sequence: number): ResponseTtsClip | null => {
    const clip = clips[sequence];
    if (!clip || clip.turnId !== turnId) return null;
    if (clip.status !== 'READY' && clip.status !== 'PLAYING') return null;
    playhead = sequence;
    clips[sequence] = { ...clip, status: 'PLAYING' };
    phase = 'PLAYING';
    return clips[sequence]!;
  };

  const completeClip = (
    sequence: number,
    source: ResponseTtsCompleteSource,
  ): ResponseTtsSnapshot => {
    const clip = clips[sequence];
    if (!clip || clip.turnId !== turnId) return snapshot();
    if (clip.status !== 'PLAYING' && clip.status !== 'READY') return snapshot();
    const nextStatus: ResponseTtsClipStatus =
      source === 'response-ended' ? 'COMPLETED' : 'FAILED';
    clips[sequence] = { ...clip, status: nextStatus };
    playhead = sequence + 1;
    refreshPhase();
    return snapshot();
  };

  /** ACK and any other non-scheduler caller must not use this. */
  const ignoreNonResponseComplete = (): ResponseTtsSnapshot => snapshot();

  return {
    snapshot,
    beginTurn,
    cancel,
    reset,
    setExpectedCount,
    ingestClip,
    isPresentationReady,
    nextPlayable,
    markPlaying,
    completeClip,
    ignoreNonResponseComplete,
    get playhead() {
      return playhead;
    },
    get phase() {
      return phase;
    },
    get turnId() {
      return turnId;
    },
  };
}

export type ResponseTtsScheduler = ReturnType<typeof createResponseTtsScheduler>;
