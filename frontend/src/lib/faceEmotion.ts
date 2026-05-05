import type { FaceEmotion } from '../hooks/useFaceChannel';

export function inferEmotionFromPayload(payload: any): FaceEmotion {
  const raw = String(
    payload?.faceEmotion ??
      payload?.emotion ??
      payload?.emotionHint ??
      payload?.mood ??
      '',
  ).toLowerCase();
  if (raw === 'calm' || raw === 'idle' || raw === 'neutral') return 'neutral';
  if (raw === 'happy' || raw === 'joy' || raw === 'friendly') return 'happy';
  if (raw === 'focused' || raw === 'thinking' || raw === 'concentrating') return 'focused';
  if (raw === 'confused' || raw === 'uncertain' || raw === 'error') return 'confused';
  return 'neutral';
}
