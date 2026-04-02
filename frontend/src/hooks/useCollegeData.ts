/**
 * College knowledge (SVIT): single source of truth is `backend/data/locales/<locale>.json`.
 * Vite resolves `@college-locales` to that folder — one static import per language.
 * Do not load facts from .txt files, Python modules, or duplicate JSON copies elsewhere.
 */
import { useMemo } from 'react';
import { useLanguage, type Language } from '../context/LanguageContext';
import type { CollegeLocaleData } from '../types/collegeData';

import collegeEn from '@college-locales/en.json';
import collegeHi from '@college-locales/hi.json';
import collegeKn from '@college-locales/kn.json';
import collegeTa from '@college-locales/ta.json';
import collegeTe from '@college-locales/te.json';
import collegeMl from '@college-locales/ml.json';

/** JSON basename under backend/data/locales/ (must match backend locale_file_id_for_lang_key). */
export const COLLEGE_LOCALE_FILE_BY_LANGUAGE: Record<Language, 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'ml'> = {
  English: 'en',
  Hindi: 'hi',
  Kannada: 'kn',
  Tamil: 'ta',
  Telugu: 'te',
  Malayalam: 'ml',
};

const BY_LANGUAGE: Record<Language, CollegeLocaleData> = {
  English: collegeEn as CollegeLocaleData,
  Hindi: collegeHi as CollegeLocaleData,
  Kannada: collegeKn as CollegeLocaleData,
  Tamil: collegeTa as CollegeLocaleData,
  Telugu: collegeTe as CollegeLocaleData,
  Malayalam: collegeMl as CollegeLocaleData,
};

export function useCollegeData(): CollegeLocaleData {
  const { language } = useLanguage();
  return useMemo(() => BY_LANGUAGE[language] ?? collegeEn, [language]) as CollegeLocaleData;
}
