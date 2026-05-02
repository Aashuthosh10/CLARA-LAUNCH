import { AnimatePresence, motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  onClose: () => void;
};

export default function DepartmentComparisonCinema({
  language,
  open,
  initialDepartmentIds,
  highlightId,
  recommendFocus,
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

  const canAdd = selectedIds.length < 3;
  const showRemoveSlot = selectedIds.length === 3;

  const setDeptAt = (index: number, value: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      if (!value || next.includes(value)) return prev;
      next[index] = value;
      return normalizeInitial(next);
    });
  };

  const addDept = () => {
    setSelectedIds((prev) => {
      if (prev.length >= 3) return prev;
      const filler = validDeptIds.find((id) => !prev.includes(id));
      return filler ? normalizeInitial([...prev, filler]) : prev;
    });
  };

  const removeDept = (index: number) => {
    setSelectedIds((prev) => {
      if (prev.length <= 2) return prev;
      const next = prev.filter((_, i) => i !== index);
      return normalizeInitial(next);
    });
  };

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
          className="comparison-embed-slot flex w-full flex-1 flex-col items-stretch px-1 sm:px-3"
        >
          {/* Absorb upper flex space so the panel sits low above the orb */}
          <div className="comparison-embed-leading-filler" aria-hidden />
          <motion.div
            layout
            initial={{ opacity: 0.85, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            className="comparison-embed-panel-shell flex min-h-0 shrink-0 flex-col"
          >
            <div className="department-comparison-panel relative mx-auto flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[2rem]">
            <div className="department-comparison-panel-glow pointer-events-none absolute inset-0" aria-hidden />

            <header className="department-comparison-header relative flex flex-wrap items-start justify-between gap-5 px-8 pb-7 pt-8 sm:gap-6 sm:px-14 sm:pb-8 sm:pt-10">
              <div className="min-w-0 pr-2">
                <p className="department-comparison-eyebrow">{chrome.compareHeading}</p>
                <h2 id="comparison-cinema-title" className="department-comparison-title mt-2 text-balance">
                  {dynamicTitle}
                </h2>
                {recommendFocus && recommendFocus !== 'generic' ? (
                  <p className="department-comparison-focus mt-2.5 capitalize text-slate-600">
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

            <div className="relative flex flex-wrap items-center gap-5 px-8 pb-6 sm:gap-6 sm:px-14 sm:pb-6">
              <div className="flex flex-wrap gap-4 sm:gap-5">
                {selectedIds.map((id, idx) => (
                  <div key={`${id}-${idx}`} className="flex items-center gap-2">
                    <label className="sr-only">
                      {chrome.pickDept} {idx + 1}
                    </label>
                    <select
                      value={id}
                      onChange={(e) => setDeptAt(idx, e.target.value)}
                      className="department-comparison-select"
                    >
                      {validDeptIds.map((did) => (
                        <option key={did} value={did}>
                          {deptDisplayName(REG.departments[did], lc, did)}
                        </option>
                      ))}
                    </select>
                    {showRemoveSlot ? (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        aria-label={`${chrome.removeDept} ${deptLabel(id)}`}
                        onClick={() => removeDept(idx)}
                        className="department-comparison-remove-slot rounded-xl border border-rose-200/80 bg-rose-50/90 text-rose-600 shadow-sm transition-colors hover:bg-rose-100/95"
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </motion.button>
                    ) : null}
                  </div>
                ))}
              </div>
              {canAdd ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addDept}
                  className="department-comparison-add-dept inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5 shrink-0" aria-hidden />
                  {chrome.addDept}
                </motion.button>
              ) : null}
            </div>

            <div className="department-comparison-scroll relative min-h-0 flex-1 overflow-auto px-6 sm:px-14 [-webkit-overflow-scrolling:touch]">
              <div className="comparison-insight-stack mx-auto pb-8 sm:pb-10">
                <p className="department-comparison-hint mb-6 text-center sm:mb-7">{chrome.swipeHint}</p>

                <div
                  className="comparison-insight-colheaders-grid mb-4 grid gap-6 sm:mb-5 sm:gap-8"
                  style={{
                    gridTemplateColumns: `repeat(${selectedIds.length}, minmax(0,1fr))`,
                  }}
                >
                  {selectedIds.map((id, colIdx) => {
                    const isHi = highlightId === id;
                    return (
                      <motion.div
                        key={`head-${id}-${colIdx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * colIdx, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                        className={`department-comparison-col-head rounded-xl px-5 py-4 text-center sm:px-6 sm:py-5 ${
                          isHi ? 'department-comparison-col-head--highlight' : ''
                        }`}
                      >
                        <span className="department-comparison-col-head-title">{deptLabel(id)}</span>
                        {isHi ? (
                          <div className="department-comparison-highlight-badge uppercase">{chrome.highlighted}</div>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="comparison-insight-section-list flex flex-col gap-12 sm:gap-[3.75rem]">
                  {REG.row_order.map((rowKey, sectionIdx) => (
                    <motion.section
                      key={rowKey}
                      aria-labelledby={`comparison-section-${rowKey}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * sectionIdx, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                      className="comparison-insight-section rounded-[1.35rem] border border-white/55 bg-white/35 px-5 py-7 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur-md sm:px-9 sm:py-10"
                    >
                      <h3
                        id={`comparison-section-${rowKey}`}
                        className="comparison-insight-section-title text-balance"
                      >
                        {localizedCell(REG.row_labels[rowKey], lc)}
                      </h3>
                      <div
                        className="comparison-insight-grid mt-6 grid gap-5 sm:mt-8 sm:gap-7"
                        style={{
                          gridTemplateColumns: `repeat(${selectedIds.length}, minmax(0,1fr))`,
                        }}
                      >
                        {selectedIds.map((did, ci) => {
                          const dept = REG.departments[did];
                          const cells = dept?.cells ?? {};
                          const isHiCol = highlightId === did;
                          const body = localizedCell(
                            cells[rowKey] as Partial<Record<ComparisonLangCode, string>> | undefined,
                            lc,
                          );
                          return (
                            <motion.div
                              key={`${rowKey}-${did}-${ci}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: 0.04 + 0.02 * sectionIdx + 0.03 * ci,
                                duration: 0.36,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className={`comparison-insight-card rounded-[1rem] px-5 py-6 sm:px-7 sm:py-8 ${
                                isHiCol ? 'comparison-insight-card--highlight' : ''
                              }`}
                            >
                              <p className="comparison-insight-card-dept">{deptLabel(did)}</p>
                              <div className="comparison-insight-card-body whitespace-pre-line">{body}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.section>
                  ))}
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
