import { describe, expect, it } from 'vitest';
import { mergeTtsAudioQueue } from '../useWebSocket';

describe('mergeTtsAudioQueue', () => {
  it('keeps a complete incoming unit-backed queue when the previous turn frame had none', () => {
    expect(mergeTtsAudioQueue(['a', 'b', 'c', 'd', 'e'], undefined)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('does not replace a streamed 5-clip queue with a single final backup', () => {
    expect(mergeTtsAudioQueue(['backup'], ['c0', 'c1', 'c2', 'c3', 'c4'])).toEqual([
      'c0',
      'c1',
      'c2',
      'c3',
      'c4',
    ]);
  });

  it('uses the incoming queue when it is at least as long as the previous', () => {
    expect(mergeTtsAudioQueue(['n0', 'n1'], ['o0'])).toEqual(['n0', 'n1']);
  });
});
