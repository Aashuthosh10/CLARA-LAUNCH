import type { DepartmentJsonKey } from './collegeLocaleUtils';

/**
 * Mirrors backend substring cues enough to promote contrast questions to the comparison cinema when
 * the server still emits department_overview (older deploy, STT quirks, pipeline edge cases).
 */
const COMPARISON_CUE_SUBSTRINGS = [
  'difference',
  'differnce',
  'diffrence',
  'compare',
  'comparison',
  'versus',
  'contrast',
  ' vs ',
  ' vs.',
  'which is better',
  'which branch',
  'confused between',
  'better than',
  'side by side',
  'between ',
  ' placements ',
];

const DEPT_TRIGGERS: [string, DepartmentJsonKey][] = [
  ['cse data science', 'cse_ds'],
  ['cse datascience', 'cse_ds'],
  ['data science', 'cse_ds'],
  ['datascience', 'cse_ds'],
  ['cse ai ml', 'cse_aiml'],
  ['ai and ml', 'cse_aiml'],
  ['ai & ml', 'cse_aiml'],
  ['aiml', 'cse_aiml'],
  ['artificial intelligence', 'cse_aiml'],
  ['machine learning', 'cse_aiml'],
  ['cse cyber security', 'cse_cysec'],
  ['cyber security', 'cse_cysec'],
  ['cybersecurity', 'cse_cysec'],
  ['cyber', 'cse_cysec'],
  ['cse business systems', 'cse_bs'],
  ['business systems', 'cse_bs'],
  ['information science', 'ise'],
  ['electronics and communication', 'ece'],
  ['electronics & communication', 'ece'],
  ['electronics communication', 'ece'],
  ['electronics', 'ece'],
  ['computer science engineering', 'cse'],
  ['computer science', 'cse'],
  ['business administration', 'mba'],
  ['basic sciences', 'basic_sciences'],
  ['basic science', 'basic_sciences'],
  ['mechanical engineering', 'mechanical'],
  ['civil engineering', 'civil'],
  ['management', 'mba'],
  ['mechanical', 'mechanical'],
  ['mech', 'mechanical'],
  ['civil', 'civil'],
  ['mba', 'mba'],
  ['ise', 'ise'],
  ['ece', 'ece'],
  ['cse', 'cse'],
];

const SORTED_TRIGGERS = [...DEPT_TRIGGERS].sort((a, b) => b[0].length - a[0].length);

function padForScan(raw: string): string {
  const inner = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ` ${inner} `;
}

function wantsComparisonCue(raw: string): boolean {
  const low = raw.toLowerCase();
  const padded = ` ${low.replace(/\s+/g, ' ')} `;
  if (/\bvs\.?\b/.test(low)) return true;
  if (/\bdiff\b/.test(low) && /\bbetween\b/.test(low)) return true;
  return COMPARISON_CUE_SUBSTRINGS.some((c) => padded.includes(c));
}

function extractOrderedDeptKeys(raw: string): DepartmentJsonKey[] {
  const padded = padForScan(raw);
  const hits: { idx: number; key: DepartmentJsonKey }[] = [];
  for (const [needle, key] of SORTED_TRIGGERS) {
    const n = ` ${needle.replace(/\s+/g, ' ')} `;
    let start = 0;
    while (start < padded.length) {
      const i = padded.indexOf(n, start);
      if (i < 0) break;
      hits.push({ idx: i, key });
      start = i + Math.max(1, Math.floor(n.length / 2));
    }
  }
  hits.sort((a, b) => a.idx - b.idx);
  const out: DepartmentJsonKey[] = [];
  const seen = new Set<DepartmentJsonKey>();
  for (const h of hits) {
    if (!seen.has(h.key)) {
      seen.add(h.key);
      out.push(h.key);
    }
  }
  return out.slice(0, 3);
}

/** When true, client should treat the turn as department_comparison if at least two distinct program keys match. */
export function inferForcedDepartmentComparisonFromUserText(
  raw: string | null | undefined,
): { force: boolean; departmentIds: DepartmentJsonKey[] } {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { force: false, departmentIds: [] };
  if (!wantsComparisonCue(text)) return { force: false, departmentIds: [] };
  const departmentIds = extractOrderedDeptKeys(text);
  if (departmentIds.length < 2) return { force: false, departmentIds: [] };
  return { force: true, departmentIds };
}
