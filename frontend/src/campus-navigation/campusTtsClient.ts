import { claraHttpBase } from './claraHttpBase';
import type { Language } from '../context/LanguageContext';

/** HTTP campus TTS; returns base64 audio or null on failure / empty body. */
export async function postCampusTtsHttp(text: string, language: Language): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;
  try {
    const res = await fetch(`${claraHttpBase()}/api/campus/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, language }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { audioBase64?: string };
    const audioBase64 = typeof body?.audioBase64 === 'string' ? body.audioBase64 : '';
    return audioBase64.length > 0 ? audioBase64 : null;
  } catch {
    return null;
  }
}
