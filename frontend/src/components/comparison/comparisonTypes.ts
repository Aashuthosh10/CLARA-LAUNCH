export type ComparisonLangCode = 'en' | 'kn' | 'hi' | 'ta' | 'te' | 'ml';

export type ComparisonCellBlock = Partial<Record<ComparisonLangCode, string>>;

export type ComparisonDeptBlock = {
  display_names?: ComparisonCellBlock | null;
  cells?: Record<string, ComparisonCellBlock> | null;
};

export type DepartmentComparisonRegistry = {
  schema_version: number;
  row_order: string[];
  row_labels: Record<string, ComparisonCellBlock>;
  department_order: string[];
  departments: Record<string, ComparisonDeptBlock>;
};
