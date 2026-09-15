import { describe, expect, it } from 'vitest';

import { uiText } from '../uiCopy';

describe('Tamil UI locale', () => {
  it('resolves Tamil from ui.json instead of English fallback', () => {
    expect(uiText('Tamil', 'documents.label')).toBe('ஆவணங்கள்');
    expect(uiText('Tamil', 'documents.checklist')).toBe('சேர்க்கை சரிபார்ப்புப் பட்டியல்');
    expect(uiText('ta', 'cards.fees')).toMatch(/கட்டண/);
    expect(uiText('Tamil', 'welcome.general_narration')).not.toMatch(/Welcome/);
  });
});

describe('Documents chrome localization', () => {
  it('provides label and checklist for all six UI locales', () => {
    for (const lang of ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'] as const) {
      expect(uiText(lang, 'documents.label').trim().length).toBeGreaterThan(0);
      expect(uiText(lang, 'documents.checklist').trim().length).toBeGreaterThan(0);
    }
  });
});
