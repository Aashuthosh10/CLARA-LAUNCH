import React from 'react';
import { motion } from 'motion/react';
import type { PresentationCardModel } from '../../../../features/chat/presentation/PresentationCardModel';
import { SAMPLE_CONTENT_STATUS, uiText } from '../../../../localization/uiCopy';
import { campusUnitFromLocale } from './campusUnitLocale';

type CampusUnitCardProps = {
  card: PresentationCardModel;
  language?: string;
};

export default function CampusUnitCard({ card, language }: CampusUnitCardProps) {
  const locale = campusUnitFromLocale(card.unitId, language);
  const title = (locale?.title || card.title || card.unitId).trim();
  const supportingLine = (locale?.supporting_line || '').trim();
  const body = (locale?.body || card.content || '').trim();
  const points = Array.isArray(locale?.points) ? locale!.points!.filter(Boolean) : [];
  const sample = (locale?.content_status || '').trim();
  const showStatus = Boolean(sample && sample !== SAMPLE_CONTENT_STATUS);
  const imageSrc = (locale?.imageSrc ?? locale?.image ?? null) || null;
  const showTypeChip = !['faculty', 'location', 'global_placements', 'admissions'].includes(card.cardType);
  const typeChip = ['hostel', 'canteen', 'ncc', 'event'].includes(card.cardType)
    ? uiText(language, `cards.${card.cardType}`)
    : card.cardType;
  const narrative = body.trim();

  return (
    <div
      className="premium-stage-container campus-unit-card"
      data-testid="campus-unit-card"
      data-unit-id={card.unitId}
      data-card-type={card.cardType}
      data-card-language={language || ''}
      data-content-status={sample}
      data-has-image={imageSrc ? '1' : '0'}
    >
      <div className="premium-stage-border-outer" />
      <div className="premium-stage-border-inner" />
      <div className="campus-unit-card__vignette" data-testid="campus-unit-vignette" />
      <div className="campus-unit-card__glow" aria-hidden />
      <motion.div
        key={card.unitId}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="campus-unit-card__layout"
      >
        <div className="campus-unit-card__text">
          {showTypeChip ? <div className="premium-stage-chip">{typeChip}</div> : null}
          {showStatus ? <div className="premium-stage-chip mt-2">{sample}</div> : null}
          <h2 className="premium-stage-title campus-unit-card__title">{title}</h2>
          {supportingLine ? (
            <p className="campus-unit-card__tagline" data-testid="campus-unit-tagline">
              {supportingLine}
            </p>
          ) : null}
          {points.length > 0 ? (
            <ul className="campus-unit-card__facts" data-testid="campus-unit-facts">
              {points.map((point) => (
                <li key={point} className="campus-unit-card__fact">
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
          {narrative ? (
            <p className="premium-stage-body campus-unit-card__supporting" data-testid="campus-unit-supporting">
              {narrative}
            </p>
          ) : null}
        </div>
        <div
          className="campus-unit-card__image"
          data-testid="campus-unit-image"
          aria-hidden={imageSrc ? undefined : true}
        >
          {imageSrc ? (
            <img src={imageSrc} alt="" className="campus-unit-card__image-el" />
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
