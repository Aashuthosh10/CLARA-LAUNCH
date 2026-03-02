/**
 * Parse LLM overview reply (6 numbered sections from backend) into 5 book content pages.
 * Closing Assurance (section 6) is excluded from the digital book.
 * Backend format: "1) About the Institution ... 2) Academic Programs ..." etc.
 */

export interface OverviewSection {
  title: string;
  content: string;
}

/** Five sections for the book; Closing Assurance is not included. */
const SECTION_TITLES = [
  'About the Institution',
  'Academic Programs',
  'Quality & Infrastructure',
  'Achievements & Recognition',
  'Placement & Career Support',
];

const SPLIT_REGEX = /\n\s*\d+[.)]\s*/;

/**
 * Split overview reply into 5 sections (1–5 only). Section 6 Closing Assurance is dropped.
 * Each section has title (from known order) and content text.
 */
export function parseOverviewReplyToPages(assistantText: string): OverviewSection[] {
  const raw = (assistantText || '').trim();
  if (!raw) return SECTION_TITLES.map((title) => ({ title, content: 'Information not available.' }));

  const segments = raw
    .split(SPLIT_REGEX)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  // First segment may be intro before "1)"; sections 1–5 used (section 6 Closing Assurance omitted).
  const sectionContents = segments.slice(-6).slice(0, 5);
  return SECTION_TITLES.map((title, i) => ({
    title,
    content: (sectionContents[i] && sectionContents[i].trim()) || 'Information not available.',
  }));
}
