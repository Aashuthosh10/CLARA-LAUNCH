import { describe, expect, it } from 'vitest';
import {
  ANSWER_TTS_WATCHDOG_MS,
  shouldCommitAnswerMessages,
  shouldFocusAssistantAnswer,
  shouldRecoverAudioPendingWatchdog,
  showThinkingOverlay,
} from '../answerVisibility';

const LANGS = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'] as const;

const ANSWERS: Record<(typeof LANGS)[number], string> = {
  English: 'Faculty here are supportive and experienced.',
  Kannada: 'ಇಲ್ಲಿನ ಅಧ್ಯಾಪಕರು ಬೆಂಬಲ ನೀಡುತ್ತಾರೆ.',
  Hindi: 'यहाँ के शिक्षक सहायक और अनुभवी हैं।',
  Tamil: 'இங்கே ஆசிரியர்கள் ஆதரவாக இருக்காங்க.',
  Telugu: 'ఇక్కడ ఉపాధ్యాయులు సహాయకారులు.',
  Malayalam: 'ഇവിടുത്തെ അധ്യാപകർ പിന്തുണ നൽകുന്നു.',
};

describe('answer visibility invariant', () => {
  it.each(LANGS)('%s: audioPending must not block message commit', (lang) => {
    expect(ANSWERS[lang].length).toBeGreaterThan(0);
    expect(shouldCommitAnswerMessages(true)).toBe(true);
    expect(showThinkingOverlay(false)).toBe(false);
    expect(
      shouldFocusAssistantAnswer({ isCardTurn: false, isProcessing: false }),
    ).toBe(true);
  });

  it('shows thinking only while isProcessing, not while TTS pending', () => {
    expect(showThinkingOverlay(true)).toBe(true);
    expect(showThinkingOverlay(false)).toBe(false);
  });

  it('keeps cards from stealing answer focus', () => {
    expect(
      shouldFocusAssistantAnswer({ isCardTurn: true, isProcessing: false }),
    ).toBe(false);
  });

  it('recovers a stuck audioPending gate after the watchdog', () => {
    expect(
      shouldRecoverAudioPendingWatchdog({ audioPending: true, elapsedMs: 1000 }),
    ).toBe(false);
    expect(
      shouldRecoverAudioPendingWatchdog({
        audioPending: true,
        elapsedMs: ANSWER_TTS_WATCHDOG_MS,
      }),
    ).toBe(true);
    expect(
      shouldRecoverAudioPendingWatchdog({ audioPending: false, elapsedMs: 99_000 }),
    ).toBe(false);
  });
});
