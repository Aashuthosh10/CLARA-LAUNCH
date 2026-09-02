/**
 * M5.10 deterministic architecture forensic suite.
 *
 * This intentionally stops at the current presentation contract. It does not
 * invoke SpeechRecognition, the parser, UnitSelector, RAG, Groq, or M5.8.
 * Visible-card observations are always derived from PresentationEngine.snapshot().
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PresentationEngine } from '../PresentationEngine';
import { planToScenes } from '../planToScenes';
import {
  shouldAllowLegacySingle,
  shouldLoadUnitPlan,
  unitIdsFromSegments,
} from '../presentationOwnership';
import type { NarrationPlanInput } from '../types';

type Language = 'en' | 'kn' | 'hi' | 'ta' | 'te' | 'ml';

const languages: Language[] = ['en', 'kn', 'hi', 'ta', 'te', 'ml'];

const requestedSequences: Array<{ name: string; units: string[] }> = [
  { name: 'department', units: ['cse_ds.hod', 'cse_ds.fees', 'events.techvidya'] },
  {
    name: 'mixed-department-campus',
    units: ['cse_ds.hod', 'cse_ds.fees', 'canteen.hygiene', 'events.techvidya'],
  },
  {
    name: 'leadership-department',
    units: ['leadership.principal', 'cse_ds.hod', 'cse_ds.fees'],
  },
  {
    name: 'three-unrelated-campus',
    units: ['hostel.girls.rooms', 'canteen.hygiene', 'events.techvidya'],
  },
  {
    name: 'five-unit',
    units: [
      'hostel.girls.rooms',
      'hostel.boys.fees',
      'canteen.timings',
      'events.sanchalana',
      'events.techvidya',
    ],
  },
];

function planFor(language: Language, name: string, units: string[]): NarrationPlanInput {
  return {
    turnId: `m510-${language}-${name}`,
    mode: 'card_narration',
    // The production payload carries language alongside the plan. The engine
    // intentionally consumes only the plan contract, so language is retained
    // here as fixture metadata and checked at the boundary below.
    ...( { language_code_key: language } as Record<string, unknown> ),
    segments: units.map((unitId, index) => ({
      segmentId: `m510-${language}-${name}:seg:${index}`,
      displayText: `${language} visible ${unitId}`,
      ttsText: `${language} spoken ${unitId}`,
      cardIndex: index,
      cardId: 'unit_card',
      sectionId: `unit:${unitId}`,
      unitId,
      isFinalSegment: index === units.length - 1,
    })),
  };
}

function runPlan(plan: NarrationPlanInput) {
  const engine = new PresentationEngine();
  engine.setSceneAdvanceMode('per_clip');
  const planScenes = planToScenes(plan, `pres-${plan.turnId}`);
  const activations: Array<{ unitId: string; accepted: boolean; cardIndex: number; visibleUnitId: string | null; ttsText: string }> = [];

  engine.loadPresentation({ kind: 'plan', plan });
  expect(engine.play()).toBe(true);

  for (const [index, segment] of plan.segments.entries()) {
    const unitId = String(segment.unitId);
    if (index > 0) {
      const previous = engine.snapshot();
      const token = engine.beginAudioBind(previous.presentationId!, previous.activeScene!.sceneId);
      expect(token).toBeTruthy();
      engine.onAudioEvent({
        type: 'ended',
        presentationId: previous.presentationId!,
        audioToken: token!,
        sceneId: previous.activeScene!.sceneId,
      });
    }

    const accepted = index === 0 ? true : engine.activateByUnitId(unitId);
    const snapshot = engine.snapshot();
    activations.push({
      unitId,
      accepted,
      cardIndex: snapshot.cardIndex,
      visibleUnitId: snapshot.activeScene?.unitId ?? null,
      ttsText: snapshot.activeScene?.spokenSummary ?? '',
    });
  }

  return { engine, planScenes, activations };
}

describe('M5.10 multilingual plan contract', () => {
  for (const language of languages) {
    for (const sequence of requestedSequences) {
      it(`${language} ${sequence.name} preserves unit/order/language fixture`, () => {
        const plan = planFor(language, sequence.name, sequence.units);
        const result = runPlan(plan);

        expect(result.planScenes.map((scene) => scene.unitId)).toEqual(sequence.units);
        expect(result.activations.map((entry) => entry.accepted)).toEqual(
          sequence.units.map(() => true),
        );
        expect(result.activations.map((entry) => entry.cardIndex)).toEqual(
          sequence.units.map((_, index) => index),
        );
        expect(result.activations.map((entry) => entry.visibleUnitId)).toEqual(sequence.units);
        expect(result.activations.map((entry) => entry.ttsText)).toEqual(
          sequence.units.map((unitId) => `${language} spoken ${unitId}`),
        );
        expect((plan as NarrationPlanInput & { language_code_key: string }).language_code_key).toBe(language);
      });
    }
  }
});

describe('M5.10 critical historical HOD → fees → TechVidya sequence', () => {
  it('keeps visible and spoken unit identity aligned for every clip', () => {
    const units = ['cse_ds.hod', 'cse_ds.fees', 'events.techvidya'];
    const result = runPlan(planFor('kn', 'critical', units));
    expect(result.activations).toEqual([
      { unitId: units[0], accepted: true, cardIndex: 0, visibleUnitId: units[0], ttsText: 'kn spoken cse_ds.hod' },
      { unitId: units[1], accepted: true, cardIndex: 1, visibleUnitId: units[1], ttsText: 'kn spoken cse_ds.fees' },
      { unitId: units[2], accepted: true, cardIndex: 2, visibleUnitId: units[2], ttsText: 'kn spoken events.techvidya' },
    ]);
  });
});

describe('M5.10 legacy interference observations', () => {
  it('canonical ownership guard refuses legacy single/cards when a valid plan exists', () => {
    const units = ['cse_ds.hod', 'cse_ds.fees', 'events.techvidya'];
    expect(shouldAllowLegacySingle(units)).toBe(false);
    expect(
      shouldLoadUnitPlan({
        incomingTurnId: 'legacy-same-turn',
        lastLoadedTurnId: 'legacy-same-turn',
        incomingUnitIds: units,
        loadedSceneUnitIds: ['cse_ds.hod'],
      }),
    ).toBe(true);
  });

  it('records that an unguarded direct legacy load can replace a valid plan', () => {
    const units = ['cse_ds.hod', 'cse_ds.fees', 'events.techvidya'];
    const engine = new PresentationEngine();
    engine.loadPresentation({ kind: 'plan', plan: planFor('kn', 'legacy-observation', units) });
    engine.play();
    engine.loadPresentation({
      kind: 'single',
      turnId: 'legacy-observation',
      cardId: 'legacy_single',
      caption: 'legacy',
      spokenSummary: 'legacy',
    });
    // This is an intentionally explicit forensic observation, not a desired
    // invariant: PresentationEngine itself has no legacy-priority guard.
    expect(engine.snapshot().activeScene?.unitId ?? null).toBe(null);
  });

  it('rejects missing unit identity rather than inventing a fallback unit', () => {
    expect(unitIdsFromSegments([{ unitId: null }, { unitId: '' }, {}])).toEqual([]);
  });
});

describe('M5.10 ChatScreen legacy reachability inventory', () => {
  it('keeps an auditable list of current legacy mechanisms and guards', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/screens/ChatScreen.tsx'), 'utf8');
    const mechanisms = {
      cardTrigger: source.includes('cardTrigger'),
      cardsToSync: source.includes('cardsToSync'),
      kindCards: source.includes("kind: 'cards'"),
      kindSingle: source.includes("kind: 'single'"),
      legacyRenderer: source.includes('activeCards') || source.includes('departmentSlides'),
      unitPlanGuard: source.includes('shouldAllowLegacySingle') && source.includes('shouldLoadUnitPlan'),
    };
    expect(mechanisms).toEqual({
      cardTrigger: true,
      cardsToSync: true,
      kindCards: true,
      kindSingle: true,
      legacyRenderer: true,
      unitPlanGuard: true,
    });
  });
});
