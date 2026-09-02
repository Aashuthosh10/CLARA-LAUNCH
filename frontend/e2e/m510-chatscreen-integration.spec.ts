import { test, expect, type Page } from '@playwright/test';

const WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const UNITS = ['cse_ds.hod', 'cse_ds.fees', 'events.techvidya'] as const;
const LANGUAGES = [
  { code: 'en', testId: 'english', name: 'English' },
  { code: 'kn', testId: 'kannada', name: 'Kannada' },
  { code: 'hi', testId: 'hindi', name: 'Hindi' },
  { code: 'ta', testId: 'tamil', name: 'Tamil' },
  { code: 'te', testId: 'telugu', name: 'Telugu' },
  { code: 'ml', testId: 'malayalam', name: 'Malayalam' },
] as const;

async function installDeterministicBackend(page: Page, language: { code: string; name: string }) {
  await page.addInitScript(({ wav, languageCode, languageName }) => {
    const unitList = ['cse_ds.hod', 'cse_ds.fees', 'events.techvidya'];
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    const planPayload = (language: string, turnId: string) => ({
      type: 'assistant_audio_update',
      turn_id: turnId,
      language_code_key: language,
      language_name: languageName,
      is_language_auto: false,
      isProcessing: false,
      isSpeaking: true,
      audioPending: false,
      audioUnavailable: false,
      showCard: 'department_overview',
      targetDepartment: 'CSE (Data Science)',
      departmentId: 'cse_ds',
      narration_plan: {
        turnId,
        mode: 'card_narration',
        segments: unitList.map((unitId, i) => ({
          segmentId: `${turnId}:seg:${i}`,
          displayText: `${unitId}\n${language} card ${unitId}`,
          ttsText: `${language} spoken ${unitId}`,
          cardIndex: i,
          cardId: 'unit_card',
          sectionId: `unit:${unitId}`,
          unitId,
          isFinalSegment: i === unitList.length - 1,
        })),
      },
      tts_streaming: false,
      tts_audio_queue: unitList.map(() => wav),
      audioBase64: wav,
      messages: [{ id: `clara-${turnId}`, role: 'clara', text: 'Kannada plan response' }],
    });
    const legacyPayload = (turnId: string, kind: string) => ({
      type: 'assistant_audio_update',
      turn_id: turnId,
      isProcessing: false,
      isSpeaking: true,
      audioBase64: wav,
      showCard: kind,
      cardTrigger: kind,
      cardsToSync: [{ title: 'legacy', content: 'legacy', type: 'legacy' }],
      messages: [{ id: `legacy-${turnId}-${kind}`, role: 'clara', text: 'legacy payload' }],
    });

    class DeterministicSocket extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      readyState = 0;
      onopen: ((e: Event) => void) | null = null;
      onmessage: ((e: MessageEvent) => void) | null = null;
      onclose: ((e: CloseEvent) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      userMessages = 0;
      constructor() {
        super();
        setTimeout(() => { this.readyState = 1; this.onopen?.(new Event('open')); }, 0);
      }
      send(raw: string) {
        const message = JSON.parse(raw);
        if (message.action === 'wake') this.emit(5, { turn_id: 'greeting', isProcessing: false, isSpeaking: false, messages: [{ id: 'greeting', role: 'clara', text: 'Welcome' }] });
        if (message.action === 'language_selected') this.emit(5, { turn_id: 'name', language_code_key: 'kn', isProcessing: false, isSpeaking: false, audioPending: false, messages: [{ id: 'name', role: 'clara', text: 'May I know your preferred name?' }] });
        if (message.action === 'user_message') {
          this.userMessages += 1;
          if (typeof message.text === 'string' && message.text.includes('CSE')) {
            const turn = 'm510-mounted';
            this.emit(5, { turn_id: turn, isProcessing: true, messages: [{ id: 'user-plan', role: 'user', text: message.text }] });
            setTimeout(() => {
              this.emit(5, planPayload(languageCode, turn));
              // Same-turn and previous-turn legacy payloads arrive after the
              // valid plan, exactly to test caller/effect precedence.
              setTimeout(() => this.emit(5, legacyPayload(turn, 'hod')), 250);
              setTimeout(() => this.emit(5, legacyPayload('old-turn', 'single')), 350);
              setTimeout(() => this.emit(5, legacyPayload(turn, 'cards')), 450);
            }, 30);
            return;
          }
          if (this.userMessages === 1) {
            this.emit(5, { turn_id: 'ready', isProcessing: false, isSpeaking: false, audioPending: false, messages: [{ id: 'ready', role: 'clara', text: 'What would you like to know?' }] });
          } else {
            const turn = 'm510-mounted';
            this.emit(5, { turn_id: turn, isProcessing: true, messages: [{ role: 'user', text: message.text }] });
            setTimeout(() => {
              this.emit(5, planPayload('kn', turn));
            }, 30);
          }
        }
      }
      close() { this.readyState = 3; this.onclose?.(new CloseEvent('close')); }
      emit(state: number, payload: unknown) { setTimeout(() => this.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ state, payload }) })), 0); }
    }
    (window as unknown as { WebSocket: typeof WebSocket }).WebSocket = DeterministicSocket as unknown as typeof WebSocket;
  }, { wav: WAV, languageCode: language.code, languageName: language.name });
}

async function ready(page: Page, languageTestId: string) {
  await page.goto('/?e2e=1');
  await page.getByTestId('sleep-screen').click({ force: true });
  await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
  await page.getByTestId(`inline-language-${languageTestId}`).click({ force: true });
  await page.waitForTimeout(500);
  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
  await page.waitForTimeout(500);
}

async function debug(page: Page) {
  await page.waitForFunction(() => typeof window.__CLARA_M52_DEBUG === 'function');
  return page.evaluate(() => window.__CLARA_M52_DEBUG!());
}

test.describe('M5.10 mounted ChatScreen integration forensic', () => {
  test.setTimeout(60000);

  for (const language of LANGUAGES) {
    test(`${language.name} valid N-unit plan outranks same-turn and stale legacy payloads`, async ({ page }) => {
    await installDeterministicBackend(page, language);
    await ready(page, language.testId);
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('CSE HOD ಮತ್ತು CSE fees ಮತ್ತು TechVidya'));

    await expect.poll(async () => (await debug(page)).unitIds, { timeout: 20000 }).toEqual([...UNITS]);
    await expect.poll(async () => (await debug(page)).engineUnitId, { timeout: 20000 }).toBe(UNITS[0]);
    await expect(page.locator('[data-current-unit-id]')).toHaveAttribute('data-current-unit-id', UNITS[0], { timeout: 20000 });

    const snapshots: Array<Record<string, unknown>> = [await debug(page)];
    for (const expected of UNITS.slice(1)) {
      await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
      await expect.poll(async () => (await debug(page)).engineUnitId, { timeout: 20000 }).toBe(expected);
      await expect(page.locator('[data-current-unit-id]')).toHaveAttribute('data-current-unit-id', expected, { timeout: 20000 });
      snapshots.push(await debug(page));
    }

    expect(snapshots.map((s) => s.engineUnitId)).toEqual([...UNITS]);
    expect(snapshots.map((s) => s.cardIndex)).toEqual([0, 1, 2]);
    expect(snapshots.map((s) => s.visibleUnitId)).toEqual([...UNITS]);
    expect(snapshots.every((s) => s.unitIds?.join('|') === UNITS.join('|'))).toBe(true);
    });
  }
});
