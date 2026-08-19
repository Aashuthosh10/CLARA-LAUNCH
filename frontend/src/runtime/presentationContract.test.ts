/**
 * Lightweight Presentation Contract unit checks (Vitest-compatible).
 */
import { describe, expect, it } from 'vitest';
import {
  choosePresentationFallback,
  validatePresentationContract,
} from './presentationContract';
import { resetConversationRuntime } from './conversationRuntimeStore';

describe('presentationContract', () => {
  it('accepts a complete plan', () => {
    resetConversationRuntime();
    const result = validatePresentationContract({
      plan: {
        turnId: 't1',
        mode: 'card_narration',
        segments: [
          {
            segmentId: 't1:seg:0',
            displayText: 'Intro',
            ttsText: 'Intro',
            cardIndex: 0,
            cardId: 'dept_slide',
          },
          {
            segmentId: 't1:seg:1',
            displayText: 'Labs',
            ttsText: 'Labs',
            cardIndex: 1,
            cardId: 'dept_slide',
          },
        ],
      },
      cardsToSyncLength: 2,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects count mismatch', () => {
    resetConversationRuntime();
    const result = validatePresentationContract({
      plan: {
        turnId: 't1',
        mode: 'card_narration',
        segments: [
          {
            segmentId: 't1:seg:0',
            displayText: 'Intro',
            ttsText: 'Intro',
            cardIndex: 0,
          },
        ],
      },
      cardsToSyncLength: 3,
    });
    expect(result.ok).toBe(false);
  });

  it('fallback cascade order', () => {
    expect(
      choosePresentationFallback({ hasSingleCardSurface: true, canUseFullText: true }),
    ).toBe('single_card');
    expect(
      choosePresentationFallback({ hasSingleCardSurface: false, canUseFullText: true }),
    ).toBe('full_text');
    expect(
      choosePresentationFallback({ hasSingleCardSurface: false, canUseFullText: false }),
    ).toBe('concise');
  });
});
