export type TtsClipStatus = 'PENDING' | 'PLAYABLE' | 'FAILED' | 'CANCELLED' | 'COMPLETED';

export type TtsClipSlot = {
  turnId: string;
  unitId: string | null;
  segmentIndex: number;
  status: TtsClipStatus;
  audioBase64?: string;
  error?: string;
};

export function isUnitBackedNarrationPlan(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const plan = (payload as { narration_plan?: unknown }).narration_plan;
  if (!plan || typeof plan !== 'object') return false;
  const mode = (plan as { mode?: unknown }).mode;
  if (mode !== 'card_narration') return false;
  const segs = (plan as { segments?: unknown }).segments;
  if (!Array.isArray(segs)) return false;
  return segs.some(
    (s) =>
      s &&
      typeof s === 'object' &&
      typeof (s as { unitId?: unknown }).unitId === 'string' &&
      String((s as { unitId: string }).unitId).trim().length > 0,
  );
}

export function unitIdFromPlanSegment(payload: unknown, segmentIndex: number): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const plan = (payload as { narration_plan?: unknown }).narration_plan;
  if (!plan || typeof plan !== 'object') return null;
  const segs = (plan as { segments?: unknown }).segments;
  if (!Array.isArray(segs)) return null;
  const seg = segs[segmentIndex];
  if (!seg || typeof seg !== 'object') return null;
  const uid = (seg as { unitId?: unknown }).unitId;
  return typeof uid === 'string' && uid.trim() ? uid.trim() : null;
}

function isTerminalSpeechStatus(status: TtsClipStatus): boolean {
  return status === 'CANCELLED' || status === 'COMPLETED' || status === 'FAILED';
}

/** Merge one wire frame into a sparse slot list. Holes stay PENDING. Late audio for CANCELLED is ignored. */
export function mergeTtsClipSlot(
  slots: TtsClipSlot[],
  incoming: {
    turnId: string;
    segmentIndex: number;
    audioBase64?: string | null;
    audioUnavailable?: boolean;
    unitId?: string | null;
  },
): TtsClipSlot[] {
  const index = incoming.segmentIndex;
  if (!Number.isInteger(index) || index < 0) return slots;

  const next = slots.slice();
  while (next.length <= index) {
    next.push({
      turnId: incoming.turnId,
      unitId: null,
      segmentIndex: next.length,
      status: 'PENDING',
    });
  }

  const existing = next[index]!;
  if (existing.turnId && existing.turnId !== incoming.turnId) {
    return slots;
  }
  if (isTerminalSpeechStatus(existing.status)) {
    return next;
  }

  const audio =
    typeof incoming.audioBase64 === 'string' && incoming.audioBase64.length > 0
      ? incoming.audioBase64
      : undefined;
  const failed = incoming.audioUnavailable === true || !audio;
  next[index] = {
    turnId: incoming.turnId,
    unitId: incoming.unitId ?? existing.unitId,
    segmentIndex: index,
    status: failed ? 'FAILED' : 'PLAYABLE',
    audioBase64: audio,
    error: failed ? 'audioUnavailable' : undefined,
  };
  return next;
}

/** FAILED occupies the index; length does not shrink. */
export function clipSlotCount(slots: TtsClipSlot[]): number {
  return slots.length;
}

export function markClipCompleted(slots: TtsClipSlot[], segmentIndex: number): TtsClipSlot[] {
  if (segmentIndex < 0 || segmentIndex >= slots.length) return slots;
  const next = slots.slice();
  const cur = next[segmentIndex];
  if (!cur) return slots;
  next[segmentIndex] = { ...cur, status: 'COMPLETED' };
  return next;
}

/**
 * After a FAILED (or already COMPLETED) slot, move playhead to the next
 * PLAYABLE/FAILED/PENDING clip. Length is unchanged.
 */
export function advancePlayheadAfterSlot(
  slots: TtsClipSlot[],
  playhead: number,
): { playhead: number; next: TtsClipSlot | null; reachedEnd: boolean } {
  const nextIndex = playhead + 1;
  if (nextIndex >= slots.length) {
    return { playhead: nextIndex, next: null, reachedEnd: true };
  }
  return {
    playhead: nextIndex,
    next: slots[nextIndex] ?? null,
    reachedEnd: false,
  };
}

export function shouldIgnoreLateClip(opts: {
  clipTurnId: string;
  activeTurnId: string | null | undefined;
  clipStatus: TtsClipStatus;
  playbackGen: number;
  startedGen: number;
}): boolean {
  if (opts.startedGen !== opts.playbackGen) return true;
  if (opts.clipStatus === 'CANCELLED') return true;
  const active = (opts.activeTurnId || '').trim();
  if (active && opts.clipTurnId && opts.clipTurnId !== active) return true;
  return false;
}
