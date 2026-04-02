import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { CardDataItem } from '../../lib/cardData';
import ThreeDVisual from './cards/ThreeDVisual';
import PremiumHODCard from './cards/PremiumHODCard';
import PremiumHODCardCSE from './cards/PremiumHODCard(CSE)';
import PremiumHODCardAIML from './cards/PremiumHODCard(AIML)';
import PremiumHODCardEC from './cards/PremiumHODCard(EC)';
import PremiumHODCardISE from './cards/PremiumHODCard(ISE)';
import PremiumHODCardCivil from './cards/PremiumHODCard(Civil)';
import PremiumHODCardMechanical from './cards/PremiumHODCard(Mechanical)';
import PremiumHODCardMBA from './cards/PremiumHODCard(MBA)';
import PremiumHODCardMathematics from './cards/PremiumHODCard(Mathematics)';
import PremiumHODCardPhysics from './cards/PremiumHODCard(Physics)';
import PremiumHODCardChemistry from './cards/PremiumHODCard(Chemistry)';

const COMPONENT_MAP: Record<string, React.FC> = {
  "CSE (Data Science)": PremiumHODCard,
  "Data Science": PremiumHODCard,
  "CSE": PremiumHODCardCSE,
  "Computer Science & Engineering": PremiumHODCardCSE,
  "AIML": PremiumHODCardAIML,
  "CSE (Artificial Intelligence & Machine Learning)": PremiumHODCardAIML,
  "EC": PremiumHODCardEC,
  "ECE": PremiumHODCardEC,
  "Electronics & Communication Engineering": PremiumHODCardEC,
  "ISE": PremiumHODCardISE,
  "Information Science & Engineering": PremiumHODCardISE,
  "Civil": PremiumHODCardCivil,
  "Civil Engineering": PremiumHODCardCivil,
  "Mechanical": PremiumHODCardMechanical,
  "Mechanical Engineering": PremiumHODCardMechanical,
  "MBA": PremiumHODCardMBA,
  "Master of Business Administration (MBA)": PremiumHODCardMBA,
  "Mathematics": PremiumHODCardMathematics,
  "Physics": PremiumHODCardPhysics,
  "Chemistry": PremiumHODCardChemistry,
};

/**
 * Card stack for leadership / HOD overviews (and other static card lists).
 * One card per entry; syncs with `currentCardIdx` from TTS-driven progression.
 */
export default function LeadershipOverview({
  cards,
  currentCardIdx,
  targetDepartment,
  onCardClick,
}: {
  cards: CardDataItem[];
  currentCardIdx: number;
  targetDepartment?: string | null;
  onCardClick?: (idx: number) => void;
}) {
  // Check if we have a specific HOD card for the requested department
  if (targetDepartment) {
    // Find a matching component (case insensitive, partial match for robustness)
    const targetKeys = Object.keys(COMPONENT_MAP);
    const matchedKey = targetKeys.find(key => 
      targetDepartment.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(targetDepartment.toLowerCase())
    );

    if (matchedKey) {
      const TargetComponent = COMPONENT_MAP[matchedKey];
      return (
        <div className="w-full h-full flex items-center justify-center">
          <TargetComponent />
        </div>
      );
    }
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
              <button
                key={`overview-progress-${i}`}
                onClick={() => onCardClick?.(i)}
                aria-label={`Go to card ${i + 1}`}
                className={`h-2 flex-1 rounded-full cursor-pointer transition-colors ${
                  i === safeIdx ? 'bg-violet-600' : 'bg-slate-200 hover:bg-violet-300'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
