import { test, expect, type Page } from '@playwright/test';

async function installM52Socket(page: Page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };

    const greetingPayload = {
      turn_id: 'greeting_opening',
      isProcessing: false,
      isSpeaking: false,
      messages: [{ id: 'greeting', role: 'clara', text: 'Good evening. I am CLARA. How can I help you today?' }],
    };
    const namePayload = {
      turn_id: 'name_after_language_pick',
      isProcessing: false,
      isSpeaking: false,
      messages: [{ id: 'name_prompt', role: 'clara', text: 'May I know your preferred name?' }],
    };

    const CSE_UNITS = [
      { unitId: 'cse.overview', sectionId: 'intro', title: 'Overview', body: 'CSE overview body' },
      { unitId: 'cse.hod', sectionId: 'hod_voice', title: 'HOD & Vision', body: 'CSE hod body' },
      { unitId: 'cse.achievements', sectionId: 'achievements', title: 'Achievements', body: 'CSE achievements body' },
      { unitId: 'cse.placements', sectionId: 'placement', title: 'Placements', body: 'CSE placements body' },
      { unitId: 'cse.fees', sectionId: 'fees', title: 'Fees', body: 'CSE fees body' },
    ];
    const TINY_WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

    function planPayload(args: {
      turnId: string;
      userText: string;
      units: typeof CSE_UNITS;
      showCard?: string;
      targetDepartment?: string;
      departmentId?: string;
    }) {
      const segments = args.units.map((u, i) => ({
        segmentId: `${args.turnId}:seg:${i}`,
        displayText: `${u.title}\n${u.body}`,
        ttsText: u.body,
        cardIndex: i,
        cardId: 'dept_slide',
        sectionId: u.sectionId,
        unitId: u.unitId,
        isFinalSegment: i === args.units.length - 1,
      }));
      return {
        type: 'assistant_audio_update',
        turn_id: args.turnId,
        isProcessing: false,
        isSpeaking: true,
        audioPending: false,
        audioUnavailable: false,
        showCard: args.showCard ?? 'department_overview',
        targetDepartment: args.targetDepartment ?? 'CSE',
        departmentId: args.departmentId ?? 'cse',
        narration_plan: {
          turnId: args.turnId,
          mode: 'card_narration',
          segments,
        },
        tts_streaming: false,
        tts_chunk_index: args.units.length - 1,
        tts_audio_queue: args.units.map(() => TINY_WAV),
        audioBase64: TINY_WAV,
        messages: [
          { id: `user-${args.turnId}`, role: 'user', text: args.userText },
          { id: `clara-${args.turnId}`, role: 'clara', text: args.units.map((u) => u.body).join(' ') },
        ],
      };
    }

    function payloadForText(text: string, turnSerial: number) {
      const t = text.toLowerCase();
      const turnId = `m52-${turnSerial}`;
      if (t.includes('aiml') && t.includes('data science') && t.includes('hod')) {
        return planPayload({
          turnId,
          userText: text,
          units: [
            { unitId: 'cse_aiml.hod', sectionId: 'hod_voice', title: 'AIML HOD', body: 'AIML hod body' },
            { unitId: 'cse_ds.hod', sectionId: 'hod_voice', title: 'DS HOD', body: 'DS hod body' },
          ],
          targetDepartment: 'CSE (AI & ML)',
          departmentId: 'cse_aiml',
        });
      }
      if (t.includes('fees')) {
        return planPayload({
          turnId,
          userText: text,
          units: [{ unitId: 'cse.fees', sectionId: 'fees', title: 'Fees', body: 'CSE fees body' }],
        });
      }
      if (t.includes('hod')) {
        return planPayload({
          turnId,
          userText: text,
          units: [{ unitId: 'cse.hod', sectionId: 'hod_voice', title: 'HOD & Vision', body: 'CSE hod body' }],
        });
      }
      if (t.includes('placement')) {
        return planPayload({
          turnId,
          userText: text,
          units: [{ unitId: 'cse.placements', sectionId: 'placement', title: 'Placements', body: 'CSE placements body' }],
        });
      }
      return planPayload({
        turnId,
        userText: text,
        units: CSE_UNITS,
      });
    }

    class MockClaraWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      static postLangUserMsgCount = 0;
      CONNECTING = 0;
      OPEN = 1;
      CLOSING = 2;
      CLOSED = 3;
      readyState = MockClaraWebSocket.CONNECTING;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(_url: string) {
        super();
        window.setTimeout(() => {
          this.readyState = MockClaraWebSocket.OPEN;
          this.onopen?.(new Event('open'));
        }, 0);
      }

      send(raw: string) {
        const msg = JSON.parse(raw);
        if (msg.action === 'wake') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          this.emit(5, greetingPayload);
        }
        if (msg.action === 'language_selected') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          this.emit(5, namePayload);
        }
        if (msg.action === 'user_message') {
          MockClaraWebSocket.postLangUserMsgCount += 1;
          const n = MockClaraWebSocket.postLangUserMsgCount;
          const ut = typeof msg.text === 'string' ? msg.text : '';
          if (n === 1) {
            this.emit(5, {
              turn_id: 'ready_after_language_pick',
              isProcessing: false,
              isSpeaking: false,
              messages: [
                { id: 'user-mock', role: 'user', text: ut },
                { id: 'ready_prompt', role: 'clara', text: 'Wonderful. What would you like to know?' },
              ],
            });
            return;
          }
          this.emit(5, {
            turn_id: `m52-${n}`,
            isProcessing: true,
            isSpeaking: false,
            messages: [{ id: `user-m52-${n}`, role: 'user', text: ut }],
          });
          window.setTimeout(() => this.emit(5, payloadForText(ut, n)), 40);
        }
        if (msg.action === 'reset_session' || msg.type === 'RESET_SESSION') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          this.emit(0, null);
        }
      }

      close() {
        this.readyState = MockClaraWebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close'));
      }

      private emit(state: number, payload: unknown) {
        window.setTimeout(() => {
          this.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({ state, payload }),
            }),
          );
        }, 0);
      }
    }

    window.WebSocket = MockClaraWebSocket as unknown as typeof WebSocket;
  });
}

async function wakeFromSleep(page: Page) {
  const sleepScreen = page.getByTestId('sleep-screen');
  await expect(sleepScreen).toBeVisible();
  await sleepScreen.focus();
  await page.keyboard.press('Enter');
}

async function reachReadyChat(page: Page) {
  await page.goto('http://localhost:5176/?e2e=1');
  await wakeFromSleep(page);
  await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
  const button = page.getByTestId('inline-language-english');
  await expect(button).toBeVisible({ timeout: 15000 });
  await button.click({ force: true });
  await expect(page.getByText(/May I know your preferred name\?/i)).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
  await expect(page.getByText(/Wonderful|What would you like/i)).toBeVisible({ timeout: 15000 });
}

async function ask(page: Page, text: string) {
  await page.evaluate((q) => window.__CLARA_TEST_SEND_MESSAGE?.(q), text);
}

async function m52(page: Page) {
  await page.waitForFunction(() => typeof window.__CLARA_M52_DEBUG === 'function');
  return page.evaluate(() => window.__CLARA_M52_DEBUG!());
}

test.describe('M5.2 card/TTS cutover', () => {
  test.setTimeout(45000);

  test.beforeEach(async ({ page }) => {
    await installM52Socket(page);
  });

  test('full department shows five unit-backed cards in plan order', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Tell me about CSE Data Science');
    await expect(page.getByTestId('department-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('department-card')).toHaveAttribute('data-total-slides', '5');
    await expect.poll(async () => (await m52(page)).unitIds).toEqual([
      'cse.overview',
      'cse.hod',
      'cse.achievements',
      'cse.placements',
      'cse.fees',
    ]);
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse.overview');
    await expect.poll(async () => (await m52(page)).cardIndex).toBe(0);
  });

  test('targeted fees is a single fees card with no siblings', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'CSE fees');
    await expect(page.getByTestId('department-fees-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('department-card')).toHaveCount(0);
    const dbg = await m52(page);
    expect(dbg.unitIds).toEqual(['cse.fees']);
    expect(dbg.isFeesStage).toBe(true);
    expect(dbg.feesDepartmentId).toBe('cse');
  });

  test('targeted HOD is a single HOD card', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'CSE HOD');
    await expect(page.getByTestId('hod-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('hod-card')).toHaveAttribute('data-hod-count', '1');
    await expect(page.getByTestId('hod-card')).toHaveAttribute('data-hod-dept', 'cse');
    expect((await m52(page)).unitIds).toEqual(['cse.hod']);
  });

  test('targeted placements stays one top-level presentation', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'CSE placements');
    await expect(page.getByTestId('department-card-stage')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Placements & training/i)).toBeVisible();
    await expect(page.getByTestId('department-card')).toHaveCount(0);
    const dbg = await m52(page);
    expect(dbg.unitIds).toEqual(['cse.placements']);
    expect(dbg.isInfoSlideStage).toBe(true);
  });

  test('multi-HOD renders AIML then Data Science without collapsing sectionId', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Who is the HOD of AIML and Data Science?');
    await expect(page.getByTestId('hod-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('hod-card')).toHaveAttribute('data-hod-count', '2');
    await expect.poll(async () => (await m52(page)).unitIds).toEqual(['cse_aiml.hod', 'cse_ds.hod']);
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse_aiml.hod');
    await expect.poll(async () => (await m52(page)).queueLength, { timeout: 15000 }).toBe(2);
    await expect.poll(async () => (await m52(page)).hasCurrentAudio, { timeout: 15000 }).toBe(true);
    await expect(page.getByTestId('hod-card')).toHaveAttribute('data-hod-dept', 'cse_aiml');

    await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
    await expect.poll(async () => (await m52(page)).engineUnitId, { timeout: 15000 }).toBe('cse_ds.hod');
    await expect(page.getByTestId('hod-card')).toHaveAttribute('data-hod-dept', 'cse_ds');

    await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
    await expect.poll(async () => (await m52(page)).engineState).toBe('PRESENTATION_COMPLETE');
  });

  test('right arrow seeks to next unitId without wiping the TTS queue', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Tell me about CSE');
    await expect(page.getByTestId('department-card')).toBeVisible({ timeout: 20000 });
    await expect.poll(async () => (await m52(page)).queueLength, { timeout: 15000 }).toBe(5);
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse.overview');

    const genBefore = (await m52(page)).playbackGen;
    await page.getByTestId('card-next').click();
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse.hod');
    await expect.poll(async () => (await m52(page)).cardIndex).toBe(1);
    const after = await m52(page);
    expect(after.queueLength).toBe(5);
    expect(after.queueUnitIds).toEqual([
      'cse.overview',
      'cse.hod',
      'cse.achievements',
      'cse.placements',
      'cse.fees',
    ]);
    expect(after.playbackUnitId).toBe('cse.hod');
    expect(after.playbackGen).toBeGreaterThan(genBefore);

    await page.getByTestId('card-next').click();
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse.achievements');
    expect((await m52(page)).queueLength).toBe(5);
  });

  test('left arrow seeks back to the previous unitId', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Tell me about CSE');
    await expect(page.getByTestId('department-card')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('card-next').click();
    await page.getByTestId('card-next').click();
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse.achievements');

    await page.getByTestId('card-prev').click();
    await expect.poll(async () => (await m52(page)).engineUnitId).toBe('cse.hod');
    await expect.poll(async () => (await m52(page)).cardIndex).toBe(1);
    const dbg = await m52(page);
    expect(dbg.playbackUnitId).toBe('cse.hod');
    expect(dbg.queueLength).toBe(5);
  });

  test('new turn cancels the previous presentation', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Tell me about CSE');
    await expect(page.getByTestId('department-card')).toBeVisible({ timeout: 20000 });
    await expect.poll(async () => (await m52(page)).unitIds?.length).toBe(5);

    await ask(page, 'CSE fees');
    await expect(page.getByTestId('department-fees-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('department-card')).toHaveCount(0);
    const dbg = await m52(page);
    expect(dbg.unitIds).toEqual(['cse.fees']);
    expect(dbg.isFeesStage).toBe(true);
    expect(dbg.engineUnitId === 'cse.fees' || dbg.engineUnitId === null || dbg.unitIds?.[0] === 'cse.fees').toBe(true);
  });
});
