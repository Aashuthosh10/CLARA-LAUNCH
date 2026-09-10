import { describe, expect, it } from 'vitest';
import { campusUnitFromLocale } from '../campusUnitLocale';
import { uiText } from '../../../../../localization/uiCopy';

describe('campus unit locale cards', () => {
  it('loads official hostel content across languages', () => {
    const en = campusUnitFromLocale('hostel.girls.overview', 'English');
    const kn = campusUnitFromLocale('hostel.girls.overview', 'Kannada');
    const hi = campusUnitFromLocale('hostel.girls.overview', 'Hindi');
    expect(en?.content_status).not.toBe('SAMPLE_REPLACE_WITH_OFFICIAL');
    expect(kn?.content_status).not.toBe('SAMPLE_REPLACE_WITH_OFFICIAL');
    expect(en?.title).not.toBe(kn?.title);
    expect(kn?.title).toMatch(/ಹುಡುಗಿಯ|ಹಾಸ್ಟೆಲ್/);
    expect(en?.body).not.toBe(uiText('English', 'availability.official_fact_blocked'));
    expect(en?.tts_summary).not.toContain('SAMPLE_REPLACE_WITH_OFFICIAL');
    expect(kn?.tts_summary).not.toContain('Showing');
    expect(kn?.title).not.toContain('ಮಾದರಿ');
    expect(Array.isArray(en?.points)).toBe(true);
    expect((en?.points || []).length).toBeGreaterThan(0);
    expect(en?.supporting_line).toBeTruthy();
    expect(en?.image ?? null).toBeNull();
    expect(hi?.title).toMatch(/[\u0900-\u097f]/u);
    expect(hi?.title).not.toContain('SAMPLE_REPLACE_WITH_OFFICIAL');
  });

  it('keeps canteen sample content blocked for display', () => {
    const en = campusUnitFromLocale('canteen.hygiene', 'English');
    const kn = campusUnitFromLocale('canteen.hygiene', 'Kannada');
    expect(en?.content_status).toBe('SAMPLE_REPLACE_WITH_OFFICIAL');
    expect(en?.body).toBe(uiText('English', 'availability.official_fact_blocked'));
    expect(kn?.body).toBe(
      'ಈ ಮಾಹಿತಿಯನ್ನು ಇನ್ನೂ ಅಧಿಕೃತವಾಗಿ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ.\nಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಸಂಬಂಧಿತ ವಿಭಾಗವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    );
    expect(kn?.tts_summary).not.toContain('SAMPLE_REPLACE_WITH_OFFICIAL');
  });

  it('does not silently reuse another unit', () => {
    const overview = campusUnitFromLocale('hostel.girls.overview', 'English');
    const mess = campusUnitFromLocale('hostel.mess', 'English');
    const boys = campusUnitFromLocale('hostel.boys.overview', 'English');
    expect(overview?.title).not.toBe(mess?.title);
    expect(overview?.title).not.toBe(boys?.title);
  });
});
