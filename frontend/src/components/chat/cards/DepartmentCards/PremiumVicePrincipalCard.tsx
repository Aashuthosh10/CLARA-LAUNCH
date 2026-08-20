import React from 'react';
import PremiumHODCard from '../PremiumHODCard';
import type { Language } from '../../../../context/LanguageContext';
import { VICE_PRINCIPAL_COPY } from '../../../../lib/executiveLeadershipLocale';
import vicePrincipalPortrait from '../../../../assets/Principle and Vice principle/vice principle image.png';

/** Premium Vice Principal / Dean Academics card — same visual system as HOD portraits. */
export default function PremiumVicePrincipalCard({ language }: { language: Language }) {
  const copy = VICE_PRINCIPAL_COPY[language] ?? VICE_PRINCIPAL_COPY.English;
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      data-testid="vice-principal-card"
      data-card-language={language}
    >
      <PremiumHODCard
        label={copy.label}
        name={copy.name}
        title={copy.title}
        bio={copy.bio}
        portrait={vicePrincipalPortrait}
      />
    </div>
  );
}
