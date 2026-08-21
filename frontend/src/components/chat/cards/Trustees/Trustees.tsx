import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TrusteeCard from './TrusteeCard';
import { trusteeBoardLabel, trusteesForLanguage } from './trusteeLocale';

import holla from '../../../../assets/trusties/trustie 1.jpeg';
import padma from '../../../../assets/trusties/truste 2.jpg';
import srinivas from '../../../../assets/trusties/trustie 3.jpg';
import shanmukha from '../../../../assets/trusties/trustie 4.jpg';
import manohar from '../../../../assets/trusties/trustie 5.jpeg';
import jayasimha from '../../../../assets/trusties/trustie 6.jpg';
import narayan from '../../../../assets/trusties/trustie 7.jpg';

const TRUSTEE_IMAGE_BY_KEY: Record<string, string> = {
  holla,
  padma,
  srinivas,
  shanmukha,
  manohar,
  jayasimha,
  narayan,
};

type TrusteesProps = {
  onNarrateTrustee?: (summary: string, index: number) => void;
  language?: string;
};

export default function Trustees({ onNarrateTrustee, language }: TrusteesProps) {
  const trustees = trusteesForLanguage(language);
  const boardLabel = trusteeBoardLabel(language);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const currentTrustee = trustees[index];
  const canPrev = index > 0;
  const canNext = index < Math.max(trustees.length - 1, 0);

  const handlePrev = () => {
    if (!canPrev) return;
    setDirection(-1);
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!canNext) return;
    setDirection(1);
    setIndex((prev) => Math.min(trustees.length - 1, prev + 1));
  };

  useEffect(() => {
    if (index > trustees.length - 1) setIndex(0);
  }, [index, trustees.length]);

  useEffect(() => {
    if (!onNarrateTrustee || !currentTrustee?.tts_summary) return;
    onNarrateTrustee(currentTrustee.tts_summary, index);
  }, [currentTrustee?.tts_summary, index, onNarrateTrustee]);

  if (!currentTrustee) {
    return (
      <div
        className="trustee-stage-shell"
        data-testid="trustees-card"
        data-card-language={language || ''}
        data-localization-gap="trustees.missing"
      />
    );
  }

  return (
    <div
      className="trustee-stage-shell"
      data-testid="trustees-card"
      data-card-language={language || ''}
      data-trustee-id={currentTrustee.id}
      data-localization-status={currentTrustee.localizationStatus}
    >
      <AnimatePresence mode="wait">
        <TrusteeCard
          key={currentTrustee.id}
          direction={direction}
          name={currentTrustee.name}
          role={currentTrustee.role}
          description={currentTrustee.description}
          image={TRUSTEE_IMAGE_BY_KEY[currentTrustee.imageKey] || TRUSTEE_IMAGE_BY_KEY.holla}
          boardLabel={boardLabel}
        />
      </AnimatePresence>

      <div className="trustee-nav" aria-label="Trustee card navigation">
        <button
          type="button"
          className="trustee-nav-btn"
          onClick={handlePrev}
          disabled={!canPrev}
          aria-label="Previous trustee"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="trustee-nav-dots" aria-hidden>
          {trustees.map((trustee, dotIdx) => (
            <motion.button
              key={trustee.id}
              type="button"
              className={`trustee-nav-dot ${dotIdx === index ? 'is-active' : ''}`}
              onClick={() => {
                if (dotIdx === index) return;
                setDirection(dotIdx > index ? 1 : -1);
                setIndex(dotIdx);
              }}
              whileTap={{ scale: 0.92 }}
              aria-label={`Go to trustee ${dotIdx + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="trustee-nav-btn"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Next trustee"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
