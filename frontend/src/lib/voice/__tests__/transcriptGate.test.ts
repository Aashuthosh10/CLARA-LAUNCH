import { describe, expect, it } from 'vitest';
import {
  createDuplicateTranscriptGuard,
  isLikelyCampusShortQuery,
  validateFinalTranscript,
} from '../transcriptGate';

describe('validateFinalTranscript', () => {
  it('rejects empty / whitespace', () => {
    expect(validateFinalTranscript('').ok).toBe(false);
    expect(validateFinalTranscript('   ').ok).toBe(false);
  });

  it('keeps short campus queries: fees? / CSE? / bus?', () => {
    expect(validateFinalTranscript('fees?')).toEqual({ ok: true, text: 'fees?' });
    expect(validateFinalTranscript('CSE?')).toEqual({ ok: true, text: 'CSE?' });
    expect(validateFinalTranscript('bus?')).toEqual({ ok: true, text: 'bus?' });
    expect(validateFinalTranscript('who?')).toEqual({ ok: true, text: 'who?' });
  });

  it('keeps Indic short tokens', () => {
    expect(validateFinalTranscript('ಯಾರು').ok).toBe(true);
    expect(validateFinalTranscript('ಎಷ್ಟು').ok).toBe(true);
  });

  it('rejects recognizer garbage and BACKGROUND_NOISE', () => {
    expect(validateFinalTranscript('ummm').ok).toBe(false);
    expect(validateFinalTranscript('**BACKGROUND_NOISE**').ok).toBe(false);
    expect(validateFinalTranscript('asdf').ok).toBe(false);
  });

  it('rejects single Latin letter that is not allowlisted', () => {
    expect(validateFinalTranscript('a').ok).toBe(false);
  });

  it('accepts mixed-language campus turns', () => {
    expect(validateFinalTranscript('CSE ge fees eshtu?').ok).toBe(true);
    expect(validateFinalTranscript('college alli admission maadbeku').ok).toBe(true);
    expect(validateFinalTranscript('AIML HOD yaaru?').ok).toBe(true);
  });
});

describe('isLikelyCampusShortQuery', () => {
  it('allowlists common kiosk cues', () => {
    expect(isLikelyCampusShortQuery('fees')).toBe(true);
    expect(isLikelyCampusShortQuery('CSE?')).toBe(true);
  });
});

describe('createDuplicateTranscriptGuard', () => {
  it('suppresses duplicate within window; allows after window', () => {
    const g = createDuplicateTranscriptGuard(2500);
    expect(g.isDuplicate('fees?', 1000)).toBe(false);
    expect(g.isDuplicate('fees?', 1500)).toBe(true);
    expect(g.isDuplicate('fees?', 4000)).toBe(false);
  });

  it('does not treat different transcripts as duplicates', () => {
    const g = createDuplicateTranscriptGuard(2500);
    expect(g.isDuplicate('fees?', 1000)).toBe(false);
    expect(g.isDuplicate('bus?', 1100)).toBe(false);
  });
});
