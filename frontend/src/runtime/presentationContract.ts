/** Mandatory Presentation Contract — validate only; never repair. */

import { ContractFailure, PresentationContractResult } from './types';
import { pushRuntimeEvent } from './diagnostics';
import { getConversationRuntime } from './conversationRuntimeStore';

type SegmentLike = {
  segmentId?: string;
  displayText?: string;
  ttsText?: string;
  cardIndex?: number | null;
  cardId?: string | null;
};

type PlanLike = {
  turnId?: string;
  mode?: string;
  segments?: SegmentLike[];
};

export function validatePresentationContract(args: {
  plan: PlanLike | null | undefined;
  cardsToSyncLength?: number | null;
  expectedPresentationId?: string | null;
}): PresentationContractResult {
  const failures: ContractFailure[] = [];
  const plan = args.plan;
  const segments = Array.isArray(plan?.segments) ? plan!.segments! : [];
  const n = segments.length;
  const counts: Record<string, number> = {
    cardCount: args.cardsToSyncLength ?? n,
    sceneCount: n,
    narrationCount: n,
    captionCount: 0,
    audioCount: 0,
    indexCount: n,
  };

  if (!plan || plan.mode !== 'card_narration') {
    failures.push({ reason: 'invalid_plan_mode', expected: 'card_narration', actual: plan?.mode });
  }
  if (n === 0) {
    failures.push({ reason: 'empty_segments', expected: '>=1', actual: 0 });
  }

  if (
    typeof args.cardsToSyncLength === 'number' &&
    args.cardsToSyncLength > 0 &&
    args.cardsToSyncLength !== n
  ) {
    failures.push({
      reason: 'cards_segments_length_mismatch',
      expected: args.cardsToSyncLength,
      actual: n,
    });
  }

  const indices: number[] = [];
  const segmentIds: string[] = [];

  segments.forEach((seg, i) => {
    const display = (seg.displayText || '').trim();
    const tts = (seg.ttsText || '').trim();
    if (display) counts.captionCount += 1;
    else failures.push({ reason: 'missing_caption', expected: 'displayText', actual: i });
    if (tts) counts.audioCount += 1;
    else failures.push({ reason: 'empty_narration_tts', expected: 'ttsText', actual: i });

    const idx = typeof seg.cardIndex === 'number' && Number.isFinite(seg.cardIndex) ? seg.cardIndex : null;
    if (idx === null) failures.push({ reason: 'missing_card_index', expected: i, actual: null });
    else indices.push(Math.floor(idx));

    const sid = (seg.segmentId || '').trim();
    if (!sid) failures.push({ reason: 'missing_scene_id', expected: 'segmentId', actual: i });
    else if (segmentIds.includes(sid)) failures.push({ reason: 'duplicate_scene_id', actual: sid });
    else segmentIds.push(sid);
  });

  if (indices.length === n) {
    const expectedSeq = Array.from({ length: n }, (_, i) => i);
    if (new Set(indices).size !== n) {
      failures.push({ reason: 'duplicate_card_index', expected: 'unique', actual: indices });
    }
    if ([...indices].sort((a, b) => a - b).join(',') !== expectedSeq.join(',')) {
      failures.push({ reason: 'card_index_not_continuous', expected: expectedSeq, actual: indices });
    }
    if (indices.join(',') !== expectedSeq.join(',')) {
      failures.push({ reason: 'card_index_order', expected: expectedSeq, actual: indices });
    }
  }

  if (
    !(
      counts.sceneCount === counts.narrationCount &&
      counts.narrationCount === counts.captionCount &&
      counts.captionCount === counts.audioCount &&
      counts.audioCount === counts.indexCount
    )
  ) {
    failures.push({ reason: 'count_equality_failed', expected: 'all_equal', actual: { ...counts } });
  }

  const snap = getConversationRuntime();
  if (args.expectedPresentationId && snap.activePresentationId && args.expectedPresentationId !== snap.activePresentationId) {
    failures.push({
      reason: 'presentation_id_mismatch',
      expected: args.expectedPresentationId,
      actual: snap.activePresentationId,
    });
  }

  const ok = failures.length === 0;
  const result = { ok, failures, counts };
  if (ok) {
    pushRuntimeEvent('PRESENTATION_CONTRACT_OK', {
      turnId: plan?.turnId,
      language: snap.currentLanguage,
      counts,
    });
  } else {
    pushRuntimeEvent('PRESENTATION_CONTRACT_FAILED', {
      reason: failures[0]?.reason,
      expected: failures[0]?.expected,
      actual: failures[0]?.actual,
      turnId: plan?.turnId,
      language: snap.currentLanguage,
      counts,
    });
  }
  return result;
}

/** Owner cascade hint after contract failure — validator does not mutate UI. */
export type PresentationFallbackKind = 'single_card' | 'full_text' | 'concise';

export function choosePresentationFallback(args: {
  hasSingleCardSurface: boolean;
  canUseFullText: boolean;
}): PresentationFallbackKind {
  if (args.hasSingleCardSurface) return 'single_card';
  if (args.canUseFullText) return 'full_text';
  return 'concise';
}
