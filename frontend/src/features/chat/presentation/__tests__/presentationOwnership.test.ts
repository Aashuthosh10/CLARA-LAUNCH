/**
 * M5.10 Phase 2D-FIX — card presentation ownership / switching.
 *
 * PresentationEngine owns the playhead. A valid N-unit plan outranks
 * a legacy kind:'single' load for the same turn. Visible card index
 * follows snapshot.cardIndex after activateByUnitId.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PresentationEngine } from '../PresentationEngine';
import { cardsToScenes, planToScenes } from '../planToScenes';
import {
  shouldAllowLegacySingle,
  shouldLoadUnitPlan,
  unitIdsFromSegments,
  unitSequencesEqual,
} from '../presentationOwnership';
import type { NarrationPlanInput } from '../types';

const HERE = dirname(fileURLToPath(import.meta.url));

function campusPlan(turnId: string, unitIds: string[]): NarrationPlanInput {
  return {
    turnId,
    mode: 'card_narration',
    segments: unitIds.map((unitId, i) => ({
      segmentId: `${turnId}:seg:${i}`,
      displayText: `card ${unitId}`,
      ttsText: `narrate ${unitId}`,
      cardIndex: i,
      cardId: 'campus',
      sectionId: `sec_${i}`,
      unitId,
      isFinalSegment: i === unitIds.length - 1,
    })),
  };
}

function playAndActivate(eng: PresentationEngine, unitIds: string[]): string[] {
  const visible: string[] = [];
  eng.play();
  for (let i = 0; i < unitIds.length; i++) {
    if (i > 0) {
      expect(eng.activateByUnitId(unitIds[i]!)).toBe(true);
    }
    const snap = eng.snapshot();
    expect(snap.cardIndex).toBe(i);
    expect(snap.activeScene?.unitId).toBe(unitIds[i]);
    visible.push(snap.activeScene?.unitId || '');
    const token = eng.beginAudioBind(snap.presentationId!, snap.activeScene!.sceneId);
    expect(token).toBeTruthy();
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap.presentationId!,
      audioToken: token!,
      sceneId: snap.activeScene!.sceneId,
    });
  }
  return visible;
}

describe('presentation ownership helpers', () => {
  it('extracts unique unitIds in plan order', () => {
    expect(
      unitIdsFromSegments([
        { unitId: 'cse.hod' },
        { unitId: 'cse.fees' },
        { unitId: 'cse.hod' },
        { unitId: '  ' },
        {},
      ]),
    ).toEqual(['cse.hod', 'cse.fees']);
  });

  it('blocks legacy single when a unit plan exists', () => {
    expect(shouldAllowLegacySingle(['cse.hod', 'cse.fees'])).toBe(false);
    expect(shouldAllowLegacySingle([])).toBe(true);
  });

  it('loads a unit plan on a new turn', () => {
    expect(
      shouldLoadUnitPlan({
        incomingTurnId: 't2',
        lastLoadedTurnId: 't1',
        incomingUnitIds: ['hostel.girls.rooms', 'canteen.hygiene'],
        loadedSceneUnitIds: ['stage'],
      }),
    ).toBe(true);
  });

  it('upgrades a same-turn legacy single scene to the N-unit plan', () => {
    expect(
      shouldLoadUnitPlan({
        incomingTurnId: 't-same',
        lastLoadedTurnId: 't-same',
        incomingUnitIds: ['cse.hod', 'cse.fees'],
        loadedSceneUnitIds: [],
      }),
    ).toBe(true);
    expect(
      shouldLoadUnitPlan({
        incomingTurnId: 't-same',
        lastLoadedTurnId: 't-same',
        incomingUnitIds: ['cse.hod', 'cse.fees'],
        loadedSceneUnitIds: ['cse.hod'],
      }),
    ).toBe(true);
  });

  it('does not reload an already-matching unit sequence', () => {
    expect(
      shouldLoadUnitPlan({
        incomingTurnId: 't-same',
        lastLoadedTurnId: 't-same',
        incomingUnitIds: ['leadership.principal', 'leadership.trustees'],
        loadedSceneUnitIds: ['leadership.principal', 'leadership.trustees'],
      }),
    ).toBe(false);
  });

  it('does not treat a missing unitId as a CSE fallback', () => {
    expect(unitIdsFromSegments([{ unitId: null }, { unitId: undefined }])).toEqual([]);
    expect(unitSequencesEqual(['cse.hod'], ['cse.overview'])).toBe(false);
  });
});

describe('N-unit activateByUnitId + snapshot.cardIndex', () => {
  it('switches visible unit A → B → C for mixed campus cards', () => {
    const units = ['hostel.girls.rooms', 'canteen.hygiene', 'events.techvidya'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-campus-3', units) });
    expect(playAndActivate(eng, units)).toEqual(units);
    expect(eng.snapshot().engineState).toBe('PRESENTATION_COMPLETE');
  });

  it('switches CSE HOD → CSE fees', () => {
    const units = ['cse.hod', 'cse.fees'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-hod-fees', units) });
    expect(playAndActivate(eng, units)).toEqual(units);
  });

  it('switches principal → trustees', () => {
    const units = ['leadership.principal', 'leadership.trustees'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-lead', units) });
    expect(playAndActivate(eng, units)).toEqual(units);
  });

  it('switches mixed department + campus without collapsing identity', () => {
    const units = ['cse_ds.hod', 'hostel.girls.rooms'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-mixed', units) });
    expect(playAndActivate(eng, units)).toEqual(units);
  });

  it('switches leadership + department', () => {
    const units = ['leadership.principal', 'cse.hod'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-lead-dept', units) });
    expect(playAndActivate(eng, units)).toEqual(units);
  });

  it('rejects out-of-order TTS arrival and keeps the visible card', () => {
    const units = ['hostel.girls.rooms', 'canteen.hygiene', 'events.techvidya'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-ooo', units) });
    eng.play();
    expect(eng.snapshot().cardIndex).toBe(0);
    expect(eng.activateByUnitId('events.techvidya')).toBe(false);
    expect(eng.snapshot().cardIndex).toBe(0);
    expect(eng.snapshot().activeScene?.unitId).toBe('hostel.girls.rooms');
  });

  it('replaces a legacy single presentation with the N-unit plan on the same turn', () => {
    const turnId = 't-upgrade';
    const units = ['cse.hod', 'cse.fees'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({
      kind: 'single',
      turnId,
      cardId: 'stage',
      caption: '',
      spokenSummary: '',
    });
    eng.play();
    expect(eng.snapshot().scenes.some((s) => s.unitId)).toBe(false);
    expect(eng.activateByUnitId('cse.hod')).toBe(false);

    expect(
      shouldLoadUnitPlan({
        incomingTurnId: turnId,
        lastLoadedTurnId: turnId,
        incomingUnitIds: units,
        loadedSceneUnitIds: eng.snapshot().scenes.map((s) => s.unitId || '').filter(Boolean),
      }),
    ).toBe(true);

    eng.loadPresentation({ kind: 'plan', plan: campusPlan(turnId, units) });
    eng.play();
    expect(eng.activateByUnitId('cse.hod')).toBe(true);
    expect(eng.snapshot().cardIndex).toBe(0);
    expect(eng.activateByUnitId('cse.fees')).toBe(true);
    expect(eng.snapshot().cardIndex).toBe(1);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.fees');
  });

  it('stale-turn activate does not rewrite cardIndex when unit is unknown', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({
      kind: 'plan',
      plan: campusPlan('t-live', ['cse.hod', 'cse.fees']),
    });
    eng.play();
    expect(eng.snapshot().cardIndex).toBe(0);
    expect(eng.activateByUnitId('canteen.hygiene')).toBe(false);
    expect(eng.snapshot().cardIndex).toBe(0);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.hod');
  });

  it('preserves unitId on plan scenes and cardsToScenes', () => {
    const plan = campusPlan('t-kn', ['hostel.girls.rooms', 'canteen.hygiene']);
    const scenes = planToScenes(plan, 'pres-1');
    expect(scenes.map((s) => s.unitId)).toEqual(['hostel.girls.rooms', 'canteen.hygiene']);
    const cardScenes = cardsToScenes(
      [
        { title: 'Rooms', content: 'A', type: 'hostel', unitId: 'hostel.girls.rooms' },
        { title: 'Hygiene', content: 'B', type: 'canteen', unitId: 'canteen.hygiene' },
      ],
      'pres-2',
      't-cards',
    );
    expect(cardScenes.map((s) => s.unitId)).toEqual(['hostel.girls.rooms', 'canteen.hygiene']);
  });

  it('spoken summaries stay bound to the same unit as the visible scene', () => {
    const units = ['cse_ds.hod', 'cse_ds.fees'];
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: campusPlan('t-sync', units) });
    eng.play();
    expect(eng.snapshot().activeScene?.spokenSummary).toBe('narrate cse_ds.hod');
    expect(eng.activateByUnitId('cse_ds.fees')).toBe(true);
    expect(eng.snapshot().activeScene?.spokenSummary).toBe('narrate cse_ds.fees');
    expect(eng.snapshot().activeScene?.unitId).toBe('cse_ds.fees');
  });
});

describe('ChatScreen currentCardIdx ownership invariant', () => {
  it('does not write currentCardIdx after activateByUnitId(unitId)', () => {
    const src = readFileSync(join(HERE, '../../../../screens/ChatScreen.tsx'), 'utf8');
    expect(src).not.toMatch(
      /activateByUnitId\(unitId\)[\s\S]{0,220}setCurrentCardIdx\(idx\)/,
    );
    expect(src).toContain('setCurrentCardIdx(snap.cardIndex)');
    expect(src).toContain('shouldLoadUnitPlan');
    expect(src).toContain('shouldAllowLegacySingle');
  });

  it('does not let legacy audio scenes run while a unit-backed plan exists', () => {
    const src = readFileSync(join(HERE, '../../../../screens/ChatScreen.tsx'), 'utf8');
    // Both legacy loaders must remain behind the no-unit-plan boundary. This
    // prevents a late clip from replacing an N-scene unit presentation.
    expect(src).toContain("unitIdsFromSegments(plan?.segments).length === 0");
    expect(src).toMatch(/shouldAllowLegacySingle\(planUnits\)[\s\S]{0,900}kind: 'cards'/);
    expect(src).toMatch(/shouldAllowLegacySingle\(planUnits\)[\s\S]{0,900}kind: 'single'/);
  });
});
