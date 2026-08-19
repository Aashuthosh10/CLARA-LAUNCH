import { describe, expect, it } from 'vitest';
import {
  advancePlayheadAfterSlot,
  clipSlotCount,
  markClipCompleted,
  mergeTtsClipSlot,
  shouldIgnoreLateClip,
  type TtsClipSlot,
} from '../ttsClipSlots';

const WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

function slot(
  index: number,
  status: TtsClipSlot['status'],
  extra?: Partial<TtsClipSlot>,
): TtsClipSlot {
  return {
    turnId: 'turn-b',
    unitId: `u${index}`,
    segmentIndex: index,
    status,
    ...extra,
  };
}

describe('mergeTtsClipSlot', () => {
  it('keeps holes so a failed middle clip does not shrink length', () => {
    let slots: TtsClipSlot[] = [];
    slots = mergeTtsClipSlot(slots, {
      turnId: 't1',
      segmentIndex: 0,
      audioBase64: WAV,
      unitId: 'cse_aiml.hod',
    });
    slots = mergeTtsClipSlot(slots, {
      turnId: 't1',
      segmentIndex: 2,
      audioBase64: WAV,
      unitId: 'cse.hod',
    });
    slots = mergeTtsClipSlot(slots, {
      turnId: 't1',
      segmentIndex: 1,
      audioUnavailable: true,
      unitId: 'cse_ds.hod',
    });
    expect(clipSlotCount(slots)).toBe(3);
    expect(slots.map((s) => s.status)).toEqual(['PLAYABLE', 'FAILED', 'PLAYABLE']);
    expect(slots.map((s) => s.unitId)).toEqual(['cse_aiml.hod', 'cse_ds.hod', 'cse.hod']);
  });

  it('treats empty audio the same as a timeout/unavailable failure', () => {
    const slots = mergeTtsClipSlot([], {
      turnId: 't1',
      segmentIndex: 0,
      audioBase64: '',
      unitId: 'cse_ds.hod',
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]?.status).toBe('FAILED');
  });

  it('ignores late audio for a CANCELLED clip', () => {
    const slots: TtsClipSlot[] = [
      {
        turnId: 't1',
        unitId: 'cse_ds.hod',
        segmentIndex: 0,
        status: 'CANCELLED',
      },
    ];
    const next = mergeTtsClipSlot(slots, {
      turnId: 't1',
      segmentIndex: 0,
      audioBase64: WAV,
      unitId: 'cse_ds.hod',
    });
    expect(next[0]?.status).toBe('CANCELLED');
    expect(next[0]?.audioBase64).toBeUndefined();
  });

  it('ignores a clip from another turn', () => {
    const slots: TtsClipSlot[] = [
      slot(0, 'PLAYABLE', { turnId: 'turn-b', audioBase64: WAV }),
    ];
    const next = mergeTtsClipSlot(slots, {
      turnId: 'turn-a',
      segmentIndex: 0,
      audioBase64: 'other',
    });
    expect(next[0]?.audioBase64).toBe(WAV);
  });
});

describe('FAILED slot playhead', () => {
  it('advances to the next unitId without shrinking length', () => {
    const slots: TtsClipSlot[] = [
      slot(0, 'COMPLETED', { audioBase64: WAV }),
      slot(1, 'FAILED'),
      slot(2, 'PLAYABLE', { audioBase64: WAV }),
    ];
    expect(clipSlotCount(slots)).toBe(3);
    const afterFail = advancePlayheadAfterSlot(slots, 1);
    expect(afterFail.playhead).toBe(2);
    expect(afterFail.next?.unitId).toBe('u2');
    expect(afterFail.next?.status).toBe('PLAYABLE');
    expect(clipSlotCount(slots)).toBe(3);
  });
});

describe('shouldIgnoreLateClip', () => {
  it('drops late onended after playbackGen bump', () => {
    expect(
      shouldIgnoreLateClip({
        clipTurnId: 't1',
        activeTurnId: 't1',
        clipStatus: 'PLAYABLE',
        playbackGen: 4,
        startedGen: 3,
      }),
    ).toBe(true);
  });

  it('drops late chunk after turn fence / other turn', () => {
    expect(
      shouldIgnoreLateClip({
        clipTurnId: 'turn-a',
        activeTurnId: 'turn-b',
        clipStatus: 'PLAYABLE',
        playbackGen: 1,
        startedGen: 1,
      }),
    ).toBe(true);
  });
});

describe('markClipCompleted', () => {
  it('marks FAILED as COMPLETED after skip without removing the slot', () => {
    const slots = [slot(0, 'FAILED'), slot(1, 'PLAYABLE', { audioBase64: WAV })];
    const next = markClipCompleted(slots, 0);
    expect(next).toHaveLength(2);
    expect(next[0]?.status).toBe('COMPLETED');
    expect(next[1]?.status).toBe('PLAYABLE');
  });
});
