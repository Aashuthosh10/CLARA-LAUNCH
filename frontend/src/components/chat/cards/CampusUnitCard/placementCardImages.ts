import placementHead from '../../../../assets/placement_head.jpeg';
import placementCompanies from '../../../../assets/compnies.jpeg';
import placementAnalytics from '../../../../assets/placement_analytics.png';

/** unitId → bundled photo for CampusUnitCard / person card. */
export const PLACEMENT_CARD_IMAGES: Record<string, string> = {
  'placement.head': placementHead,
  'placement.companies': placementCompanies,
  'placement.analytics': placementAnalytics,
};

export function placementImageForUnit(unitId: string): string | null {
  const src = PLACEMENT_CARD_IMAGES[(unitId || '').trim().toLowerCase()];
  return src || null;
}

export function isPlacementImageFirstUnit(unitId: string): boolean {
  const uid = (unitId || '').trim().toLowerCase();
  return uid === 'placement.companies' || uid === 'placement.analytics';
}
