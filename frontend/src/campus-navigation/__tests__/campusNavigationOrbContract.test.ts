/**
 * Campus Navigation must host the shared ChatOrbControl — not a decorative copy —
 * and must not fork session / auto-listen / WebSocket ownership.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveOrbVisualState } from '../../lib/voice/orbVisualState';
import { shouldScheduleAutoListenArm } from '../../lib/voice/autoListenSpeakingGate';

const chatScreenPath = resolve(__dirname, '../../screens/ChatScreen.tsx');
const chatScreenSrc = readFileSync(chatScreenPath, 'utf8');
const cssPath = resolve(__dirname, '../../styles/cinematic-light.css');
const cssSrc = readFileSync(cssPath, 'utf8');
const orbControlPath = resolve(__dirname, '../../screens/chat/ChatOrbControl.tsx');
const orbControlSrc = readFileSync(orbControlPath, 'utf8');

describe('campus navigation orb contract', () => {
  it('renders shared ChatOrbControl in campus-nav-orb-slot under Read Directions', () => {
    expect(chatScreenSrc).toContain('data-testid="campus-nav-orb-slot"');
    expect(chatScreenSrc).toContain('campus-nav-orb-slot');
    expect(chatScreenSrc).toMatch(
      /isCampusNavigationStage[\s\S]*?campus-nav-orb-slot[\s\S]*?<ChatOrbControl/,
    );
    expect(orbControlSrc).toContain('data-testid="chat-orb"');
    expect(chatScreenSrc).not.toMatch(/function\s+NavigationOrb\b/);
    expect(chatScreenSrc).not.toContain('NavigationOrb');
  });

  it('uses compact ChatOrbControl props wired to shared orbState / handleOrbTap', () => {
    const slotIdx = chatScreenSrc.indexOf('campus-nav-orb-slot');
    expect(slotIdx).toBeGreaterThan(0);
    const slotBlock = chatScreenSrc.slice(slotIdx, slotIdx + 900);
    expect(slotBlock).toContain('orbState={orbState}');
    expect(slotBlock).toContain('onTap={handleOrbTap}');
    expect(slotBlock).toContain('compact');
    expect(slotBlock).toContain('frequencyDataRef={voiceAnalyser.frequencyDataRef}');
  });

  it('does not mount a second orb while campus navigation is active', () => {
    // Bottom split orb remains gated off during campus stage
    expect(chatScreenSrc).toMatch(
      /!isCampusNavigationStage\s*&&\s*!showThinkingStage\s*&&\s*!isLanguageGateOpen\s*&&\s*\(\s*<motion\.div className="chat-orb-stack-below-faq/,
    );
  });

  it('does not suppress auto-listen solely because campus navigation is open', () => {
    const autoListenBlock = chatScreenSrc.match(
      /const autoListen = useAutoListenLifecycle\(\{([\s\S]*?)\}\);/,
    )?.[1] ?? '';
    expect(autoListenBlock).toContain('suppressed:');
    expect(autoListenBlock).not.toContain('isCampusNavigationStage');
    // Empty-transcript path must still notify auto-listen (no campus early-return)
    const emptyHandler = chatScreenSrc.match(
      /const handleEmptyTranscript = useCallback\(\(\) => \{([\s\S]*?)\}, \[/,
    );
    expect(emptyHandler?.[1] ?? '').not.toContain('isCampusNavigationStage');
  });

  it('keeps campus map+orb mounted across turns without alternate surfaces', () => {
    expect(chatScreenSrc).toContain('stayOnCampusNavigation');
    expect(chatScreenSrc).toContain('Keep map + orb mounted across questions');
  });

  it('does not tear down campus on every non-navigation turn id change', () => {
    // Old bug: any ready turn with sticky !== turnId cleared campus and unmounted the orb.
    expect(chatScreenSrc).not.toMatch(
      /cardTrigger !== 'campus_navigation'\s*&&\s*campusNavStickyTurnIdRef\.current !== String\(turnId\)/,
    );
    expect(chatScreenSrc).toContain('leavesCampusForOtherSurface');
  });

  it('leaves campus only for alternate card/unit surfaces', () => {
    expect(chatScreenSrc).toContain('leavesCampusForOtherSurface');
    expect(chatScreenSrc).toContain('leavesCampusForUnitPlan');
    expect(chatScreenSrc).toMatch(
      /leavesCampusForOtherSurface \|\| leavesCampusForUnitPlan/,
    );
  });

  it('orb tap stops campus Read Directions speech via stopCampusSpeech', () => {
    const tap = chatScreenSrc.match(/const handleOrbTap = \(\) => \{([\s\S]*?)^  \};/m);
    expect(tap?.[1] ?? '').toContain('stopCampusSpeech()');
  });

  it('CSS centers the campus orb slot without absolute overlay hacks on the panel', () => {
    expect(cssSrc).toContain('.interaction-panel-30--campus-directions .campus-nav-orb-slot');
    expect(cssSrc).toMatch(
      /\.interaction-panel-30--campus-directions \.campus-nav-orb-slot\s*\{[^}]*align-items:\s*center/s,
    );
  });

  it('campus speaking drives shared speaking visual state (no fake local timers)', () => {
    const speaking = resolveOrbVisualState({
      isPlayingBackendAudio: false,
      isCampusSpeaking: true,
      audioPending: false,
      audioPendingTimedOut: false,
      isProcessing: false,
      speechListening: false,
      propIsListening: false,
      pendingListening: false,
      wasLocallySpeaking: false,
      currentOrbState: 'ready',
      hasGreeted: true,
      showUnmuteHint: false,
    });
    expect(speaking.next).toBe('speaking');
  });

  it('auto-listen arm remains available while campus is not treated as busy-only gate', () => {
    expect(
      shouldScheduleAutoListenArm({
        wasLocallySpeaking: true,
        isPlayingBackendAudio: false,
        isCampusSpeaking: false,
        isProcessing: false,
        audioPending: false,
        suppressed: false,
      }),
    ).toBe(true);
  });

  it('processing turn reset preserves campus layout while stage is active', () => {
    expect(chatScreenSrc).toContain(
      'resetTurnPresentationState({ resetLayout: !isCampusNavigationStage })',
    );
    // Must not hard-reset layout on every processing owner change.
    expect(chatScreenSrc).not.toMatch(
      /payload\.isProcessing === true[\s\S]{0,400}resetTurnPresentationState\(\{\s*resetLayout:\s*true\s*\}\)/,
    );
  });

  it('always clears isCampusSpeaking on turn audio teardown', () => {
    const reset = chatScreenSrc.match(
      /const resetTurnPresentationState = useCallback\(\s*\(opts: \{ resetLayout\?: boolean \} = \{\}\) => \{([\s\S]*?)^\s*\}, \[/m,
    )?.[1] ?? '';
    expect(reset).toContain('setIsCampusSpeaking(false)');
    expect(reset).toContain('setIsPlayingBackendAudio(false)');
  });

  it('openCampusNavigation disarms auto-listen before select-room prompt', () => {
    const open = chatScreenSrc.match(
      /const openCampusNavigation = useCallback\(\(\) => \{([\s\S]*?)^\s*\}, \[/m,
    )?.[1] ?? '';
    expect(open).toContain("autoListenApiRef.current?.disarm({ stopMic: true })");
    expect(open.indexOf('disarm')).toBeLessThan(open.indexOf('stopListening()'));
  });

  it('stopCampusSpeech only clears playback when campus TTS owns audio', () => {
    const stop = chatScreenSrc.match(
      /const stopCampusSpeech = useCallback\(\(\) => \{([\s\S]*?)^\s*\}, \[/m,
    )?.[1] ?? '';
    expect(stop).toContain("owner.startsWith('campus-')");
    expect(stop).toContain('isCampusSpeaking || isCampusTurn');
    // Must not unconditionally pause currentAudioRef without campus ownership check.
    expect(stop).toMatch(/if \(isCampusSpeaking \|\| isCampusTurn\)/);
  });

  it('off-campus effect clears speaking latch without calling stopCampusSpeech', () => {
    const promptIdx = chatScreenSrc.indexOf('promptCampusRoomSelection();');
    expect(promptIdx).toBeGreaterThan(0);
    const branch = chatScreenSrc.slice(Math.max(0, promptIdx - 500), promptIdx);
    expect(branch).toContain('setIsCampusSpeaking(false)');
    expect(branch).not.toContain('stopCampusSpeech()');
  });

  it('mounts campus orb on stage; directions card only after room selection', () => {
    expect(chatScreenSrc).toMatch(
      /isCampusNavigationStage && !isLanguageGateOpen \? \([\s\S]*?campus-nav-orb-slot/,
    );
    expect(chatScreenSrc).not.toMatch(
      /isCampusNavigationStage && selectedCampusDirection && !isLanguageGateOpen/,
    );
    expect(chatScreenSrc).toContain('{hasCampusRoomSelection ? (');
    expect(chatScreenSrc).toContain('campus-direction-card');
  });

  it('ChatOrbControl exposes speaking via data-orb-state and maps SiriOrb speaking→processing', () => {
    expect(orbControlSrc).toContain('data-orb-state={orbState}');
    expect(orbControlSrc).toContain("orbState === 'speaking'");
    expect(orbControlSrc).toContain("? 'processing'");
    // Must not override data-orb-state with isProcessing-only ternary.
    expect(orbControlSrc).not.toContain(
      "data-orb-state={isProcessing ? 'processing' : orbState}",
    );
  });
});
