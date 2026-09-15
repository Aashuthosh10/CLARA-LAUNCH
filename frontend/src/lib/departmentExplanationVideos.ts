/**
 * Canonical department_key → on-disk muted explanation video.
 * Only maps files that actually exist under public/assets/department_explanations/.
 * Unmapped departments render the HOD-style card without video (gradient/portrait fallback).
 */
export const DEPARTMENT_EXPLANATION_VIDEO_BY_KEY: Record<string, string> = {
  cse_ds: '/assets/department_explanations/datascience.mp4',
  cse_cysec: '/assets/department_explanations/cyber_security.mp4',
  ece: '/assets/department_explanations/ece.mp4',
  cse_bs: '/assets/department_explanations/business_studies.mp4',
};

export function departmentExplanationVideoSrc(deptKey: string): string | undefined {
  const key = (deptKey || '').trim().toLowerCase();
  return DEPARTMENT_EXPLANATION_VIDEO_BY_KEY[key];
}
