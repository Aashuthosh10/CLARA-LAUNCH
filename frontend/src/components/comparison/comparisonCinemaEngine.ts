/** Split long cell prose into short atomic insights for auto-flip (no scroll). */
export function splitIntoPoints(text: string): string[] {
  const raw = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!raw || raw === '—') return [];

  // Prefer sentence / line / bullet boundaries; avoid splitting mid-token.
  const fragments = raw
    .split(/\n+|•|\u2022|-\s+|(?<=[.!?])\s+/)
    .map((t) => t.replace(/^[•\s\u2022-]+/u, '').trim())
    .filter(Boolean);

  const minLen = 20;
  let points = fragments.filter((t) => t.length >= minLen);
  if (points.length === 0 && raw.length >= minLen) points = [raw];
  if (points.length === 0 && raw.length > 0 && raw.length < minLen) points = [raw];

  return points;
}

export type ComparisonPointsMatrix = Record<string, Record<string, string[]>>;

export function buildComparisonPointsMatrix(
  deptIds: string[],
  rowOrder: string[],
  getLocalizedCell: (deptId: string, rowKey: string) => string,
): ComparisonPointsMatrix {
  const out: ComparisonPointsMatrix = {};
  for (const id of deptIds) {
    out[id] = {};
    for (const rowKey of rowOrder) {
      const cell = getLocalizedCell(id, rowKey);
      const pts = splitIntoPoints(cell);
      out[id][rowKey] = pts.length ? pts : cell && cell !== '—' ? [cell] : ['—'];
    }
  }
  return out;
}

export function pickPointForColumn(
  points: string[] | undefined,
  pointIdx: number,
): string {
  const list = points && points.length ? points : ['—'];
  return list[pointIdx % list.length] ?? '—';
}

export function maxPointsForSection(
  deptIds: string[],
  rowKey: string,
  matrix: ComparisonPointsMatrix,
): number {
  if (!deptIds.length) return 1;
  return Math.max(
    1,
    ...deptIds.map((id) => Math.max(1, matrix[id]?.[rowKey]?.length ?? 1)),
  );
}
