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

describe('answer visibility — thinking until speech is ready', () => {
  it.each(LANGS)('%s: audioPending keeps thinking and delays commit', (lang) => {
    expect(ANSWERS[lang].length).toBeGreaterThan(0);
    expect(
      shouldCommitAnswerMessages({ hasMessages: true, audioPending: true }),
    ).toBe(false);
    expect(
      showThinkingOverlay({ isProcessing: false, audioPending: true }),
    ).toBe(true);
    expect(
      shouldFocusAssistantAnswer({
        isCardTurn: false,
        isProcessing: false,
        audioPending: true,
      }),
    ).toBe(false);
  });

  it.each(LANGS)('%s: ready audio commits and clears thinking', (lang) => {
    expect(ANSWERS[lang].length).toBeGreaterThan(0);
    expect(
      shouldCommitAnswerMessages({
        hasMessages: true,
        audioPending: false,
        audioReady: true,
      }),
    ).toBe(true);
    expect(
      showThinkingOverlay({ isProcessing: false, audioPending: false }),
    ).toBe(false);
  });

  it('TTS failure still commits text and leaves thinking', () => {
    expect(
      shouldCommitAnswerMessages({
        hasMessages: true,
        audioPending: false,
        audioUnavailable: true,
      }),
    ).toBe(true);
    expect(
      showThinkingOverlay({
        isProcessing: false,
        audioPending: false,
        audioUnavailable: true,
      }),
    ).toBe(false);
  });

  it('shows thinking while isProcessing', () => {
    expect(showThinkingOverlay({ isProcessing: true })).toBe(true);
    expect(showThinkingOverlay({ isProcessing: false })).toBe(false);
  });

  it('keeps cards from stealing answer focus', () => {
    expect(
      shouldFocusAssistantAnswer({ isCardTurn: true, isProcessing: false }),
    ).toBe(false);
  });

  it('watchdog recovers a stuck audioPending gate', () => {
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
      shouldCommitAnswerMessages({
        hasMessages: true,
        audioPending: true,
        watchdogRecovered: true,
      }),
    ).toBe(true);
    expect(
      showThinkingOverlay({
        isProcessing: false,
        audioPending: true,
        watchdogRecovered: true,
      }),
    ).toBe(false);
  });
});
