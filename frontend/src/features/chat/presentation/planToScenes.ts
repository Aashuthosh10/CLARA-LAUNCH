import type {
  NarrationPlanInput,
  PresentationScene,
  TransitionPolicy,
} from './types';
import { buildTimelineFromPlan, validateTimeline } from './presentationTimeline';
import { clipLocalizedText } from '../../../localization/clipLocalizedText';

let presentationSeq = 0;

export function mintPresentationId(): string {
  presentationSeq += 1;
  return `presentation-${Date.now()}-${presentationSeq}`;
}

export function mintAudioToken(): string {
  return `audio-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function comparisonSectionFromCardId(cardId: string | null | undefined): number | null {
  if (!cardId) return null;
  if (cardId === 'comparison_learning') return 0;
  if (cardId === 'comparison_jobs') return 1;
  if (cardId.startsWith('comparison_')) return 0;
  return null;
}

/**
 * Convert backend narration_plan segments into PresentationScene[].
 * Scenes are keyed by sectionId (meaning) via PresentationTimeline.
 * spokenSummary ← ttsText; displayCaption ← displayText (frontend mapping only).
 */
export function planToScenes(
  plan: NarrationPlanInput,
  presentationId: string,
  opts?: { estimatedTotalDurationMs?: number | null },
): PresentationScene[] {
  const segments = Array.isArray(plan.segments) ? plan.segments : [];
  if (!segments.length) return [];

  const totalMs =
    typeof opts?.estimatedTotalDurationMs === 'number' &&
    Number.isFinite(opts.estimatedTotalDurationMs) &&
    opts.estimatedTotalDurationMs > 0
      ? opts.estimatedTotalDurationMs
      : 0;
  const perSceneFallback = totalMs > 0 ? Math.max(400, Math.floor(totalMs / segments.length)) : 2500;

  const timeline = buildTimelineFromPlan(plan, presentationId, {
    estimatedDurationMs: perSceneFallback,
  });
  const validation = validateTimeline(timeline);
  if (!validation.ok && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[planToScenes] timeline validation failures', validation.failures);
  }

  return timeline.entries.map((entry) => ({
    sceneId: entry.sceneId,
    presentationId,
    sectionId: entry.sectionId,
    unitId: entry.unitId ?? null,
    cardId:
      typeof segments[entry.index]?.cardId === 'string'
        ? (segments[entry.index]!.cardId as string)
        : null,
    cardIndex: entry.cardIndex,
    spokenSummary: entry.spokenSummary,
    displayCaption: entry.caption,
    audioReference: `${plan.turnId}:${entry.index}`,
    estimatedDurationMs: entry.estimatedDurationMs,
    transitionPolicy: 'on_audio_end' as TransitionPolicy,
    isLastScene:
      entry.index === timeline.entries.length - 1 ||
      segments[entry.index]?.isFinalSegment === true,
  }));
}

/**
 * Fallback when narration_plan is missing: one scene per cardsToSync entry.
 */
export function cardsToScenes(
  cards: unknown[] | null | undefined,
  presentationId: string,
  turnId: string,
  opts?: { estimatedTotalDurationMs?: number | null },
): PresentationScene[] {
  const list = Array.isArray(cards) ? cards : [];
  if (!list.length) return [];

  const totalMs =
    typeof opts?.estimatedTotalDurationMs === 'number' &&
    Number.isFinite(opts.estimatedTotalDurationMs) &&
    opts.estimatedTotalDurationMs > 0
      ? opts.estimatedTotalDurationMs
      : 0;
  const perSceneFallback = totalMs > 0 ? Math.max(400, Math.floor(totalMs / list.length)) : 2500;

  return list.map((card, i) => {
    const record = card && typeof card === 'object' ? (card as Record<string, unknown>) : null;
    const title = typeof record?.title === 'string' ? record.title : '';
    const content = typeof record?.content === 'string' ? record.content : '';
    const caption = clipLocalizedText([title, content].filter(Boolean).join(' — '), 220);
    const cardId = typeof record?.type === 'string' ? record.type : `card_${i}`;
    const unitId = typeof record?.unitId === 'string' && record.unitId.trim()
      ? record.unitId.trim()
      : null;
    return {
      sceneId: `${presentationId}:card:${i}`,
      presentationId,
      sectionId: cardId || `seg_${i}`,
      unitId,
      cardId,
      cardIndex: i,
      spokenSummary: caption || `Slide ${i + 1}`,
      displayCaption: caption,
      audioReference: `${turnId}:card:${i}`,
      estimatedDurationMs: perSceneFallback,
      transitionPolicy: 'on_audio_end' as TransitionPolicy,
      isLastScene: i === list.length - 1,
    };
  });
}

/** Single-scene presentation for fees/HOD/trustees/bus/etc. */
export function singleScenePresentation(
  presentationId: string,
  opts: {
    turnId: string;
    cardId: string;
    caption?: string;
    spokenSummary?: string;
    estimatedDurationMs?: number;
    transitionPolicy?: TransitionPolicy;
  },
): PresentationScene[] {
  const caption = (opts.caption ?? opts.spokenSummary ?? '').trim();
  const spoken = (opts.spokenSummary ?? opts.caption ?? '').trim();
  return [
    {
      sceneId: `${presentationId}:single`,
      presentationId,
      sectionId: opts.cardId || 'single',
      cardId: opts.cardId,
      cardIndex: 0,
      spokenSummary: spoken || caption,
      displayCaption: caption || spoken,
      audioReference: `${opts.turnId}:0`,
      estimatedDurationMs: opts.estimatedDurationMs ?? 3000,
      transitionPolicy: opts.transitionPolicy ?? 'on_audio_end',
      isLastScene: true,
    },
  ];
}

export function mapSceneToComparisonSection(scene: PresentationScene | null): number {
  if (!scene) return 0;
  const fromId = comparisonSectionFromCardId(scene.cardId);
  if (fromId !== null) return fromId;
  if (typeof scene.cardIndex === 'number' && Number.isFinite(scene.cardIndex)) {
    return Math.max(0, Math.min(2, scene.cardIndex));
  }
  return 0;
}
