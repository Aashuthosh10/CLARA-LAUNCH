/** Subset of backend locales (en, hi, kn, ta, te, ml) departments + root shape used by the UI. */

export interface CollegeDepartmentRecord {
  name?: string;
  hod?: string;
  intake?: string | number;
  duration?: string;
  overview_and_focus?: string;
  faculty_list?: string[];
  additional_details?: Record<string, unknown>;
}

export interface CollegeLocaleData {
  institution_overview?: Record<string, unknown>;
  leadership?: Array<{ role?: string; name?: string }>;
  admissions_and_fees?: Record<string, unknown>;
  departments?: Record<string, CollegeDepartmentRecord>;
  placements_and_training?: Record<string, unknown>;
}
