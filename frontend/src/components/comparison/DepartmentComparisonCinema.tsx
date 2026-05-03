import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Language } from '../../context/LanguageContext';
import { DEPARTMENT_JSON_KEY_ORDER } from '../../lib/collegeLocaleUtils';
import comparisonRegistry from '../../data/departmentComparison.json';
import { comparisonChrome, type ComparisonChrome } from './comparisonCopy';
import type {
  ComparisonDeptBlock,
  ComparisonLangCode,
  DepartmentComparisonRegistry,
} from './comparisonTypes';

const REG = comparisonRegistry as DepartmentComparisonRegistry;

const SECTION_FADE = { duration: 0.42, ease: 'easeInOut' } as const;

const langToCode = (language: Language): ComparisonLangCode => {
  switch (language) {
    case 'Kannada':
      return 'kn';
    case 'Hindi':
      return 'hi';
    case 'Tamil':
      return 'ta';
    case 'Telugu':
      return 'te';
    case 'Malayalam':
      return 'ml';
    default:
      return 'en';
  }
};

function localizedCell(row: Partial<Record<ComparisonLangCode, string>> | undefined | null, lc: ComparisonLangCode): string {
  if (!row) return '—';
  const v = row[lc] || row.en || '';
  return typeof v === 'string' && v.trim() ? v.trim() : '—';
}

function deptDisplayName(dept: ComparisonDeptBlock | undefined, lc: ComparisonLangCode, fallback: string): string {
  const dn = dept?.display_names;
  if (!dn) return fallback;
  const v = dn[lc] || dn.en || '';
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

type Props = {
  language: Language;
  open: boolean;
  initialDepartmentIds: string[];
  highlightId: string | null;
  /** e.g. placements | future | child — shown as subtle subtitle */
  recommendFocus?: string | null;
  /** Which comparison row (0..row_order.length-1) is shown; driven by TTS progress in ChatScreen. */
  narrationSectionIndex: number;
  onClose: () => void;
};

/** Layer 1 — static chrome; must not re-render on point/section tick (memo). */
const ComparisonHeaderLayer = memo(function ComparisonHeaderLayer({
  chrome,
  dynamicTitle,
  recommendFocus,
  onClose,
}: {
  chrome: ComparisonChrome;
  dynamicTitle: string;
  recommendFocus?: string | null;
  onClose: () => void;
}) {
  return (
    <header className="department-comparison-header relative flex flex-wrap items-start justify-between gap-2 px-4 pb-2 pt-2 sm:gap-3 sm:px-5 sm:pb-2 sm:pt-2.5">
      <div className="min-w-0 pr-2">
        <p className="department-comparison-eyebrow">{chrome.compareHeading}</p>
        <h2 id="comparison-cinema-title" className="department-comparison-title mt-1 text-balance">
          {dynamicTitle}
        </h2>
        {recommendFocus && recommendFocus !== 'generic' ? (
          <p className="department-comparison-focus mt-1.5 capitalize text-slate-600">
            {chrome.highlighted}: {recommendFocus}
          </p>
        ) : null}
      </div>
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        aria-label={chrome.close}
        className="department-comparison-close"
      >
        <X className="h-6 w-6 text-slate-500" strokeWidth={2} aria-hidden />
      </motion.button>
    </header>
  );
});

/** Dept selectors — isolated from flip layer; only re-renders when selection changes. */
const ComparisonDeptToolbarLayer = memo(function ComparisonDeptToolbarLayer({
  selectedIds,
  validDeptIds,
  deptLabel,
  setDeptAt,
}: {
  selectedIds: string[];
  validDeptIds: string[];
  deptLabel: (id: string) => string;
  setDeptAt: (index: number, value: string) => void;
}) {
  return (
    <div className="relative flex flex-wrap items-center gap-2 px-4 pb-2 sm:gap-3 sm:px-5 sm:pb-2">
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {selectedIds.map((id, idx) => (
          <div key={`${id}-${idx}`} className="flex items-center gap-2">
            <label className="sr-only">
              Department {idx + 1}
            </label>
            <select
              value={id}
              onChange={(e) => setDeptAt(idx, e.target.value)}
              className="department-comparison-select"
            >
              {validDeptIds.map((did) => (
                <option key={did} value={did}>
                  {deptLabel(did)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function DepartmentComparisonCinema({
  language,
  open,
  initialDepartmentIds,
  highlightId,
  recommendFocus,
  narrationSectionIndex,
  onClose,
}: Props) {
  const lc = langToCode(language);
  const chrome: ComparisonChrome = comparisonChrome[language] ?? comparisonChrome.English;

  const validDeptIds = useMemo(() => {
    const order =
      REG.department_order?.length ? REG.department_order : DEPARTMENT_JSON_KEY_ORDER.filter((id) => id in REG.departments);
    return order.filter((id) => id in (REG.departments || {}));
  }, []);

  const normalizeInitial = useCallback(
    (ids: string[]) => {
      const cleaned = [...new Set(ids.filter((id) => validDeptIds.includes(id as (typeof DEPARTMENT_JSON_KEY_ORDER)[number])))]
        .slice(0, 3);
      while (cleaned.length < 2 && validDeptIds.length >= 2) {
        const n = validDeptIds.find((x) => !cleaned.includes(x));
        if (!n) break;
        cleaned.push(n);
      }
      return cleaned.slice(0, 3);
    },
    [validDeptIds],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(() => normalizeInitial(initialDepartmentIds));

  useEffect(() => {
    if (open) {
      setSelectedIds(normalizeInitial(initialDepartmentIds));
    }
  }, [open, initialDepartmentIds, normalizeInitial]);

  const deptLabel = useCallback(
    (id: string) => deptDisplayName(REG.departments[id], lc, id.replace(/_/g, ' ')),
    [lc],
  );

  const dynamicTitle = useMemo(() => {
    const names = selectedIds.map(deptLabel);
    if (names.length >= 2) return names.slice(0, 3).join(' · ');
    return chrome.compareHeading;
  }, [selectedIds, deptLabel, chrome.compareHeading]);

  const setDeptAt = useCallback(
    (index: number, value: string) => {
      setSelectedIds((prev) => {
        const next = [...prev];
        if (!value || next.includes(value)) return prev;
        next[index] = value;
        return normalizeInitial(next);
      });
    },
    [normalizeInitial],
  );

  const comparisonRows = useMemo(
    () =>
      REG.row_order.map((rowKey) => ({
        key: rowKey,
        label: localizedCell(REG.row_labels[rowKey], lc),
      })),
    [lc],
  );

  const sectionIndex = Math.max(0, Math.min(comparisonRows.length - 1, narrationSectionIndex));
  const activeRow = comparisonRows[sectionIndex];

  const extractPointLines = useCallback((value: string): string[] => {
    const normalized = value
      .split('\n')
      .map((line) => line.replace(/^\s*[•\-]\s*/, '').trim())
      .filter(Boolean);
    if (normalized.length) return normalized;
    return [value.trim()].filter(Boolean);
  }, []);

  const getRowPoints = useCallback(
    (deptId: string, rowKey: string): string[] => {
      const cells = REG.departments[deptId]?.cells ?? {};
      const rowValue = localizedCell(
        cells[rowKey] as Partial<Record<ComparisonLangCode, string>> | undefined,
        lc,
      );
      if (rowValue === '—') return [rowValue];
      return extractPointLines(rowValue);
    },
    [extractPointLines, lc],
  );

  const visibleDeptIds = useMemo(() => selectedIds.slice(0, 3), [selectedIds]);

  return (
    <AnimatePresence mode="sync">
      {open ? (
        <motion.div
          key="comparison-inline"
          role="region"
          aria-labelledby="comparison-cinema-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="comparison-embed-slot flex w-full flex-1 flex-col items-stretch px-1 sm:px-2"
        >
          <div className="comparison-embed-leading-filler" aria-hidden />
          <motion.div
            initial={{ opacity: 0.85, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            className="comparison-embed-panel-shell flex min-h-0 shrink-0 flex-col"
          >
            <div className="department-comparison-panel relative mx-auto flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[2rem]">
            <div className="department-comparison-panel-glow pointer-events-none absolute inset-0" aria-hidden />

            <ComparisonHeaderLayer
              chrome={chrome}
              dynamicTitle={dynamicTitle}
              recommendFocus={recommendFocus}
              onClose={onClose}
            />

            <ComparisonDeptToolbarLayer
              selectedIds={selectedIds}
              validDeptIds={validDeptIds}
              deptLabel={deptLabel}
              setDeptAt={setDeptAt}
            />

            <div className="department-comparison-cinema-root relative min-h-0 flex-1 overflow-hidden px-2 sm:px-4">
              <div className="comparison-root comparison-cinema-inner mx-auto flex h-full min-h-0 max-w-[1600px] flex-col pb-2 pt-0.5 sm:pb-3">
                <div className={`comparison-body ${visibleDeptIds.length >= 3 ? 'comparison-body--triple' : ''}`}>
                  <div
                    className="comparison-cards-track"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(visibleDeptIds.length, 1)}, minmax(0, 1fr))`,
                    }}
                  >
                    {visibleDeptIds.map((deptId) => (
                      <section key={deptId} className={`compare-card ${highlightId === deptId ? 'highlight' : ''}`}>
                        <h3 className="compare-card-title">{deptLabel(deptId)}</h3>
                        <div className="compare-card-media" aria-hidden>
                          <div className="compare-card-media-inner" />
                        </div>
                        <div className="compare-card-body">
                          <AnimatePresence mode="wait">
                            {activeRow ? (
                              <motion.div
                                key={`${deptId}-${activeRow.key}`}
                                role="group"
                                aria-label={activeRow.label}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={SECTION_FADE}
                                className="compare-card-narrative"
                              >
                                <p className="point-group-label">{activeRow.label}</p>
                                <div className="points">
                                  {getRowPoints(deptId, activeRow.key).map((pointText, pointIndex) => (
                                    <p key={`${deptId}-${activeRow.key}-${pointIndex}`} className="point">
                                      {pointText}
                                    </p>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
