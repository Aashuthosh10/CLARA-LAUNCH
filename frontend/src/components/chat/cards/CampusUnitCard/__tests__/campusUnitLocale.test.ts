import { describe, expect, it } from 'vitest';
import { campusUnitFromLocale } from '../campusUnitLocale';

describe('campus unit locale cards', () => {
  it('keeps the same unitId across languages and marks sample content', () => {
    const en = campusUnitFromLocale('hostel.girls.rooms', 'English');
    const kn = campusUnitFromLocale('hostel.girls.rooms', 'Kannada');
    expect(en?.content_status).toBe('SAMPLE_REPLACE_WITH_OFFICIAL');
    expect(kn?.content_status).toBe('SAMPLE_REPLACE_WITH_OFFICIAL');
    expect(en?.title).not.toBe(kn?.title);
    expect(kn?.title).toContain('ಕೊಠಡಿ');
    expect(en?.tts_summary).toContain('rooms');
    expect(kn?.tts_summary).not.toContain('Showing');
  });

  it('does not silently reuse another unit', () => {
    const rooms = campusUnitFromLocale('hostel.girls.rooms', 'English');
    const food = campusUnitFromLocale('hostel.girls.food', 'English');
    const boys = campusUnitFromLocale('hostel.boys.rooms', 'English');
    expect(rooms?.title).not.toBe(food?.title);
    expect(rooms?.title).not.toBe(boys?.title);
  });
});
