import type { Language } from '../../../../context/LanguageContext';
import { collegeDataForLanguage } from '../../../../hooks/useCollegeData';
import type { CollegeLocaleData, RoleHolderTrustee } from '../../../../types/collegeData';

const LANGUAGES: Language[] = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'];

export type LocalizedTrusteeCard = {
  id: string;
  imageKey: string;
  name: string;
  role: string;
  description: string;
  tts_summary: string;
  localizationStatus: string;
};

export function isPresentationLanguage(value: string | undefined): value is Language {
  return Boolean(value && (LANGUAGES as string[]).includes(value));
}

export function trusteesFromCollegeData(data: CollegeLocaleData): LocalizedTrusteeCard[] {
  const rows = data.role_holders?.trustees;
  if (!Array.isArray(rows)) return [];
  const out: LocalizedTrusteeCard[] = [];
  for (const row of rows) {
    const card = trusteeCardFromRecord(row);
    if (card) out.push(card);
  }
  return out;
}

export function trusteesForLanguage(language: string | undefined): LocalizedTrusteeCard[] {
  const resolved: Language = isPresentationLanguage(language) ? language : 'English';
  return trusteesFromCollegeData(collegeDataForLanguage(resolved));
}

export function trusteeBoardLabel(language: string | undefined): string {
  const resolved: Language = isPresentationLanguage(language) ? language : 'English';
  return collegeDataForLanguage(resolved).role_holders?.ui?.board_label || 'Board of Trustees';
}

function trusteeCardFromRecord(row: RoleHolderTrustee | undefined): LocalizedTrusteeCard | null {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || row.image_key || '').trim();
  const name = String(row.display_name || row.name || '').trim();
  if (!id || !name) return null;
  const description = String(row.description || '').trim();
  const spoken = String(row.tts_summary || description).trim();
  return {
    id,
    imageKey: String(row.image_key || id).trim() || id,
    name,
    role: String(row.designation || '').trim(),
    description,
    tts_summary: spoken,
    localizationStatus: String(row.localization_status || 'incomplete'),
  };
}
