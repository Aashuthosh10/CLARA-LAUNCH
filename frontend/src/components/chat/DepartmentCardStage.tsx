import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface DepartmentStageCard {
  title: string;
  content: string;
}

export default function DepartmentCardStage({
  departmentId,
  cards,
  currentCardIdx,
}: {
  departmentId: string;
  cards: DepartmentStageCard[];
  currentCardIdx: number;
}) {
  const current = cards[currentCardIdx];
  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={`${departmentId}-${currentCardIdx}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="cinematic-card department-stage-card"
        >
          <div className="department-stage-chip">{departmentId} Department</div>
          <div className="flex-1 mt-4">
            <h2 className="card-title">{current.title}</h2>
            <p className="card-body">{current.content}</p>
          </div>
          <div className="mt-auto flex gap-4 pt-8">
            {cards.map((_, i) => (
              <div
                key={`${departmentId}-progress-${i}`}
                className={`h-2 flex-1 rounded-full ${
                  i === currentCardIdx ? 'bg-violet-600' : i < currentCardIdx ? 'bg-violet-200' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
