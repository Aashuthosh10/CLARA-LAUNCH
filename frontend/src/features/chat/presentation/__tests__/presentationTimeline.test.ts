/**
 * M4.3 — section-driven PresentationEngine + timeline unit checks.
 * Vitest-compatible (same style as presentationContract.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { PresentationEngine } from '../PresentationEngine';
import { buildTimelineFromPlan, validateTimeline } from '../presentationTimeline';
import { planToScenes } from '../planToScenes';
import type { NarrationPlanInput } from '../types';

const DEPT_PLAN: NarrationPlanInput = {
  turnId: 't-dept',
  mode: 'card_narration',
  segments: [
    {
      segmentId: 't-dept:seg:0',
      displayText: 'Intro',
      ttsText: 'Intro',
      cardIndex: 0,
      cardId: 'dept_slide',
      sectionId: 'intro',
      unitId: 'cse.overview',
      isFinalSegment: false,
    },
    {
      segmentId: 't-dept:seg:1',
      displayText: 'HOD',
      ttsText: 'HOD',
      cardIndex: 1,
      cardId: 'dept_slide',
      sectionId: 'hod_voice',
      unitId: 'cse.hod',
      isFinalSegment: false,
    },
    {
      segmentId: 't-dept:seg:2',
      displayText: 'Achievements',
      ttsText: 'Achievements',
      cardIndex: 2,
      cardId: 'dept_slide',
      sectionId: 'achievements',
      unitId: 'cse.achievements',
      isFinalSegment: false,
    },
    {
      segmentId: 't-dept:seg:3',
      displayText: 'Placements',
      ttsText: 'Placements',
      cardIndex: 3,
      cardId: 'dept_slide',
      sectionId: 'placement',
      unitId: 'cse.placements',
      isFinalSegment: false,
    },
    {
      segmentId: 't-dept:seg:4',
      displayText: 'Fees',
      ttsText: 'Fees',
      cardIndex: 4,
      cardId: 'dept_slide',
      sectionId: 'fees',
      unitId: 'cse.fees',
      isFinalSegment: true,
    },
  ],
};

describe('presentationTimeline', () => {
  it('builds five section-keyed entries', () => {
    const tl = buildTimelineFromPlan(DEPT_PLAN, 'pres-1');
    expect(tl.entries).toHaveLength(5);
    expect(tl.entries.map((e) => e.sectionId)).toEqual([
      'intro',
      'hod_voice',
      'achievements',
      'placement',
      'fees',
    ]);
    expect(validateTimeline(tl).ok).toBe(true);
  });

  it('planToScenes carries sectionId', () => {
    const scenes = planToScenes(DEPT_PLAN, 'pres-1');
    expect(scenes.map((s) => s.sectionId)).toEqual([
      'intro',
      'hod_voice',
      'achievements',
      'placement',
      'fees',
    ]);
  });

  it('allows duplicate sectionId when unitId differs', () => {
    const plan: NarrationPlanInput = {
      turnId: 't-dept-dup-section',
      mode: 'card_narration',
      segments: [
        {
          segmentId: 'd0',
          displayText: 'HOD 1',
          ttsText: 'HOD 1',
          cardIndex: 0,
          cardId: 'dept_slide',
          sectionId: 'hod_voice',
          unitId: 'cse.hod',
          isFinalSegment: false,
        },
        {
          segmentId: 'd1',
          displayText: 'HOD 2',
          ttsText: 'HOD 2',
          cardIndex: 1,
          cardId: 'dept_slide',
          sectionId: 'hod_voice',
          unitId: 'cse_aiml.hod',
          isFinalSegment: true,
        },
      ],
    };

    const tl = buildTimelineFromPlan(plan, 'pres-dup');
    const res = validateTimeline(tl);
    expect(res.ok).toBe(true);
  });
});

describe('PresentationEngine activateBySectionId', () => {
  it('activates placement by meaning after sequential sections', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    expect(eng.snapshot().activeScene?.sectionId).toBe('intro');

    // Simulate clip end → SCENE_COMPLETE
    const snap0 = eng.snapshot();
    const token = eng.beginAudioBind(snap0.presentationId!, snap0.activeScene!.sceneId);
    expect(token).toBeTruthy();
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap0.presentationId!,
      audioToken: token!,
      sceneId: snap0.activeScene!.sceneId,
    });

    expect(eng.activateBySectionId('hod_voice')).toBe(true);
    expect(eng.snapshot().activeScene?.sectionId).toBe('hod_voice');

    const snap1 = eng.snapshot();
    const t1 = eng.beginAudioBind(snap1.presentationId!, snap1.activeScene!.sceneId)!;
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap1.presentationId!,
      audioToken: t1,
      sceneId: snap1.activeScene!.sceneId,
    });
    expect(eng.activateBySectionId('achievements')).toBe(true);

    const snap2 = eng.snapshot();
    const t2 = eng.beginAudioBind(snap2.presentationId!, snap2.activeScene!.sceneId)!;
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap2.presentationId!,
      audioToken: t2,
      sceneId: snap2.activeScene!.sceneId,
    });
    expect(eng.activateBySectionId('placement')).toBe(true);
    expect(eng.snapshot().activeScene?.sectionId).toBe('placement');
  });

  it('rejects skip of section order', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    expect(eng.activateBySectionId('placement')).toBe(false);
    expect(eng.snapshot().activeScene?.sectionId).toBe('intro');
  });

  it('cancel resets cleanly', () => {
    const eng = new PresentationEngine();
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    eng.cancel();
    expect(eng.state).toBe('IDLE');
    expect(eng.snapshot().scenes).toHaveLength(0);
  });

  it('new loadPresentation resets to first section', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    const snap = eng.snapshot();
    const token = eng.beginAudioBind(snap.presentationId!, snap.activeScene!.sceneId)!;
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap.presentationId!,
      audioToken: token,
      sceneId: snap.activeScene!.sceneId,
    });
    eng.activateBySectionId('hod_voice');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    expect(eng.snapshot().activeScene?.sectionId).toBe('intro');
  });
});

describe('PresentationEngine activateByUnitId', () => {
  it('rejects out-of-order activation by unitId (per_clip)', () => {
    const plan: NarrationPlanInput = {
      turnId: 't-dept-unit-order',
      mode: 'card_narration',
      segments: [
        {
          segmentId: 'u0',
          displayText: 'Intro',
          ttsText: 'Intro',
          cardIndex: 0,
          cardId: 'dept_slide',
          sectionId: 'intro',
          unitId: 'cse.overview',
          isFinalSegment: false,
        },
        {
          segmentId: 'u1',
          displayText: 'HOD 1',
          ttsText: 'HOD 1',
          cardIndex: 1,
          cardId: 'dept_slide',
          sectionId: 'hod_voice',
          unitId: 'cse.hod',
          isFinalSegment: false,
        },
        {
          segmentId: 'u2',
          displayText: 'HOD 2',
          ttsText: 'HOD 2',
          cardIndex: 2,
          cardId: 'dept_slide',
          sectionId: 'hod_voice',
          unitId: 'cse_aiml.hod',
          isFinalSegment: true,
        },
      ],
    };

    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan });
    eng.play();

    // Current is idx0; activating idx2 must be rejected.
    expect(eng.activateByUnitId('cse_aiml.hod')).toBe(false);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.overview');

    // Activating next (idx1) is allowed.
    expect(eng.activateByUnitId('cse.hod')).toBe(true);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.hod');
  });

  it('manual jumpToCardIndex seeks by card index without wiping auto order-guard', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    const snap0 = eng.snapshot();
    const token0 = eng.beginAudioBind(snap0.presentationId!, snap0.activeScene!.sceneId);
    expect(token0).toBeTruthy();

    expect(eng.jumpToCardIndex(2)).toBe(true);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.achievements');
    expect(eng.activateByUnitId('cse.achievements')).toBe(true);

    // Stale clip-0 ended must not complete or revert the seek target.
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap0.presentationId!,
      audioToken: token0!,
      sceneId: snap0.activeScene!.sceneId,
    });
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.achievements');
    expect(eng.snapshot().engineState).not.toBe('PRESENTATION_COMPLETE');
  });

  it('left jump from placements to achievements keeps unit identity', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();
    expect(eng.jumpToCardIndex(3)).toBe(true);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.placements');
    expect(eng.jumpToCardIndex(2)).toBe(true);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.achievements');
  });

  it('PRESENTATION_COMPLETE occurs only after the final unit ends', () => {
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan: DEPT_PLAN });
    eng.play();

    const units = [
      'cse.overview',
      'cse.hod',
      'cse.achievements',
      'cse.placements',
      'cse.fees',
    ];
    for (let i = 0; i < units.length; i++) {
      expect(eng.snapshot().activeScene?.unitId).toBe(units[i]);
      const snap = eng.snapshot();
      const token = eng.beginAudioBind(snap.presentationId!, snap.activeScene!.sceneId);
      expect(token).toBeTruthy();
      eng.onAudioEvent({
        type: 'ended',
        presentationId: snap.presentationId!,
        audioToken: token!,
        sceneId: snap.activeScene!.sceneId,
      });
      if (i < units.length - 1) {
        expect(eng.snapshot().engineState).not.toBe('PRESENTATION_COMPLETE');
        expect(eng.activateByUnitId(units[i + 1]!)).toBe(true);
      }
    }
    expect(eng.snapshot().engineState).toBe('PRESENTATION_COMPLETE');
    expect(eng.snapshot().activeScene?.unitId).toBe('cse.fees');
  });

  it('multi-HOD completes only after the second unit, despite duplicate sectionId', () => {
    const plan: NarrationPlanInput = {
      turnId: 't-multi-hod',
      mode: 'card_narration',
      segments: [
        {
          segmentId: 'h0',
          displayText: 'AIML HOD',
          ttsText: 'AIML body',
          cardIndex: 0,
          cardId: 'hod',
          sectionId: 'hod_voice',
          unitId: 'cse_aiml.hod',
          isFinalSegment: false,
        },
        {
          segmentId: 'h1',
          displayText: 'DS HOD',
          ttsText: 'DS body',
          cardIndex: 1,
          cardId: 'hod',
          sectionId: 'hod_voice',
          unitId: 'cse_ds.hod',
          isFinalSegment: true,
        },
      ],
    };
    const eng = new PresentationEngine();
    eng.setSceneAdvanceMode('per_clip');
    eng.loadPresentation({ kind: 'plan', plan });
    eng.play();
    expect(eng.snapshot().activeScene?.unitId).toBe('cse_aiml.hod');
    const snap0 = eng.snapshot();
    const token0 = eng.beginAudioBind(snap0.presentationId!, snap0.activeScene!.sceneId);
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap0.presentationId!,
      audioToken: token0!,
      sceneId: snap0.activeScene!.sceneId,
    });
    expect(eng.snapshot().engineState).not.toBe('PRESENTATION_COMPLETE');
    expect(eng.activateByUnitId('cse_ds.hod')).toBe(true);
    expect(eng.snapshot().activeScene?.unitId).toBe('cse_ds.hod');
    const snap1 = eng.snapshot();
    const token1 = eng.beginAudioBind(snap1.presentationId!, snap1.activeScene!.sceneId);
    eng.onAudioEvent({
      type: 'ended',
      presentationId: snap1.presentationId!,
      audioToken: token1!,
      sceneId: snap1.activeScene!.sceneId,
    });
    expect(eng.snapshot().engineState).toBe('PRESENTATION_COMPLETE');
  });
});
