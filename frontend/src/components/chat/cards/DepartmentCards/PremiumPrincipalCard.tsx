import React from 'react';
import PremiumHODCard from '../PremiumHODCard';
import type { Language } from '../../../../context/LanguageContext';
import { PRINCIPAL_COPY } from '../../../../lib/executiveLeadershipLocale';
import principalPortrait from '../../../../assets/Principle and Vice principle/Principle image.png';

/** Premium executive Principal card — same visual system as HOD portraits. */
export default function PremiumPrincipalCard({ language }: { language: Language }) {
  const copy = PRINCIPAL_COPY[language] ?? PRINCIPAL_COPY.English;
  return (
    <div className="w-full h-full flex items-center justify-center">
      <PremiumHODCard
        label={copy.label}
        name={copy.name}
        title={copy.title}
        bio={copy.bio}
        portrait={principalPortrait}
      />
    </div>
  );
}
