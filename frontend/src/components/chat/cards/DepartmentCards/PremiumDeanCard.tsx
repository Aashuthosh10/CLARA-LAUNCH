import React from 'react';
import PremiumHODCard from '../PremiumHODCard';
import type { Language } from '../../../../context/LanguageContext';
import {
  DEAN_COPY_BY_ID,
  DEAN_PORTRAITS,
  type DeanProfileId,
} from '../../../../lib/deanLeadershipLocale';

/** Individual dean profile card — same visual system as HOD / principal portraits. */
export default function PremiumDeanCard({
  language,
  deanId,
}: {
  language: Language;
  deanId: DeanProfileId;
}) {
  const pack = DEAN_COPY_BY_ID[deanId];
  const copy = pack[language] ?? pack.English;
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      data-testid="dean-card"
      data-dean-id={deanId}
      data-card-language={language}
    >
      <PremiumHODCard
        label={copy.label}
        name={copy.name}
        title={copy.title}
        bio={copy.bio}
        portrait={DEAN_PORTRAITS[deanId]}
      />
    </div>
  );
}
