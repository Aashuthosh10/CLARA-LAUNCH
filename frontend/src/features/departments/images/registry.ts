import type { DepartmentJsonKey } from '../../../lib/collegeLocaleUtils';

/**
 * Map canonical department keys → asset folder names under `src/assets/`.
 *
 * NOTE: This is folder-name mapping (not per-file hardcoding). Images are discovered
 * dynamically from the folders via `import.meta.glob`.
 */
export const DEPARTMENT_FOLDER_BY_KEY: Partial<Record<DepartmentJsonKey, string>> = {
  cse: 'Computer Science and Engineering',
  cse_aiml: 'Artificial Inteligence and Machine Learning',
  cse_ds: 'Data Science',
  cse_cysec: 'Cyber Security',
  cse_bs: 'Business Systems',
  ise: 'Information Science and Engineering',
  ece: 'Electronics and Communications',
  civil: 'Civil',
  mechanical: 'Mechanical',
  mba: 'Business Systems',
};

export const DEPARTMENT_KEY_ORDER: DepartmentJsonKey[] = [
  'cse',
  'ise',
  'cse_aiml',
  'cse_ds',
  'cse_cysec',
  'cse_bs',
  'ece',
  'civil',
  'mechanical',
  'mba',
  'basic_sciences',
];

