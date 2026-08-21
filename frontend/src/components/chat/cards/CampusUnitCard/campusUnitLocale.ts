import type { Language } from '../../../../context/LanguageContext';
import { collegeDataForLanguage } from '../../../../hooks/useCollegeData';
import type { CampusUnitRecord } from '../../../../types/collegeData';

export function campusUnitFromLocale(
  unitId: string,
  language: string | undefined,
): CampusUnitRecord | null {
  const lang = (language || 'English') as Language;
  const data = collegeDataForLanguage(
    ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'].includes(lang)
      ? lang
      : 'English',
  );
  const row = data.campus_units?.[unitId];
  if (!row || typeof row !== 'object') return null;
  return row;
}
