import { describe, expect, it } from 'vitest';
import {
  DAILY_THOUGHTS,
  getDailyThought,
  getDailyThoughtIndex,
  getThoughtDayKey,
} from '../dailyThoughts';

describe('daily thoughts', () => {
  it('contains the complete approved thought library', () => {
    expect(DAILY_THOUGHTS).toHaveLength(80);
  });

  it('keeps the previous thought day until 7:00 AM local time', () => {
    const previousDayAtSeven = new Date(2026, 8, 11, 7, 0, 0);
    const nextDayBeforeSeven = new Date(2026, 8, 12, 6, 59, 59);

    expect(getThoughtDayKey(nextDayBeforeSeven)).toBe('2026-09-11');
    expect(getDailyThought(nextDayBeforeSeven)).toBe(getDailyThought(previousDayAtSeven));
  });

  it('changes deterministically at 7:00 AM local time', () => {
    const beforeBoundary = new Date(2026, 8, 12, 6, 59, 59);
    const atBoundary = new Date(2026, 8, 12, 7, 0, 0);
    const laterThatDay = new Date(2026, 8, 12, 23, 59, 59);

    expect(getThoughtDayKey(atBoundary)).toBe('2026-09-12');
    expect(getDailyThoughtIndex(atBoundary)).not.toBe(getDailyThoughtIndex(beforeBoundary));
    expect(getDailyThought(laterThatDay)).toBe(getDailyThought(atBoundary));
  });
});
