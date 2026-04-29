import { menuLabelToJsonKey } from '../../../lib/collegeLocaleUtils';

/**
 * Resolve a department id (which might be localized UI text) into a stable internal key.
 *
 * - Prefer existing `menuLabelToJsonKey` mapping (covers current departments).
 * - Fallback: derive a canonical-ish key from the raw string so future departments
 *   can still attempt folder keyword matching.
 */
export function resolveDepartmentJsonKey(departmentId: string | null | undefined): string | null {
  const k = menuLabelToJsonKey(departmentId);
  if (k) return k;

  if (!departmentId || typeof departmentId !== 'string') return null;
  const raw = departmentId.trim().toLowerCase();
  if (!raw) return null;

  // Try to create something like `basic_sciences`, `mechanical`, etc.
  // Keep only alphanumerics and underscores; collapse whitespace to underscores.
  const normalized = raw
    .replace(/&/g, 'and')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return normalized || null;
}

