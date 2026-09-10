/** Subset of backend locales (en, hi, kn, ta, te, ml) departments + root shape used by the UI. */

export interface CollegeDepartmentRecord {
  name?: string;
  intro?: string;
  hod_voice?: string;
  achievements?: string;
  placement?: string;
  fees?: string;
  // deprecated/old fields
  hod?: string;
  intake?: string | number;
  duration?: string;
  overview_and_focus?: string;
  faculty_list?: string[];
  additional_details?: Record<string, unknown>;
}

export interface RoleHolderPrincipal {
  name?: string;
  title?: string;
  profile?: string;
}

export interface RoleHolderTrustee {
  id?: string;
  name?: string;
  display_name?: string;
  designation?: string;
  description?: string;
  tts_summary?: string;
  image_key?: string;
  localization_status?: string;
}

export interface RoleHolderDepartment {
  department_name?: string;
  hod_name?: string;
  hod_title?: string;
  hod_bio?: string;
  hod_bio_source?: string;
  aliases?: string[];
}

export interface RoleHoldersRecord {
  ui?: {
    board_label?: string;
  };
  principal?: RoleHolderPrincipal;
  vice_principal?: RoleHolderPrincipal;
  trustees?: RoleHolderTrustee[];
  hod_by_department?: Record<string, RoleHolderDepartment>;
  localization_gaps?: string[];
}

export interface CollegeLocaleData {
  institution_overview?: Record<string, unknown>;
  leadership?: Array<{ role?: string; name?: string }>;
  admissions_and_fees?: Record<string, unknown>;
  departments?: Record<string, CollegeDepartmentRecord>;
  placements_and_training?: Record<string, unknown>;
  role_holders?: RoleHoldersRecord;
  campus_units?: Record<string, CampusUnitRecord>;
}

export interface CampusUnitWardenRecord {
  name?: string;
  role?: string;
  title?: string;
  phone?: string;
  email?: string;
}

export interface CampusUnitTimingsRecord {
  breakfast?: string;
  lunch?: string;
  snacks?: string;
  dinner?: string;
}

export interface CampusUnitRecord {
  content_status?: string;
  title?: string;
  body?: string;
  tts_summary?: string;
  points?: string[];
  supporting_line?: string;
  /** Reserved image slot; null/absent means empty container (no fetch). */
  image?: string | null;
  imageSrc?: string | null;
  warden?: CampusUnitWardenRecord;
  timings?: CampusUnitTimingsRecord;
}
