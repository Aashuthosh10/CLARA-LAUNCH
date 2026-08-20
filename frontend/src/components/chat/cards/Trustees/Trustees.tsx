import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TrusteeCard from './TrusteeCard';

import holla from "../../../../assets/trusties/trustie 1.jpeg";
import padma from "../../../../assets/trusties/truste 2.jpg";
import srinivas from "../../../../assets/trusties/trustie 3.jpg";
import shanmukha from "../../../../assets/trusties/trustie 4.jpg";
import manohar from "../../../../assets/trusties/trustie 5.jpeg";
import jayasimha from "../../../../assets/trusties/trustie 6.jpg";
import narayan from "../../../../assets/trusties/trustie 7.jpg";

const trustees = [
  {
    name: "Prof. M R Holla",
    role: "Founder Trustee & President",
    description: "Prof. M R Holla is a distinguished academician and recipient of the Karnataka Rajyothsava Award for Academic Excellence. With over 50 years of academic and administrative experience, he serves as the visionary leader and core architect of SVIT.",
    image: holla,
    tts_summary: "Professor M R Holla is the Founder Trustee and President of SVIT. He brings over five decades of academic leadership and shaped the institution's long-term vision."
  },
  {
    name: "Dr. A M Padma Reddy",
    role: "Founder Trustee & Vice President",
    description: "Dr. A M Padma Reddy is a renowned professor in Computer Science and Engineering and Dean of Student Affairs. He promotes quality education and encourages participation in sports, cultural, NSS, and NCC activities.",
    image: padma,
    tts_summary: "Dr. A M Padma Reddy is the Founder Trustee and Vice President of SVIT. He provides leadership in computer science education and student development."
  },
  {
    name: "Sri R Srinivas Raju",
    role: "Managing Trustee & Secretary",
    description: "Sri R Srinivas Raju is a serial entrepreneur with over 30 years of experience in infrastructure and business development. His industry insights strengthen SVIT's practical approach to engineering education.",
    image: srinivas,
    tts_summary: "Sri R Srinivas Raju is the Managing Trustee and Secretary of SVIT. He contributes strong industry and entrepreneurship insight to institutional growth."
  },
  {
    name: "Prof. R C Shanmukha Swamy",
    role: "Founder Trustee & Joint Secretary",
    description: "Prof. R C Shanmukha Swamy brings extensive academic and administrative expertise, contributing to SVIT's policies and strategic direction with decades of educational experience.",
    image: shanmukha,
    tts_summary: "Professor R C Shanmukha Swamy is the Founder Trustee and Joint Secretary of SVIT. He supports governance and academic direction through extensive institutional experience."
  },
  {
    name: "Sri Manohar M K",
    role: "Founder Trustee & Treasurer",
    description: "Sri Manohar M K is a Chartered Accountant managing SVIT's financial operations, ensuring strong fiscal discipline and sustainable institutional growth.",
    image: manohar,
    tts_summary: "Sri Manohar M K is the Founder Trustee and Treasurer of SVIT. He oversees financial discipline and supports sustainable institutional planning."
  },
  {
    name: "Dr. Y Jayasimha",
    role: "Founder Trustee",
    description: "Dr. Y Jayasimha is an accomplished academician contributing to SVIT's development through academic leadership and institutional growth strategies.",
    image: jayasimha,
    tts_summary: "Dr. Y Jayasimha is a Founder Trustee of SVIT. He contributes academic leadership and strategic guidance for institutional development."
  },
  {
    name: "Sri Narayan Raju",
    role: "Founder Trustee (Deceased)",
    description: "Sri Narayan Raju was a key administrator in SVIT's foundation, whose contributions to institutional systems and governance remain part of its legacy.",
    image: narayan,
    tts_summary: "Sri Narayan Raju was a Founder Trustee of SVIT. His early administrative contributions remain an important part of the institution's legacy."
  }
];

type TrusteesProps = {
  onNarrateTrustee?: (summary: string, index: number) => void;
  language?: string;
};

export default function Trustees({ onNarrateTrustee, language }: TrusteesProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const currentTrustee = trustees[index];
  const canPrev = index > 0;
  const canNext = index < trustees.length - 1;

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
    if (!onNarrateTrustee) return;
    onNarrateTrustee(currentTrustee.tts_summary, index);
  }, [currentTrustee.tts_summary, index, onNarrateTrustee]);

  return (
    <div className="trustee-stage-shell" data-testid="trustees-card" data-card-language={language || ''}>
      <AnimatePresence mode="wait">
        <TrusteeCard
          key={index}
          direction={direction}
          name={currentTrustee.name}
          role={currentTrustee.role}
          description={currentTrustee.description}
          image={currentTrustee.image}
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
          {trustees.map((_, dotIdx) => (
            <motion.button
              key={`trustee-dot-${dotIdx}`}
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
