import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CampusUnitCard from '../CampusUnitCard';
import type { PresentationCardModel } from '../../../../../features/chat/presentation/PresentationCardModel';

const hostelCard: PresentationCardModel = {
  unitId: 'hostel.boys.overview',
  cardType: 'hostel',
  cardId: 'hostel',
  title: 'Boys hostel',
  content: 'Body',
  departmentId: 'hostel.boys',
  sectionId: null,
  slotIndex: null,
  cardIndex: 0,
};

describe('CampusUnitCard layout', () => {
  it('always mounts an empty image region when imageSrc is null', () => {
    const markup = renderToStaticMarkup(
      <CampusUnitCard card={hostelCard} language="English" />,
    );
    expect(markup).toContain('data-testid="campus-unit-image"');
    expect(markup).toContain('data-has-image="0"');
    expect(markup).toContain('data-testid="campus-unit-vignette"');
    expect(markup).toContain('data-testid="campus-unit-facts"');
    expect(markup).toContain('data-testid="campus-unit-supporting"');
    expect(markup).not.toContain('<img');
  });

  it('keeps the same vignette + image container for ncc cards', () => {
    const nccCard: PresentationCardModel = {
      ...hostelCard,
      unitId: 'ncc.overview',
      cardType: 'ncc',
      cardId: 'ncc',
      title: 'NCC',
      departmentId: 'ncc',
    };
    const markup = renderToStaticMarkup(
      <CampusUnitCard card={nccCard} language="English" />,
    );
    expect(markup).toContain('data-card-type="ncc"');
    expect(markup).toContain('data-testid="campus-unit-vignette"');
    expect(markup).toContain('data-testid="campus-unit-image"');
  });
});
