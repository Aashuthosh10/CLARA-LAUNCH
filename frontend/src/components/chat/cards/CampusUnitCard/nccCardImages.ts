import ncc1 from '../../../../assets/ncc/1.jpg';
import ncc2 from '../../../../assets/ncc/2.jpeg';
import ncc3 from '../../../../assets/ncc/3.jpeg';
import ncc4 from '../../../../assets/ncc/4.jpeg';

/** unitId → bundled photo for CampusUnitCard image slot. */
export const NCC_CARD_IMAGES: Record<string, string> = {
  'ncc.overview': ncc1,
  'ncc.leadership': ncc2,
  'ncc.training': ncc3,
  'ncc.benefits': ncc4,
};

export function nccImageForUnit(unitId: string): string | null {
  const src = NCC_CARD_IMAGES[(unitId || '').trim().toLowerCase()];
  return src || null;
}
