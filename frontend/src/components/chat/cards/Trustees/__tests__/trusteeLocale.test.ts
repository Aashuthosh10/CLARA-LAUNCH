import { describe, expect, it } from 'vitest';
import { collegeDataForLanguage } from '../../../../../hooks/useCollegeData';
import { trusteeBoardLabel, trusteesForLanguage } from '../trusteeLocale';

describe('trustee locale cards', () => {
  it('loads seven trustees from localized source data, not hardcoded English', () => {
    const kn = trusteesForLanguage('Kannada');
    expect(kn).toHaveLength(7);
    expect(kn[0].id).toBe('holla');
    expect(kn[0].name).toContain('ಹೊಳ್ಳ');
    expect(kn[0].description).toContain('ಸ್ಥಾಪಕ');
    expect(kn[0].tts_summary).toBe(kn[0].description);
    expect(kn[0].description.includes('Rajyothsava')).toBe(false);
    expect(trusteeBoardLabel('Kannada')).toContain('ಟ್ರಸ್ಟಿ');
  });

  it('keeps official Latin names as identity while displaying locale names', () => {
    const knHolders = collegeDataForLanguage('Kannada').role_holders;
    expect(knHolders?.trustees?.[0]?.name).toBe('Prof. M. R. Holla');
    expect(knHolders?.hod_by_department?.cse?.hod_name).toBe('Dr. Shashikumar D R');
    expect(knHolders?.hod_by_department?.cse?.hod_bio).toBeUndefined();
    expect(knHolders?.hod_by_department?.cse?.hod_bio_source).toBe('departments.cse.hod_voice');
  });

  it('reports missing official HOD records instead of inventing people', () => {
    const gaps = collegeDataForLanguage('Kannada').role_holders?.localization_gaps || [];
    expect(gaps).toContain('hod_by_department.cse_bs.no_official_record');
    expect(gaps).toContain('hod_by_department.cse_cysec.no_official_record');
  });
});
