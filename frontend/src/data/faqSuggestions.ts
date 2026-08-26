import faqCatalog from '@college-locales/../faq_answers.json';

import type { Language } from '../context/LanguageContext';

export type FaqSuggestionCategory =
  | 'college'
  | 'departments'
  | 'admissions'
  | 'fees'
  | 'placements'
  | 'academic'
  | 'campus';

type CatalogItem = {
  id: string;
  questions: Partial<Record<Language, string>> & { English: string };
};

const FAQ_CATEGORIES: Record<string, FaqSuggestionCategory[]> = {
  'college-private': ['college'],
  'college-special': ['college', 'academic'],
  'best-department': ['college', 'departments'],
  'software-jobs': ['college', 'departments', 'placements'],
  'core-jobs': ['college', 'departments', 'placements'],
  'vtu-syllabus': ['college', 'academic'],
  'faculty-experience': ['departments', 'academic'],
  'phd-faculty': ['departments', 'academic'],
  'original-documents': ['admissions'],
  'lateral-entry': ['admissions', 'academic'],
  'outside-karnataka': ['admissions'],
  'submit-documents': ['admissions'],
  'admission-office': ['admissions', 'campus'],
  'merit-concession': ['fees'],
  'bank-loan-letters': ['fees', 'admissions'],
  'fee-clarification-contact': ['fees'],
  'placement-training-fee': ['fees', 'placements'],
  'hostel-mess-fee': ['fees', 'campus'],
  'admission-refund': ['fees', 'admissions'],
  'core-companies': ['placements', 'departments'],
  'placed-before-graduation': ['placements'],
  'parents-placement-officer': ['placements', 'campus'],
  'course-syllabus': ['academic', 'departments'],
  'bridge-courses': ['academic', 'admissions'],
  'project-support': ['academic', 'departments'],
  'clubs-events': ['academic', 'campus'],
  'industrial-visits': ['academic'],
  'workshops-seminars': ['academic'],
  'research-innovation': ['academic', 'college'],
  'co-curricular': ['academic', 'campus'],
  'mess-food': ['campus', 'fees'],
  parking: ['campus'],
  'campus-facilities': ['campus', 'college'],
  'girls-safety': ['campus'],
  sports: ['campus'],
  library: ['campus', 'academic'],
  'computer-labs': ['campus', 'academic', 'departments'],
  canteen: ['campus'],
  'medical-support': ['campus'],
};

const FAQ_SUGGESTIONS = (faqCatalog.items as CatalogItem[]).map((item) => ({
  ...item,
  categories: FAQ_CATEGORIES[item.id] ?? ['college', 'campus'],
}));

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[?.!,;:"'()[\]{}]+/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function inferFaqCategories(payload: any, lastAssistantText: string): FaqSuggestionCategory[] {
  const showCard = normalize(payload?.showCard);
  const intent = normalize(payload?.intent);
  const combined = `${showCard} ${intent} ${normalize(lastAssistantText)}`;

  if (combined.includes('fee')) return ['fees'];
  if (combined.includes('document') || combined.includes('admission') || combined.includes('eligibility')) {
    return ['admissions'];
  }
  if (combined.includes('placement') || combined.includes('job')) return ['placements'];
  if (
    combined.includes('department') ||
    combined.includes('course menu') ||
    combined.includes('course') ||
    combined.includes('hod')
  ) {
    return ['departments', 'academic'];
  }
  if (combined.includes('college') || combined.includes('trustee') || combined.includes('overview')) {
    return ['college', 'campus'];
  }
  return ['college', 'campus'];
}

export function selectFaqSuggestions(
  language: Language,
  categories: FaqSuggestionCategory[],
  recentIds: string[],
): { id: string; text: string }[] {
  const categorySet = new Set(categories);
  const matching = FAQ_SUGGESTIONS.filter((item) =>
    item.categories.some((category) => categorySet.has(category)),
  );
  const fallback = FAQ_SUGGESTIONS.filter((item) =>
    item.categories.some((category) => category === 'college' || category === 'campus'),
  );
  const pool = matching.length ? matching : fallback;
  const recent = new Set(recentIds);
  const preferred = pool.filter((item) => !recent.has(item.id));
  const selected = (preferred.length >= 5 ? preferred : [...preferred, ...pool.filter((item) => recent.has(item.id))])
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .slice(0, 5);

  return selected.map((item) => ({
    id: item.id,
    text: item.questions[language] ?? item.questions.English,
  }));
}
