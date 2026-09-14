import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import type { AnswerPresentation, TextMessage } from '../../types/chat';

type Props = {
  presentation: AnswerPresentation;
  onChoice: (choice: string) => void;
  scriptClassName?: string;
};

export type AdaptiveCardPage = {
  lead?: string;
  items: string[];
  choices: string[];
};

type PageBudget = {
  characters: number;
  units: number;
};

const DESKTOP_PAGE_BUDGET: PageBudget = { characters: 680, units: 4 };
const SHORT_KIOSK_PAGE_BUDGET: PageBudget = { characters: 430, units: 3 };

function semanticTextUnits(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  return normalized
    .split(/(?:\r?\n){2,}|(?<=[.!?।])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function chunkUnits(units: string[], budget: PageBudget): string[][] {
  const pages: string[][] = [];
  let page: string[] = [];
  let characters = 0;

  units.forEach((unit) => {
    const nextCharacters = characters + unit.length;
    if (page.length > 0 && (page.length >= budget.units || nextCharacters > budget.characters)) {
      pages.push(page);
      page = [];
      characters = 0;
    }
    page.push(unit);
    characters += unit.length;
  });

  if (page.length > 0) pages.push(page);
  return pages.length > 0 ? pages : [[]];
}

export function buildAdaptiveCardPages(
  presentation: AnswerPresentation,
  budget: PageBudget = DESKTOP_PAGE_BUDGET,
): AdaptiveCardPage[] {
  if (presentation.type === 'CHOICE_CARD') {
    return [{ lead: presentation.summary, items: [], choices: presentation.choices }];
  }

  const isNarrative = presentation.type === 'INFO_CARD' || presentation.type === 'GENERIC_ANSWER_CARD';
  const sourceUnits = presentation.points.length > 0
    ? presentation.points
    : presentation.highlights.length > 0
      ? presentation.highlights
      : semanticTextUnits(presentation.summary);
  const chunks = chunkUnits(sourceUnits, budget);

  const pages: AdaptiveCardPage[] = chunks.map((chunk, index) => {
    const useLead = isNarrative && index === 0 && chunk.length > 0;
    return {
      lead: useLead ? chunk[0] : undefined,
      items: useLead ? chunk.slice(1) : chunk,
      choices: [],
    };
  });

  if (presentation.choices.length > 0) {
    const lastPage = pages[pages.length - 1];
    const occupiedUnits = lastPage.items.length + (lastPage.lead ? 1 : 0);
    const occupiedCharacters = (lastPage.lead?.length ?? 0)
      + lastPage.items.reduce((total, item) => total + item.length, 0);
    const choiceCharacters = presentation.choices.reduce((total, choice) => total + choice.length, 0);
    if (
      occupiedUnits + presentation.choices.length <= budget.units
      && occupiedCharacters + choiceCharacters <= budget.characters
    ) {
      lastPage.choices = presentation.choices;
    } else {
      pages.push({ items: [], choices: presentation.choices });
    }
  }

  return pages;
}

export function resolveAnswerPresentation(
  message: Pick<TextMessage, 'text' | 'visualResponseEligible' | 'answerPresentation'> | null,
): AnswerPresentation | null {
  if (!message) return null;
  if (message.answerPresentation) return message.answerPresentation;
  if (!message.visualResponseEligible || !message.text.trim()) return null;
  return {
    schemaVersion: 1,
    type: 'GENERIC_ANSWER_CARD',
    eyebrow: '',
    title: 'CLARA',
    summary: message.text,
    points: [],
    highlights: [],
    choices: [],
  };
}

function initialViewportHeight(): number {
  return typeof window === 'undefined' ? 1080 : window.innerHeight;
}

export default function AdaptiveAnswerCard({ presentation, onChoice, scriptClassName = '' }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(initialViewportHeight);
  const budget = viewportHeight < 900 ? SHORT_KIOSK_PAGE_BUDGET : DESKTOP_PAGE_BUDGET;
  const pages = useMemo(
    () => buildAdaptiveCardPages(presentation, budget),
    [budget.characters, budget.units, presentation],
  );
  const safePageIndex = Math.min(pageIndex, pages.length - 1);
  const page = pages[safePageIndex] ?? { items: [], choices: [] };
  const allContentLength = presentation.summary.length
    + presentation.points.join('').length
    + presentation.highlights.join('').length
    + presentation.choices.join('').length;
  const density = pages.length > 1 || allContentLength > 620
    ? 'expanded'
    : allContentLength <= 240
      ? 'compact'
      : 'standard';

  useEffect(() => {
    setPageIndex(0);
  }, [presentation]);

  useEffect(() => {
    const updateViewportHeight = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', updateViewportHeight);
    return () => window.removeEventListener('resize', updateViewportHeight);
  }, []);

  const isSteps = presentation.type === 'STEP_CARD';
  const isStats = presentation.type === 'STATS_CARD';
  const isList = presentation.type === 'LIST_CARD';
  const hasPages = pages.length > 1;
  const pageItemOffset = pages
    .slice(0, safePageIndex)
    .reduce((total, priorPage) => total + priorPage.items.length, 0);

  return (
    <article
      className={`adaptive-answer-card${scriptClassName ? ` ${scriptClassName}` : ''}`}
      data-presentation-type={presentation.type}
      data-card-density={density}
      data-card-page={safePageIndex + 1}
      data-card-pages={pages.length}
    >
      <span className="adaptive-answer-card__wash" aria-hidden />
      <header className="adaptive-answer-card__header">
        <span className="adaptive-answer-card__icon" aria-hidden>
          {isSteps || isList ? <ListChecks /> : <Sparkles />}
        </span>
        <div className="adaptive-answer-card__heading">
          {presentation.eyebrow ? <p className="adaptive-answer-card__eyebrow">{presentation.eyebrow}</p> : null}
          <h2>{presentation.title}</h2>
        </div>
        {hasPages ? (
          <span className="adaptive-answer-card__page-count" aria-label={`Page ${safePageIndex + 1} of ${pages.length}`}>
            {String(safePageIndex + 1).padStart(2, '0')} <i aria-hidden>/</i> {String(pages.length).padStart(2, '0')}
          </span>
        ) : null}
      </header>

      <div className="adaptive-answer-card__body" aria-live="polite">
        {page.lead ? <p className="adaptive-answer-card__lead">{page.lead}</p> : null}

        {page.items.length > 0 ? (
          isSteps ? (
            <ol className="adaptive-answer-card__sections adaptive-answer-card__sections--steps" start={pageItemOffset + 1}>
              {page.items.map((item, index) => (
                <li key={`${safePageIndex}-${index}-${item}`}>
                  <span className="adaptive-answer-card__step-number" aria-hidden>
                    {String(pageItemOffset + index + 1).padStart(2, '0')}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <ul className={`adaptive-answer-card__sections${isStats ? ' adaptive-answer-card__sections--stats' : ''}`}>
              {page.items.map((item, index) => (
                <li key={`${safePageIndex}-${index}-${item}`}>
                  {isList ? <Check className="adaptive-answer-card__check" aria-hidden /> : <span className="adaptive-answer-card__bullet" aria-hidden />}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {page.choices.length > 0 ? (
          <div className="adaptive-answer-card__choices">
            {page.choices.map((choice) => (
              <button type="button" key={choice} onClick={() => onChoice(choice)}>
                <span>{choice}</span>
                <ArrowRight aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {hasPages ? (
        <footer className="adaptive-answer-card__pager">
          <button
            type="button"
            aria-label="Previous page"
            disabled={safePageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft aria-hidden />
          </button>
          <div className="adaptive-answer-card__page-dots" aria-hidden>
            {pages.map((_, index) => <span key={index} className={index === safePageIndex ? 'is-active' : ''} />)}
          </div>
          <button
            type="button"
            aria-label="Next page"
            disabled={safePageIndex === pages.length - 1}
            onClick={() => setPageIndex((current) => Math.min(pages.length - 1, current + 1))}
          >
            <ArrowRight aria-hidden />
          </button>
        </footer>
      ) : null}
    </article>
  );
}
