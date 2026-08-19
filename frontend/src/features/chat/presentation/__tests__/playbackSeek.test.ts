import { describe, expect, it } from 'vitest';
import {
  findClipIndexForTarget,
  nextPlayheadAfterClip,
  segmentKeysFromPlayhead,
  unitIdForCardIndex,
} from '../playbackSeek';

const CSE_SEGS = [
  { unitId: 'cse.overview', sectionId: 'intro', cardIndex: 0 },
  { unitId: 'cse.hod', sectionId: 'hod_voice', cardIndex: 1 },
  { unitId: 'cse.achievements', sectionId: 'achievements', cardIndex: 2 },
  { unitId: 'cse.placements', sectionId: 'placement', cardIndex: 3 },
  { unitId: 'cse.fees', sectionId: 'fees', cardIndex: 4 },
];

const HOD_SEGS = [
  { unitId: 'cse_aiml.hod', sectionId: 'hod_voice', cardIndex: 0 },
  { unitId: 'cse_ds.hod', sectionId: 'hod_voice', cardIndex: 1 },
];

describe('unitIdForCardIndex', () => {
  it('returns plan unitId for a five-card department', () => {
    expect(unitIdForCardIndex(CSE_SEGS, 0)).toBe('cse.overview');
    expect(unitIdForCardIndex(CSE_SEGS, 4)).toBe('cse.fees');
  });

  it('keeps multi-HOD unitIds distinct despite duplicate sectionId', () => {
    expect(unitIdForCardIndex(HOD_SEGS, 0)).toBe('cse_aiml.hod');
    expect(unitIdForCardIndex(HOD_SEGS, 1)).toBe('cse_ds.hod');
  });
});

describe('findClipIndexForTarget', () => {
  const clips = CSE_SEGS.map((s, i) => ({
    segmentKey: `k${i}`,
    unitId: s.unitId,
    chunkIndex: i,
    sectionId: s.sectionId,
  }));

  it('right-arrow from clip 0 seeks cse.hod by unitId, not by wiping the list', () => {
    expect(findClipIndexForTarget(clips, { unitId: 'cse.hod', cardIndex: 1 })).toBe(1);
    expect(clips).toHaveLength(5);
  });

  it('left-arrow from clip 2 seeks cse.hod', () => {
    expect(findClipIndexForTarget(clips, { unitId: 'cse.hod', cardIndex: 1 })).toBe(1);
  });

  it('does not collapse duplicate hod_voice sectionIds', () => {
    const hodClips = HOD_SEGS.map((s, i) => ({
      segmentKey: `h${i}`,
      unitId: s.unitId,
      chunkIndex: i,
      sectionId: s.sectionId,
    }));
    expect(findClipIndexForTarget(hodClips, { unitId: 'cse_ds.hod', cardIndex: 1 })).toBe(1);
    expect(hodClips[0]!.sectionId).toBe(hodClips[1]!.sectionId);
  });

  it('returns -1 when target audio has not arrived yet', () => {
    expect(findClipIndexForTarget(clips.slice(0, 1), { unitId: 'cse.fees', cardIndex: 4 })).toBe(-1);
  });
});

describe('nextPlayheadAfterClip', () => {
  it('advances toward the final card and does not wrap', () => {
    expect(nextPlayheadAfterClip(0, 5)).toBe(1);
    expect(nextPlayheadAfterClip(4, 5)).toBe(5);
  });
});

describe('segmentKeysFromPlayhead', () => {
  it('releases the target clip and later clips so left-seek can replay', () => {
    const clips = CSE_SEGS.map((s, i) => ({
      segmentKey: `k${i}`,
      unitId: s.unitId,
      chunkIndex: i,
    }));
    expect(segmentKeysFromPlayhead(clips, 1)).toEqual(['k1', 'k2', 'k3', 'k4']);
  });
});
