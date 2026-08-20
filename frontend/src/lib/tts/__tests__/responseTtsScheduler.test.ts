import { describe, expect, it, vi } from 'vitest';
import { createAckPlayer } from '../ackAudio';
import { createResponseTtsScheduler } from '../responseTtsScheduler';

const TINY_WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

class FakeAudio {
  src: string;
  paused = false;
  dataset: Record<string, string> = {};
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(src: string) {
    this.src = src;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  removeAttribute() {}
}

describe('ack isolation', () => {
  it('ACK onended never advances response playhead', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    const playheadBefore = scheduler.playhead;
    const ack = createAckPlayer({ AudioCtor: FakeAudio as unknown as typeof Audio });
    ack.play(TINY_WAV);
    scheduler.ignoreNonResponseComplete();
    expect(scheduler.playhead).toBe(playheadBefore);
    expect(scheduler.snapshot().clips).toEqual([]);
  });

  it('ACK stop does not complete a READY clip', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    const ack = createAckPlayer({ AudioCtor: FakeAudio as unknown as typeof Audio });
    ack.play(TINY_WAV);
    ack.stop();
    expect(scheduler.snapshot().clips[0]?.status).toBe('READY');
    expect(scheduler.playhead).toBe(0);
  });
});

describe('response TTS scheduler', () => {
  const LANGS = ['en', 'kn', 'hi', 'ta', 'te', 'ml'] as const;

  it.each(LANGS)('%s: ingest places clips by sequence not arrival order', (lang) => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn(`${lang}-turn`);
    scheduler.ingestClip({
      turnId: `${lang}-turn`,
      sequence: 1,
      audioBase64: TINY_WAV,
      unitId: 'u1',
    });
    scheduler.ingestClip({
      turnId: `${lang}-turn`,
      sequence: 0,
      audioBase64: TINY_WAV,
      unitId: 'u0',
    });
    const snap = scheduler.snapshot();
    expect(snap.clips.map((c) => c.unitId)).toEqual(['u0', 'u1']);
    expect(scheduler.nextPlayable()?.sequence).toBe(0);
  });

  it('duplicate READY clip is not replaced or double-queued', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV + TINY_WAV });
    expect(scheduler.snapshot().clips).toHaveLength(1);
    expect(scheduler.snapshot().clips[0]?.audioBase64).toBe(TINY_WAV);
  });

  it('stale-turn ingest is rejected', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    scheduler.ingestClip({ turnId: 'turn-b', sequence: 0, audioBase64: TINY_WAV });
    expect(scheduler.snapshot().clips).toHaveLength(1);
    expect(scheduler.turnId).toBe('turn-a');
  });

  it('current-turn ingest is accepted while PENDING/GENERATING', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    const snap = scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    expect(snap.clips[0]?.status).toBe('READY');
    expect(scheduler.isPresentationReady()).toBe(true);
  });

  it('first playable clip presents while later clips are still PENDING', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.setExpectedCount(3);
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    expect(scheduler.isPresentationReady()).toBe(true);
    expect(scheduler.nextPlayable()?.sequence).toBe(0);
    expect(scheduler.snapshot().clips[1]?.status).toBe('PENDING');
    expect(scheduler.snapshot().clips[2]?.status).toBe('PENDING');
  });

  it('FAILED first clip still presents when a later clip is READY', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioUnavailable: true });
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 1, audioBase64: TINY_WAV });
    expect(scheduler.isPresentationReady()).toBe(true);
    expect(scheduler.nextPlayable()?.sequence).toBe(1);
  });

  it('invalid/empty audio is FAILED not READY', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: '' });
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 1, audioUnavailable: true });
    expect(scheduler.snapshot().clips[0]?.status).toBe('FAILED');
    expect(scheduler.snapshot().clips[1]?.status).toBe('FAILED');
    expect(scheduler.isPresentationReady()).toBe(false);
  });

  it('completeClip only from response sources advances playhead', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 1, audioBase64: TINY_WAV });
    scheduler.markPlaying(0);
    scheduler.completeClip(0, 'response-ended');
    expect(scheduler.playhead).toBe(1);
    expect(scheduler.nextPlayable()?.sequence).toBe(1);
  });

  it('play() rejection marks FAILED and unblocks the next clip', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 1, audioBase64: TINY_WAV });
    scheduler.markPlaying(0);
    scheduler.completeClip(0, 'response-error');
    expect(scheduler.snapshot().clips[0]?.status).toBe('FAILED');
    expect(scheduler.nextPlayable()?.sequence).toBe(1);
  });

  it('watchdog source marks FAILED and advances', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    scheduler.markPlaying(0);
    scheduler.completeClip(0, 'watchdog');
    expect(scheduler.snapshot().clips[0]?.status).toBe('FAILED');
    expect(scheduler.phase).toBe('FAILED');
  });

  it('missing sequence stays PENDING and does not play later clips first', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.setExpectedCount(2);
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 1, audioBase64: TINY_WAV });
    expect(scheduler.nextPlayable()).toBeNull();
    expect(scheduler.isPresentationReady()).toBe(false);
  });

  it('new turn cancel does not leak previous clips', () => {
    const scheduler = createResponseTtsScheduler();
    scheduler.beginTurn('turn-a');
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    scheduler.beginTurn('turn-b');
    expect(scheduler.snapshot().clips).toEqual([]);
    expect(scheduler.playhead).toBe(0);
  });

  it('ACK-before-TTS and ACK-after-READY leave sequence at 0 until response completes', () => {
    const scheduler = createResponseTtsScheduler();
    const ack = createAckPlayer({ AudioCtor: FakeAudio as unknown as typeof Audio });
    scheduler.beginTurn('turn-a');
    ack.play(TINY_WAV);
    expect(scheduler.playhead).toBe(0);
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    ack.stop();
    ack.play(TINY_WAV);
    expect(scheduler.nextPlayable()?.sequence).toBe(0);
    expect(scheduler.playhead).toBe(0);
  });

  it('cached clip arriving immediately after ACK is still playable at sequence 0', () => {
    vi.useFakeTimers();
    const scheduler = createResponseTtsScheduler();
    const ack = createAckPlayer({ AudioCtor: FakeAudio as unknown as typeof Audio });
    scheduler.beginTurn('turn-a');
    ack.play(TINY_WAV);
    scheduler.ingestClip({ turnId: 'turn-a', sequence: 0, audioBase64: TINY_WAV });
    expect(scheduler.nextPlayable()?.sequence).toBe(0);
    vi.useRealTimers();
  });
});
