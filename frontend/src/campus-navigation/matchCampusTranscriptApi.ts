import { claraHttpBase } from './claraHttpBase';
import type { CampusMatchApiResponse } from './campusMapTypes';

export async function matchCampusTranscriptApi(transcript: string): Promise<CampusMatchApiResponse | null> {
  const trimmed = transcript.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(`${claraHttpBase()}/api/campus/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: trimmed }),
    });
    if (!res.ok) return null;
    return (await res.json()) as CampusMatchApiResponse;
  } catch {
    return null;
  }
}
