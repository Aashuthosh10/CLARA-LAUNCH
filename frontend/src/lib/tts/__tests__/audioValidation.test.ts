import { describe, expect, it } from 'vitest';
import { playbackWatchdogMs, validateTtsAudioBase64 } from '../audioValidation';

const TINY_WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

describe('validateTtsAudioBase64', () => {
  it('accepts a RIFF WAV', () => {
    const result = validateTtsAudioBase64(TINY_WAV);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.decodedBytes).toBeGreaterThan(0);
  });

  it.each(['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Malayalam'])(
    '%s: empty audio is not READY',
    () => {
      expect(validateTtsAudioBase64('').ok).toBe(false);
      expect(validateTtsAudioBase64(null).ok).toBe(false);
    },
  );

  it('rejects invalid base64', () => {
    const result = validateTtsAudioBase64('%%%not-base64%%%');
    expect(result).toEqual({ ok: false, reason: 'invalid_base64' });
  });

  it('rejects non-WAV bytes', () => {
    const result = validateTtsAudioBase64(btoa('not-a-wav'));
    expect(result).toEqual({ ok: false, reason: 'invalid_encoding' });
  });

  it('bounds the playback watchdog', () => {
    expect(playbackWatchdogMs(null)).toBeGreaterThanOrEqual(4000);
    expect(playbackWatchdogMs(500)).toBeGreaterThanOrEqual(4000);
    expect(playbackWatchdogMs(120_000)).toBeLessThanOrEqual(60_000);
  });
});
