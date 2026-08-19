/**
 * Unit-backed manual navigation helpers.
 *
 * One TTS clip list (the existing stream queue) + a playhead.
 * Seek identifies the target by unitId (not sectionId).
 */

export type SeekableClip = {
  segmentKey: string;
  unitId?: string | null;
  chunkIndex?: number | null;
  sectionId?: string | null;
  segmentId?: string | null;
};

export type SeekableSegment = {
  unitId?: string | null;
  sectionId?: string | null;
  cardIndex?: number | null;
  segmentId?: string | null;
};

export function unitIdForCardIndex(
  segments: SeekableSegment[] | null | undefined,
  cardIndex: number,
): string | null {
  if (!Array.isArray(segments) || cardIndex < 0 || cardIndex >= segments.length) return null;
  const uid = segments[cardIndex]?.unitId;
  return typeof uid === 'string' && uid.trim() ? uid.trim() : null;
}

/** Find the clip that belongs to a target card/unit. -1 if not yet in the queue. */
export function findClipIndexForTarget(
  clips: SeekableClip[],
  target: { unitId?: string | null; cardIndex: number },
): number {
  const list = Array.isArray(clips) ? clips : [];
  const uid = typeof target.unitId === 'string' && target.unitId.trim() ? target.unitId.trim() : null;
  if (uid) {
    const byUnit = list.findIndex(
      (c) => typeof c.unitId === 'string' && c.unitId.trim() === uid,
    );
    if (byUnit >= 0) return byUnit;
  }
  const byChunk = list.findIndex(
    (c) => typeof c.chunkIndex === 'number' && c.chunkIndex === target.cardIndex,
  );
  return byChunk;
}

export function nextPlayheadAfterClip(currentPlayhead: number, queueLength: number): number {
  if (queueLength <= 0) return 0;
  return Math.min(queueLength, Math.max(0, currentPlayhead) + 1);
}

/** Keys that must be replayable after a seek (target clip and everything after it). */
export function segmentKeysFromPlayhead(clips: SeekableClip[], playhead: number): string[] {
  const list = Array.isArray(clips) ? clips : [];
  const start = Math.max(0, playhead);
  return list.slice(start).map((c) => c.segmentKey).filter((k) => typeof k === 'string' && k.length > 0);
}
