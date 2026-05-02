import { AnimatePresence, motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
          className="comparison-embed-slot z-20 flex w-full flex-1 flex-col items-stretch px-1 sm:px-2.5"
        >
          {/* Absorb upper flex space so the panel sits low above the orb */}
          <div className="comparison-embed-leading-filler" aria-hidden />
          <motion.div
            layout
            initial={{ opacity: 0.85, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            className="comparison-embed-panel-shell mx-auto flex w-full max-w-[min(99vw,calc(80rem+18rem))] min-h-0 shrink-0 flex-col"
          >
            <div className="department-comparison-panel relative mx-auto flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[1.75rem]">
            <div className="department-comparison-panel-glow pointer-events-none absolute inset-0" aria-hidden />

            <header className="department-comparison-header relative flex flex-wrap items-start justify-between gap-4 px-7 pb-6 pt-7 sm:px-12 sm:pb-7 sm:pt-9">
              <div className="min-w-0 pr-2">
                <p className="department-comparison-eyebrow">{chrome.compareHeading}</p>
                <h2 id="comparison-cinema-title" className="department-comparison-title mt-2 text-balance">
                  {dynamicTitle}
                </h2>
                {recommendFocus && recommendFocus !== 'generic' ? (
                  <p className="department-comparison-focus mt-2 text-sm capitalize text-slate-600">
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
                <X className="h-5 w-5 text-slate-500" strokeWidth={2} aria-hidden />
              </motion.button>
            </header>

            <div className="relative flex flex-wrap items-center gap-4 px-7 pb-5 sm:px-12 sm:pb-5">
              <div className="flex flex-wrap gap-3.5 sm:gap-4">
                {selectedIds.map((id, idx) => (
                  <div key={`${id}-${idx}`} className="flex items-center gap-2">
                    <label className="sr-only">
                      {chrome.pickDept} {idx + 1}
                    </label>
                    <select
                      value={id}
                      onChange={(e) => setDeptAt(idx, e.target.value)}
                      className="department-comparison-select"
                      style={{ fontSize: 'max(13px,min(2.1vmin,17px))' }}
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
                        className="rounded-lg border border-rose-200/80 bg-rose-50/90 p-2 text-rose-600 shadow-sm transition-colors hover:bg-rose-100/95"
                      >
                        <X className="h-4 w-4" />
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
                  <Plus className="h-4 w-4" />
                  {chrome.addDept}
                </motion.button>
              ) : null}
            </div>

            <div className="department-comparison-scroll relative min-h-0 flex-1 overflow-auto px-5 pb-9 sm:px-12 sm:pb-11 [-webkit-overflow-scrolling:touch]">
              <div className="mx-auto pb-6">
                <p className="department-comparison-hint mb-6 text-center text-xs sm:text-[13px]">{chrome.swipeHint}</p>
                <div
                  className="department-comparison-matrix grid gap-x-6 gap-y-3.5 sm:gap-x-10 sm:gap-y-5"
                  style={{
                    gridTemplateColumns: `minmax(158px,0.52fr) repeat(${selectedIds.length}, minmax(184px,1fr))`,
                  }}
                >
                  <div />
                  {selectedIds.map((id, colIdx) => {
                    const isHi = highlightId === id;
                    return (
                      <motion.div
                        key={id + colIdx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04 * colIdx, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                        className={`department-comparison-col-head rounded-xl px-4 py-4 text-center sm:px-6 sm:py-6 ${
                          isHi ? 'department-comparison-col-head--highlight' : ''
                        }`}
                      >
                        <span
                          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-800 sm:text-sm sm:tracking-[0.16em]"
                          style={{ fontSize: 'max(11px,min(1.9vmin,16px))' }}
                        >
                          {deptLabel(id)}
                        </span>
                        {isHi ? (
                          <div className="department-comparison-highlight-badge mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                            {chrome.highlighted}
                          </div>
                        ) : null}
                      </motion.div>
                    );
                  })}
                  {REG.row_order.map((rowKey, rowIdx) => (
                    <Fragment key={rowKey}>
                      <motion.div
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.02 * rowIdx, duration: 0.32 }}
                        className="department-comparison-row-label sticky left-0 z-[2]"
                        style={{
                          alignSelf: 'stretch',
                          fontSize: 'max(11px,min(2vmin,13px))',
                        }}
                      >
                        {localizedCell(REG.row_labels[rowKey], lc)}
                      </motion.div>
                      {selectedIds.map((did, ci) => {
                        const dept = REG.departments[did];
                        const cells = dept?.cells ?? {};
                        const isHiCol = highlightId === did;
                        return (
                          <motion.div
                            key={`${rowKey}-${did}-${ci}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 + 0.012 * rowIdx + 0.035 * ci, duration: 0.34 }}
                            className={`department-comparison-cell rounded-lg px-4 py-5 sm:px-6 sm:py-6 ${
                              isHiCol ? 'department-comparison-cell--highlight' : ''
                            }`}
                            style={{
                              fontSize: 'max(13px,min(2.08vmin,17px))',
                              lineHeight: 1.55,
                              minHeight: '5rem',
                            }}
                          >
                            {localizedCell(cells[rowKey] as Partial<Record<ComparisonLangCode, string>> | undefined, lc)}
                          </motion.div>
                        );
                      })}
                    </Fragment>
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
