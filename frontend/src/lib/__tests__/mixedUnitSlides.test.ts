import { describe, expect, it } from 'vitest';
import { buildDepartmentSlideForUnit } from '../collegeLocaleUtils';
import type { CollegeLocaleData } from '../../types/collegeData';

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
    cse_bs: {
      name: 'CSE (Business Systems)',
      intro: 'Business Systems intro',
      hod_voice: 'Business Systems HOD',
      placement: 'Business Systems placements',
      fees: 'Business Systems fees',
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

  it('resolves cse_bs and department placements against their own unit, not a sibling', () => {
    const bsPlacement = buildDepartmentSlideForUnit(data, 'cse_bs.placements', 'English');
    const dsPlacement = buildDepartmentSlideForUnit(data, 'cse_ds.placements', 'English');
    const aimlPlacement = buildDepartmentSlideForUnit(data, 'cse_aiml.placements', 'English');
    const csePlacement = buildDepartmentSlideForUnit(data, 'cse.placements', 'English');

    expect(bsPlacement?.content).toBe('Business Systems placements');
    expect(dsPlacement?.content).not.toBe('Business Systems placements');
    expect(aimlPlacement).not.toBeNull();
    expect(csePlacement).not.toBeNull();
    expect(buildDepartmentSlideForUnit(data, 'cse_bs.overview', 'English')?.content).toBe(
      'Business Systems intro',
    );
  });

  it('keeps department placement content in a regional language', () => {
    const knData = {
      departments: {
        cse_ds: { name: 'CSE (Data Science)', placement: 'ಡೇಟಾ ಸೈನ್ಸ್ ಪ್ಲೇಸ್‌ಮೆಂಟ್' },
      },
    } as unknown as CollegeLocaleData;
    const slide = buildDepartmentSlideForUnit(knData, 'cse_ds.placements', 'Kannada');
    expect(slide?.content).toContain('ಪ್ಲೇಸ್‌ಮೆಂಟ್');
  });
});
