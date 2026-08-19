import { describe, expect, it } from 'vitest';
import { buildDepartmentSlideForUnit } from '../collegeLocaleUtils';
import type { CollegeLocaleData } from '../collegeLocaleUtils';

const data = {
  departments: {
    cse_ds: {
      name: 'CSE (Data Science)',
      intro: 'Data Science intro',
      hod_voice: 'Data Science HOD',
      fees: 'Data Science fees',
    },
    cse_aiml: {
      name: 'CSE (AI & ML)',
      intro: 'AIML intro',
      hod_voice: 'AIML HOD',
      fees: 'AIML fees',
    },
    cse: {
      name: 'CSE',
      intro: 'CSE intro',
      hod_voice: 'CSE HOD',
      fees: 'CSE fees',
    },
  },
} as unknown as CollegeLocaleData;

describe('mixed unit decks resolve against their own department', () => {
  it('reads each unit from the department in its unitId', () => {
    const units = ['cse_ds.overview', 'cse_aiml.hod', 'cse.fees'];
    const slides = units.map((u) => buildDepartmentSlideForUnit(data, u, 'English'));

    expect(slides[0]?.content).toBe('Data Science intro');
    expect(slides[1]?.content).toBe('AIML HOD');
    expect(slides[2]?.content).toBe('CSE fees');
  });

  it('does not read a sibling department when the topic slot matches', () => {
    const dsHod = buildDepartmentSlideForUnit(data, 'cse_ds.hod', 'English');
    const aimlHod = buildDepartmentSlideForUnit(data, 'cse_aiml.hod', 'English');

    expect(dsHod?.content).toBe('Data Science HOD');
    expect(aimlHod?.content).toBe('AIML HOD');
    expect(dsHod?.content).not.toBe(aimlHod?.content);
  });

  it('returns null for identities that are not department units', () => {
    expect(buildDepartmentSlideForUnit(data, 'documents.overview', 'English')).toBeNull();
    expect(buildDepartmentSlideForUnit(data, 'quantum_weaving.hod', 'English')).toBeNull();
    expect(buildDepartmentSlideForUnit(data, 'cse', 'English')).toBeNull();
  });
});
