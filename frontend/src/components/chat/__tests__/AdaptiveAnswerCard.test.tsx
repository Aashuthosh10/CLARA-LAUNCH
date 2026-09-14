import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdaptiveAnswerCard, {
  buildAdaptiveCardPages,
  resolveAnswerPresentation,
} from '../AdaptiveAnswerCard';

describe('AdaptiveAnswerCard', () => {
  it('uses a generic visual fallback only for backend-eligible messages missing a model', () => {
    const eligible = resolveAnswerPresentation({
      text: 'Exact grounded answer.',
      visualResponseEligible: true,
    });
    expect(eligible).toMatchObject({
      type: 'GENERIC_ANSWER_CARD',
      summary: 'Exact grounded answer.',
    });
    expect(resolveAnswerPresentation({ text: 'Status text.' })).toBeNull();
  });

  it('renders sparse generic content without empty regions', () => {
    const html = renderToStaticMarkup(
      <AdaptiveAnswerCard
        presentation={{ schemaVersion: 1, type: 'GENERIC_ANSWER_CARD', eyebrow: 'CLARA', title: 'Answer', summary: 'Grounded answer.', points: [], highlights: [], choices: [] }}
        onChoice={() => undefined}
      />,
    );
    expect(html).toContain('Grounded answer.');
    expect(html).toContain('GENERIC_ANSWER_CARD');
    expect(html).not.toContain('adaptive-answer-card__items');
  });

  it('renders ordered steps and choice buttons', () => {
    const html = renderToStaticMarkup(
      <AdaptiveAnswerCard
        presentation={{ schemaVersion: 1, type: 'STEP_CARD', eyebrow: 'CLARA', title: 'Steps', summary: '1. Apply', points: ['Apply', 'Submit'], highlights: [], choices: ['Continue'] }}
        onChoice={() => undefined}
      />,
    );
    expect(html).toContain('<ol');
    expect(html).toContain('<button');
  });

  it('paginates only at semantic item boundaries without dropping content', () => {
    const points = [
      'First authoritative sentence.',
      'Second authoritative sentence.',
      'Third authoritative sentence.',
      'Fourth authoritative sentence.',
      'Fifth authoritative sentence.',
    ];
    const pages = buildAdaptiveCardPages(
      { schemaVersion: 1, type: 'INFO_CARD', eyebrow: 'CLARA', title: 'Information', summary: points.join(' '), points, highlights: [], choices: [] },
      { characters: 70, units: 2 },
    );
    const displayed = pages.flatMap((page) => [page.lead, ...page.items].filter(Boolean));
    expect(pages.length).toBeGreaterThan(1);
    expect(displayed).toEqual(points);
  });

  it('keeps follow-up choices on a fitted page or a dedicated final page', () => {
    const presentation = {
      schemaVersion: 1 as const,
      type: 'STEP_CARD' as const,
      eyebrow: 'CLARA',
      title: 'Steps',
      summary: 'Apply and submit.',
      points: ['Complete the application.', 'Submit the required documents.'],
      highlights: [],
      choices: ['Continue'],
    };
    const pages = buildAdaptiveCardPages(presentation, { characters: 20, units: 1 });
    expect(pages.flatMap((page) => page.items)).toEqual(presentation.points);
    expect(pages.flatMap((page) => page.choices)).toEqual(presentation.choices);
  });

  it.each([
    ['English', 'The library is open. Digital resources are available.'],
    ['Kannada', 'ಗ್ರಂಥಾಲಯ ತೆರೆದಿದೆ. ಡಿಜಿಟಲ್ ಸಂಪನ್ಮೂಲಗಳು ಲಭ್ಯವಿವೆ.'],
    ['Hindi', 'पुस्तकालय खुला है। डिजिटल संसाधन उपलब्ध हैं।'],
    ['Telugu', 'గ్రంథాలయం తెరిచి ఉంది. డిజిటల్ వనరులు అందుబాటులో ఉన్నాయి.'],
    ['Tamil', 'நூலகம் திறந்துள்ளது. டிஜிட்டல் வளங்கள் கிடைக்கின்றன.'],
    ['Malayalam', 'ലൈബ്രറി തുറന്നിരിക്കുന്നു. ഡിജിറ്റൽ വിഭവങ്ങൾ ലഭ്യമാണ്.'],
  ])('preserves %s text across semantic pages', (_language, summary) => {
    const pages = buildAdaptiveCardPages({
      schemaVersion: 1,
      type: 'GENERIC_ANSWER_CARD',
      eyebrow: 'CLARA',
      title: 'Answer',
      summary,
      points: [],
      highlights: [],
      choices: [],
    }, { characters: 35, units: 1 });
    expect(pages.flatMap((page) => [page.lead, ...page.items].filter(Boolean)).join(' ')).toBe(summary);
  });

  it.each(['INFO_CARD', 'LIST_CARD', 'STATS_CARD', 'CHOICE_CARD'] as const)(
    'renders the %s family',
    (type) => {
      const html = renderToStaticMarkup(
        <AdaptiveAnswerCard
          presentation={{ schemaVersion: 1, type, eyebrow: 'CLARA', title: type, summary: 'Exact answer.', points: type === 'LIST_CARD' ? ['Exact answer.'] : [], highlights: type === 'STATS_CARD' ? ['Exact answer.'] : [], choices: type === 'CHOICE_CARD' ? ['Exact answer.'] : [] }}
          onChoice={() => undefined}
        />,
      );
      expect(html).toContain(`data-presentation-type="${type}"`);
    },
  );
});
