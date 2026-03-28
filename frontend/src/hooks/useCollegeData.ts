import { useMemo } from 'react';
import { useLanguage, type Language } from '../context/LanguageContext';
import type { CollegeLocaleData } from '../types/collegeData';

import collegeEn from '@college-locales/en.json';
import collegeHi from '@college-locales/hi.json';

const BY_LANGUAGE: Record<Language, CollegeLocaleData> = {
  English: collegeEn as CollegeLocaleData,
  Hindi: collegeHi as CollegeLocaleData,
  Kannada: collegeEn as CollegeLocaleData,
  Tamil: collegeEn as CollegeLocaleData,
  Telugu: collegeEn as CollegeLocaleData,
  Malayalam: collegeEn as CollegeLocaleData,
};

/**
 * Locale JSON fallback aligned with backend RAG source (en / hi).
 * Other UI languages use English JSON until those locale files exist.
 */
export function useCollegeData(): CollegeLocaleData {
  const { language } = useLanguage();
  return useMemo(() => BY_LANGUAGE[language] ?? collegeEn, [language]) as CollegeLocaleData;
}
