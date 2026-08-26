import uiCopy from '@college-locales/ui.json';

import type { Language } from '../context/LanguageContext';

type UiLocale = 'en' | 'kn';

const languageToUiLocale = (language: Language | string | undefined): UiLocale =>
  language === 'Kannada' || language === 'kn' ? 'kn' : 'en';

export function uiText(
  language: Language | string | undefined,
  path: string,
  values: Record<string, string> = {},
): string {
  const locale = languageToUiLocale(language);
  let node: unknown = uiCopy[locale];
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) {
      node = undefined;
      break;
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'string') {
    throw new Error(`Missing UI localization key: ${locale}.${path}`);
  }
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    node,
  );
}

export const SAMPLE_CONTENT_STATUS = 'SAMPLE_REPLACE_WITH_OFFICIAL';

