import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_CODES,
  LANGUAGE_SELECTION_OPTIONS,
  codeToLanguage,
  isLanguageCode,
  languageToCode,
  parseLanguageCode,
} from '../languageCodes';

describe('K1 canonical language codes', () => {
  it('exposes exactly the six canonical codes', () => {
    expect([...LANGUAGE_CODES].sort()).toEqual(['en', 'hi', 'kn', 'ml', 'ta', 'te']);
  });

  it('renders exactly six selection options', () => {
    expect(LANGUAGE_SELECTION_OPTIONS).toHaveLength(6);
  });

  it('maps Kannada only to kn', () => {
    expect(languageToCode('Kannada')).toBe('kn');
    expect(codeToLanguage('kn')).toBe('Kannada');
  });

  it('maps every option to exactly one correct canonical code', () => {
    const expected: Record<string, string> = {
      English: 'en',
      Kannada: 'kn',
      Hindi: 'hi',
      Tamil: 'ta',
      Telugu: 'te',
      Malayalam: 'ml',
    };
    for (const opt of LANGUAGE_SELECTION_OPTIONS) {
      expect(opt.code).toBe(expected[opt.name]);
    }
    const codes = new Set(LANGUAGE_SELECTION_OPTIONS.map((o) => o.code));
    expect(codes.size).toBe(6);
  });

  it('keeps approved native labels unchanged', () => {
    const labels = Object.fromEntries(
      LANGUAGE_SELECTION_OPTIONS.map((o) => [o.name, o.label]),
    );
    expect(labels.English).toBe('English');
    expect(labels.Kannada).toBe('ಕನ್ನಡ');
    expect(labels.Hindi).toBe('हिन्दी');
    expect(labels.Tamil).toBe('தமிழ்');
    expect(labels.Telugu).toBe('తెలుగు');
    expect(labels.Malayalam).toBe('മലയാളം');
  });

  it('rejects provider locales and display names as application codes', () => {
    expect(isLanguageCode('kn-IN')).toBe(false);
    expect(isLanguageCode('en-IN')).toBe(false);
    expect(isLanguageCode('Kannada')).toBe(false);
    expect(isLanguageCode('ಕನ್ನಡ')).toBe(false);
    expect(parseLanguageCode('kn-IN')).toBeNull();
    expect(parseLanguageCode(null)).toBeNull();
    expect(parseLanguageCode('')).toBeNull();
  });
});
