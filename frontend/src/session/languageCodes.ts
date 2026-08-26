/**
 * K1 canonical application language codes.
 *
 * Exactly one internal code per language. Display labels, provider locales
 * (e.g. `kn-IN`) and browser locales are never stored as application state.
 */

export type LanguageName =
  | 'English'
  | 'Kannada'
  | 'Hindi'
  | 'Tamil'
  | 'Telugu'
  | 'Malayalam';

export const LANGUAGE_CODES = ['en', 'kn', 'hi', 'ta', 'te', 'ml'] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

const CODE_BY_NAME: Record<LanguageName, LanguageCode> = {
  English: 'en',
  Kannada: 'kn',
  Hindi: 'hi',
  Tamil: 'ta',
  Telugu: 'te',
  Malayalam: 'ml',
};

const NAME_BY_CODE: Record<LanguageCode, LanguageName> = {
  en: 'English',
  kn: 'Kannada',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
};

/** The six selectable options: native label plus the canonical code it maps to. */
export const LANGUAGE_SELECTION_OPTIONS: ReadonlyArray<{
  name: LanguageName;
  label: string;
  code: LanguageCode;
}> = [
  { name: 'English', label: 'English', code: 'en' },
  { name: 'Kannada', label: 'ಕನ್ನಡ', code: 'kn' },
  { name: 'Hindi', label: 'हिन्दी', code: 'hi' },
  { name: 'Tamil', label: 'தமிழ்', code: 'ta' },
  { name: 'Telugu', label: 'తెలుగు', code: 'te' },
  { name: 'Malayalam', label: 'മലയാളം', code: 'ml' },
];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return (
    typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value)
  );
}

export function languageToCode(name: LanguageName): LanguageCode {
  return CODE_BY_NAME[name];
}

export function codeToLanguage(code: LanguageCode): LanguageName {
  return NAME_BY_CODE[code];
}

/**
 * Parse an arbitrary stored/transport value into a canonical code.
 * Provider locales (`kn-IN`), display names and junk all fail closed to null.
 */
export function parseLanguageCode(value: unknown): LanguageCode | null {
  if (!isLanguageCode(value)) return null;
  return value;
}
