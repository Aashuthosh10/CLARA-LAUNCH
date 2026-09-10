import { describe, expect, it } from 'vitest';
import { CREATORS_FIVE } from '../data/aboutData';

describe('About Me creators', () => {
  it('does not include Chinmayi Shastry L', () => {
    const names = CREATORS_FIVE.map((c) => c.name.toUpperCase());
    expect(names).not.toContain('CHINMAYI SHASTRY L');
    expect(names.some((n) => n.includes('CHINMAYI'))).toBe(false);
    expect(CREATORS_FIVE).toHaveLength(4);
    expect(CREATORS_FIVE.map((c) => c.id)).toEqual(['c1', 'c2', 'c4', 'c5']);
  });
});
