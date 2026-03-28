import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { CardDataItem } from '../../lib/cardData';
import ThreeDVisual from './cards/ThreeDVisual';
import PremiumHODCard from './cards/PremiumHODCard';

/**
 * Card stack for leadership / HOD overviews (and other static card lists).
 * One card per entry; syncs with `currentCardIdx` from TTS-driven progression.
 */
export default function LeadershipOverview({
  cards,
  currentCardIdx,
  targetDepartment,
}: {
  cards: CardDataItem[];
  currentCardIdx: number;
  targetDepartment?: string | null;
}) {
  // If target is specific to CSE (Data Science) HOD, show the premium card
  if (targetDepartment === "CSE (Data Science)") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <PremiumHODCard />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="cinematic-card">
        <p className="card-body">No overview cards to display.</p>
      </div>
    );
  }

  const safeIdx = Math.min(Math.max(0, currentCardIdx), cards.length - 1);
  const current = cards[safeIdx];

  return (
    <AnimatePresence mode="wait">
      {current && (
        <motion.div
          key={safeIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="cinematic-card"
        >
          <div className="flex-1">
            <h2 className="card-title">{current.title}</h2>
            <p className="card-body">{current.content}</p>
          </div>
          <div className="w-[50%] h-[40%] self-end bg-slate-50 rounded-3xl overflow-hidden mt-6 border border-slate-200 shadow-sm">
            <ThreeDVisual type={current.type} />
          </div>
          <div className="mt-auto flex gap-4 pt-8">
            {cards.map((_, i) => (
              <div
                key={`overview-progress-${i}`}
                className={`h-2 flex-1 rounded-full ${
                  i === safeIdx ? 'bg-violet-600' : i < safeIdx ? 'bg-violet-200' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
