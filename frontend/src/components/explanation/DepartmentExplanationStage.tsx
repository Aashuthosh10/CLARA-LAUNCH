/**
 * DepartmentExplanationStage — layout container for 1–3 DepartmentExplanationCards.
 *
 * 1 card  → single fullscreen card
 * 2 cards → side-by-side columns
 * 3 cards → three columns
 * 4+ cards → first 3 are shown, remainder noted in UI (backend should clarify at ≥4)
 *
 * The SiriOrb is rendered BELOW this stage by ChatScreen; do not import it here.
 */

import React from 'react';
import { motion } from 'motion/react';
import DepartmentExplanationCard, {
  type DepartmentExplanationCardProps,
} from './DepartmentExplanationCard';

export interface ExplanationCardData extends DepartmentExplanationCardProps {}

interface Props {
  cards: ExplanationCardData[];
  languageCode?: string;
}

const MAX_CARDS = 3;

export const DepartmentExplanationStage: React.FC<Props> = ({
  cards,
  languageCode = 'en',
}) => {
  const visibleCards = cards.slice(0, MAX_CARDS);
  const omitted = Math.max(0, cards.length - MAX_CARDS);
  const count = visibleCards.length;

  if (count === 0) return null;

  const gridClass =
    count === 1
      ? 'grid-cols-1'
      : count === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="relative w-full h-full flex flex-col gap-3">
      <div className={`grid ${gridClass} gap-3 flex-1 min-h-0`}>
        {visibleCards.map((card, idx) => (
          <motion.div
            key={card.unitId}
            className="min-h-0 h-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08, ease: 'easeOut' }}
          >
            <DepartmentExplanationCard
              {...card}
              languageCode={languageCode}
            />
          </motion.div>
        ))}
      </div>

      {omitted > 0 && (
        <motion.p
          className="text-white/60 text-xs text-center pb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          +{omitted} more department{omitted > 1 ? 's' : ''} — ask me one at a time for full details
        </motion.p>
      )}
    </div>
  );
};

export default DepartmentExplanationStage;
