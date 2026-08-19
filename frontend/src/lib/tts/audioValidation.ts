/** Validate TTS payloads before the scheduler marks a clip READY. */

export type AudioValidationResult =
  | { ok: true; decodedBytes: number; durationMs: number | null }
  | { ok: false; reason: 'empty' | 'invalid_base64' | 'decoded_empty' | 'invalid_encoding' };

function decodeBase64(audioBase64: string): Uint8Array | null {
  try {
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function estimateWavDurationMs(bytes: Uint8Array): number | null {
  if (bytes.length < 44) return null;
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataSize = view.getUint32(40, true);
  if (sampleRate <= 0 || channels <= 0 || bitsPerSample <= 0) return null;
  const bytesPerSample = bitsPerSample / 8;
  const durationS = dataSize / (sampleRate * channels * bytesPerSample);
  if (!Number.isFinite(durationS) || durationS < 0) return null;
  return durationS * 1000;
}

export function validateTtsAudioBase64(audioBase64: unknown): AudioValidationResult {
  if (typeof audioBase64 !== 'string' || audioBase64.trim().length === 0) {
    return { ok: false, reason: 'empty' };
  }
  const bytes = decodeBase64(audioBase64.trim());
  if (!bytes) return { ok: false, reason: 'invalid_base64' };
  if (bytes.length === 0) return { ok: false, reason: 'decoded_empty' };
  const isRiff =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  if (!isRiff) return { ok: false, reason: 'invalid_encoding' };
  return {
    ok: true,
    decodedBytes: bytes.length,
    durationMs: estimateWavDurationMs(bytes),
  };
}

export function playbackWatchdogMs(durationMs: number | null): number {
  const estimated = durationMs && Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 4000;
  return Math.min(60_000, Math.max(4_000, estimated + 2_500));
}
