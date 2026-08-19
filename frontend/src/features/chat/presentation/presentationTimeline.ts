/**
 * Frontend PresentationTimeline — mirrors backend M4.3 timeline semantics.
 * Built from existing narration_plan segments (sectionId is the activation key).
 */

import type { NarrationPlanInput } from './types';

export type TimelineEntry = {
  segmentId: string;
  sectionId: string;
  unitId?: string | null;
  sceneId: string;
  cardIndex: number;
  caption: string;
  spokenSummary: string;
  estimatedDurationMs: number;
  index: number;
};

export type PresentationTimeline = {
  presentationId: string;
  turnId: string;
  entries: TimelineEntry[];
};

export type TimelineValidationResult = {
  ok: boolean;
  failures: string[];
};

export function buildTimelineFromPlan(
  plan: NarrationPlanInput,
  presentationId: string,
  opts?: { estimatedDurationMs?: number },
): PresentationTimeline {
  const segments = Array.isArray(plan.segments) ? plan.segments : [];
  const perMs =
    typeof opts?.estimatedDurationMs === 'number' &&
    Number.isFinite(opts.estimatedDurationMs) &&
    opts.estimatedDurationMs > 0
      ? Math.max(400, Math.floor(opts.estimatedDurationMs))
      : 2500;

  const entries: TimelineEntry[] = segments.map((seg, i) => {
    const tts = typeof seg.ttsText === 'string' ? seg.ttsText.trim() : '';
    const display = typeof seg.displayText === 'string' ? seg.displayText.trim() : '';
    const cardIndex =
      typeof seg.cardIndex === 'number' && Number.isFinite(seg.cardIndex)
        ? Math.max(0, Math.floor(seg.cardIndex))
        : i;
    const segmentId =
      typeof seg.segmentId === 'string' && seg.segmentId.trim()
        ? seg.segmentId.trim()
        : `${presentationId}:seg:${i}`;
    const fromPlan =
      typeof seg.sectionId === 'string' && seg.sectionId.trim() ? seg.sectionId.trim() : '';
    const fromCard = typeof seg.cardId === 'string' && seg.cardId.trim() ? seg.cardId.trim() : '';
    const sectionId = fromPlan || fromCard || `seg_${i}`;

    const unitId = typeof seg.unitId === 'string' && seg.unitId.trim() ? seg.unitId.trim() : null;

    return {
      segmentId,
      sectionId,
      unitId,
      sceneId: segmentId,
      cardIndex,
      caption: display || tts,
      spokenSummary: tts || display,
      estimatedDurationMs: perMs,
      index: i,
    };
  });

  return {
    presentationId,
    turnId: plan.turnId,
    entries,
  };
}

export function validateTimeline(timeline: PresentationTimeline): TimelineValidationResult {
  const failures: string[] = [];
  if (!timeline.entries.length) {
    failures.push('empty_timeline');
    return { ok: false, failures };
  }

  const sectionIds: string[] = [];
  const unitIds: Array<string | null> = [];
  const segmentIds: string[] = [];

  timeline.entries.forEach((entry, i) => {
    if (entry.index !== i) failures.push(`index_gap:${i}:${entry.index}`);
    if (!entry.sectionId?.trim()) failures.push(`missing_section_id:${i}`);
    else sectionIds.push(entry.sectionId.trim());
    unitIds.push(entry.unitId ? entry.unitId : null);
    if (!entry.segmentId?.trim()) failures.push(`missing_segment_id:${i}`);
    else segmentIds.push(entry.segmentId.trim());
    if (!entry.caption?.trim() && !entry.spokenSummary?.trim()) {
      failures.push(`empty_caption_and_spoken:${i}`);
    }
  });

  // Duplicate unit identity is always invalid when unitId is present.
  const normalizedUnitIds = unitIds.filter((u): u is string => Boolean(u && u.trim()));
  if (normalizedUnitIds.length !== new Set(normalizedUnitIds).size) failures.push('duplicate_unit_id');

  // Duplicate section meaning is allowed only when unitId differs and unitId is present on all.
  const bySection: Record<string, Set<string | null>> = {};
  for (const e of timeline.entries) {
    const s = (e.sectionId || '').trim();
    if (!s) continue;
    bySection[s] = bySection[s] ?? new Set();
    bySection[s]!.add(e.unitId ? e.unitId : null);
  }
  for (const [_s, set] of Object.entries(bySection)) {
    if (set.size <= 1) continue;
    // fail closed if any entry is legacy (unitId missing)
    if (set.has(null)) {
      failures.push('duplicate_section_id');
      break;
    }
  }
  if (new Set(segmentIds).size !== segmentIds.length) failures.push('duplicate_segment_id');

  return { ok: failures.length === 0, failures };
}
