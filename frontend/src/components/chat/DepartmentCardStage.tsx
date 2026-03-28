import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { DepartmentStageSlide } from '../../lib/collegeLocaleUtils';

export type { DepartmentStageSlide };

export default function DepartmentCardStage({
  departmentLabel,
  chipText,
  slides,
  currentCardIdx,
}: {
  departmentLabel: string;
  /** When set, shown as the chip instead of "{departmentLabel} Department". */
  chipText?: string;
  slides: DepartmentStageSlide[];
  currentCardIdx: number;
}) {
  const maxIdx = Math.max(0, slides.length - 1);
  const safeIdx = slides.length ? Math.min(Math.max(0, currentCardIdx), maxIdx) : 0;
  const current = slides[safeIdx];
  const chipDisplay = chipText?.trim() || (departmentLabel.trim() ? `${departmentLabel} Department` : 'Campus');

  if (!slides.length || !current) {
    return (
      <div className="cinematic-card department-stage-card">
        <div className="department-stage-chip">{chipDisplay}</div>
        <div className="flex-1 mt-4">
          <h2 className="card-title">Department</h2>
          <p className="card-body">
            This department is not listed in the campus knowledge file yet. Please visit the Admission Block for the
            latest details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${chipText ?? departmentLabel}-${safeIdx}`}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25 }}
        className="cinematic-card department-stage-card"
      >
        <div className="department-stage-chip">{chipDisplay}</div>
        <div className="flex-1 mt-4">
          <h2 className="card-title">{current.title}</h2>
          <p className="card-body whitespace-pre-line">{current.content}</p>
        </div>
        <div className="mt-auto flex gap-4 pt-8">
          {slides.map((_, i) => (
            <div
              key={`${chipText ?? departmentLabel}-progress-${i}`}
              className={`h-2 flex-1 rounded-full ${
                i === safeIdx ? 'bg-violet-600' : i < safeIdx ? 'bg-violet-200' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
