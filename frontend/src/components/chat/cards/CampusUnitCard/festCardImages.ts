import sanchalana from '../../../../assets/fest/sanchalana.jpeg';
import techvidya from '../../../../assets/fest/techvidya.jpeg';
import sangama from '../../../../assets/fest/sangama.png';
import vignotsava from '../../../../assets/fest/vignotsava.jpeg';
import projectExpo from '../../../../assets/fest/project_expo.png';

/** unitId → bundled photo for CampusUnitCard image slot. */
export const FEST_CARD_IMAGES: Record<string, string> = {
  'events.sanchalana': sanchalana,
  'events.techvidya': techvidya,
  'events.sangama': sangama,
  'events.vignotsava': vignotsava,
  'events.project_expo': projectExpo,
};

export function festImageForUnit(unitId: string): string | null {
  const src = FEST_CARD_IMAGES[(unitId || '').trim().toLowerCase()];
  return src || null;
}
