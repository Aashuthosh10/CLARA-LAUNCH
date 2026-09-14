import { describe, expect, it } from 'vitest';
import {
  matchCampusDestinationIndex,
  normalizeCampusDestinationTranscript,
} from '../matchCampusDestination';
import type { CampusDirection } from '../campusDirections';

const sampleDirections: CampusDirection[] = [
  {
    from: 'Reception',
    to: 'B-004 - Principal Chamber',
    block: 'B',
    floor: 'Ground Floor',
    steps: ['Go to B-004'],
    estimated_steps: 40,
    estimated_time_seconds: 30,
  },
  {
    from: 'Reception',
    to: 'B-210 - Mechanical Lab',
    block: 'B',
    floor: 'Second Floor',
    steps: ['Go to B-210'],
    estimated_steps: 80,
    estimated_time_seconds: 60,
  },
  {
    from: 'Reception',
    to: 'C-003 - Library',
    block: 'C',
    floor: 'Ground Floor',
    steps: ['Go to C-003'],
    estimated_steps: 50,
    estimated_time_seconds: 40,
  },
];

describe('matchCampusDestination Indic-safe normalize', () => {
  it('does not strip Kannada or Hindi loanword glyphs', () => {
    const kn = normalizeCampusDestinationTranscript('ಪ್ರಿನ್ಸಿಪಲ್ ಕ್ಯಾಬಿನ್ ಎಲ್ಲಿದೆ');
    expect(kn).toMatch(/ಪ್ರಿನ್ಸಿಪಲ್/);
    expect(kn).toMatch(/ಕ್ಯಾಬಿನ್/);
    const hi = normalizeCampusDestinationTranscript('प्रिंसिपल केबिन कहाँ है');
    expect(hi).toMatch(/प्रिंसिपल/);
    expect(hi).toMatch(/केबिन/);
  });

  it('still matches English room codes locally', () => {
    const idx = matchCampusDestinationIndex('where is B-210', sampleDirections);
    expect(idx).toBe(1);
  });

  it('matches English destination labels', () => {
    const idx = matchCampusDestinationIndex('library', sampleDirections);
    expect(idx).toBe(2);
  });
});
