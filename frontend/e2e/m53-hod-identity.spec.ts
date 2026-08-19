import { test, expect, type Page } from '@playwright/test';

async function stubMediaOnly(page: Page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });
}

async function wakeFromSleep(page: Page) {
  const sleepScreen = page.getByTestId('sleep-screen');
  await expect(sleepScreen).toBeVisible({ timeout: 30000 });
  await sleepScreen.click({ force: true });
  try {
    await expect(sleepScreen).toBeHidden({ timeout: 8000 });
  } catch {
    await sleepScreen.focus();
    await page.keyboard.press('Enter');
    await expect(sleepScreen).toBeHidden({ timeout: 8000 });
  }
}

type InlineLang = 'english' | 'kannada' | 'hindi' | 'tamil' | 'telugu' | 'malayalam';

const NAME_PROMPT =
  /May I know your preferred name|ಆತ್ಮೀಯ|आपका नाम|உங்கள் பெயரை|మీ పేరు|നിങ്ങളുടെ/;

const READY_PROMPT =
  /Wonderful to meet you|What would you like|ಸಂತೋಷ|मिलकर अच्छा|மகிழ்ச்சி|కలవడం ఆనందం|കാണാൻ സന്തോഷം/;

async function reachReadyChat(page: Page, language: InlineLang) {
  await page.goto('http://localhost:5176/?e2e=1', { waitUntil: 'domcontentloaded' });
  await wakeFromSleep(page);
  await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 30000 });
  const button = page.getByTestId(`inline-language-${language}`);
  await expect(button).toBeVisible({ timeout: 60000 });
  await button.click({ force: true });
  await expect(page.locator('body')).toContainText(NAME_PROMPT, { timeout: 60000 });
  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
  await expect(page.locator('body')).toContainText(READY_PROMPT, { timeout: 60000 });
}

async function ask(page: Page, text: string) {
  await page.evaluate((q) => window.__CLARA_TEST_SEND_MESSAGE?.(q), text);
}

async function m52(page: Page) {
  await page.waitForFunction(() => typeof window.__CLARA_M52_DEBUG === 'function');
  return page.evaluate(() => window.__CLARA_M52_DEBUG!());
}

async function waitForHod(page: Page, unitIds: string[]) {
  await expect(page.getByTestId('hod-card')).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId('hod-card')).toHaveAttribute(
    'data-hod-count',
    String(unitIds.length),
    { timeout: 90000 },
  );
  await expect.poll(async () => (await m52(page)).unitIds, { timeout: 90000 }).toEqual(unitIds);
}

async function waitForClipSlots(page: Page, n: number) {
  await expect
    .poll(async () => {
      const d = await m52(page);
      const ids = d.queueUnitIds ?? [];
      return d.queueLength === n || ids.length === n;
    }, { timeout: 90000 })
    .toBe(true);
}

async function assertClip(page: Page, unitId: string) {
  await expect(page.getByTestId('hod-card')).toHaveAttribute('data-unit-id', unitId, {
    timeout: 30000,
  });
  await expect.poll(async () => (await m52(page)).playbackUnitId, { timeout: 30000 }).toBe(unitId);
}

async function endClipWhenQueued(page: Page, nextUnitId: string, minQueue: number) {
  await expect
    .poll(async () => (await m52(page)).queueLength, { timeout: 90000 })
    .toBeGreaterThanOrEqual(minQueue);
  await expect.poll(async () => (await m52(page)).hasCurrentAudio, { timeout: 30000 }).toBe(true);
  await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
  await assertClip(page, nextUnitId);
}

test.describe('M5.3 HOD identity live browser', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await stubMediaOnly(page);
  });

  test('English single HOD is cse_ds.hod', async ({ page }) => {
    await reachReadyChat(page, 'english');
    await ask(page, 'Who is the HOD of CSE Data Science?');
    await waitForHod(page, ['cse_ds.hod']);
    await assertClip(page, 'cse_ds.hod');
    const dbg = await m52(page);
    expect(dbg.unitCardContents?.[0]?.content || '').toMatch(/Nagashree/i);
    expect(dbg.unitCardContents?.[0]?.content || '').not.toMatch(/Shashikumar/i);
  });

  test('English two HOD then sequential clips', async ({ page }) => {
    await reachReadyChat(page, 'english');
    await ask(page, 'Who is the HOD of AIML and Data Science?');
    await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod']);
    await waitForClipSlots(page, 2);
    await assertClip(page, 'cse_aiml.hod');
    await endClipWhenQueued(page, 'cse_ds.hod', 2);
    await expect
      .poll(async () => (await m52(page)).queueLength, { timeout: 90000 })
      .toBeGreaterThanOrEqual(2);
    await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
    await expect.poll(async () => (await m52(page)).engineState, { timeout: 30000 }).toBe(
      'PRESENTATION_COMPLETE',
    );
  });

  test('English three HOD preserves order and completes after last', async ({ page }) => {
    await reachReadyChat(page, 'english');
    await ask(page, 'Who are the HODs of AIML, Data Science and CSE?');
    await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod', 'cse.hod']);
    await waitForClipSlots(page, 3);
    await assertClip(page, 'cse_aiml.hod');
    await endClipWhenQueued(page, 'cse_ds.hod', 2);
    await endClipWhenQueued(page, 'cse.hod', 3);
    await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
    await expect.poll(async () => (await m52(page)).engineState, { timeout: 30000 }).toBe(
      'PRESENTATION_COMPLETE',
    );
  });

  test('Kannada single HOD keeps localized card body', async ({ page }) => {
    await reachReadyChat(page, 'kannada');
    await ask(page, 'CSE Data Science HOD yaaru?');
    await waitForHod(page, ['cse_ds.hod']);
    await assertClip(page, 'cse_ds.hod');
    const body = (await m52(page)).unitCardContents?.[0]?.content || '';
    expect(body).toMatch(/[\u0C80-\u0CFF]/);
    expect(body).not.toMatch(/extensive teaching and research/i);
    const cardText = await page.getByTestId('hod-card').innerText();
    expect(cardText).toMatch(/[\u0C80-\u0CFF]/);
    expect(cardText).not.toMatch(/Shashikumar/i);
  });

  test('Kannada two HOD sequential clips', async ({ page }) => {
    await reachReadyChat(page, 'kannada');
    await ask(page, 'AIML mattu Data Science HOD yaaru?');
    await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod']);
    await waitForClipSlots(page, 2);
    await assertClip(page, 'cse_aiml.hod');
    await endClipWhenQueued(page, 'cse_ds.hod', 2);
  });

  test('Kannada three HOD sequential clips', async ({ page }) => {
    await reachReadyChat(page, 'kannada');
    await ask(page, 'AIML, Data Science mattu CSE HOD yaaru?');
    await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod', 'cse.hod']);
    await waitForClipSlots(page, 3);
    await assertClip(page, 'cse_aiml.hod');
    await endClipWhenQueued(page, 'cse_ds.hod', 2);
    await endClipWhenQueued(page, 'cse.hod', 3);
  });

  test('new turn resets from three HOD to single HOD', async ({ page }) => {
    await reachReadyChat(page, 'english');
    await ask(page, 'Who are the HODs of AIML, Data Science and CSE?');
    await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod', 'cse.hod']);
    await waitForClipSlots(page, 3);
    await ask(page, 'Who is the HOD of CSE Data Science?');
    await waitForHod(page, ['cse_ds.hod']);
    await waitForClipSlots(page, 1);
    await assertClip(page, 'cse_ds.hod');
  });

  test('new turn expands from single HOD to three HOD', async ({ page }) => {
    await reachReadyChat(page, 'english');
    await ask(page, 'Who is the HOD of CSE Data Science?');
    await waitForHod(page, ['cse_ds.hod']);
    await waitForClipSlots(page, 1);
    await ask(page, 'Who are the HODs of AIML, Data Science and CSE?');
    await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod', 'cse.hod']);
    await waitForClipSlots(page, 3);
    await assertClip(page, 'cse_aiml.hod');
  });

  const regional: Array<{
    lang: InlineLang;
    script: RegExp;
    q1: string;
    q2: string;
    q3: string;
  }> = [
    {
      lang: 'hindi',
      script: /[\u0900-\u097F]/,
      q1: 'CSE Data Science ka HOD kaun hai?',
      q2: 'AIML aur Data Science ke HOD kaun hain?',
      q3: 'AIML, Data Science aur CSE ke HOD kaun hain?',
    },
    {
      lang: 'tamil',
      script: /[\u0B80-\u0BFF]/,
      q1: 'CSE Data Science HOD yaar?',
      q2: 'AIML and Data Science HOD yaar?',
      q3: 'AIML, Data Science and CSE HOD yaar?',
    },
    {
      lang: 'telugu',
      script: /[\u0C00-\u0C7F]/,
      q1: 'CSE Data Science HOD evaru?',
      q2: 'AIML and Data Science HOD evaru?',
      q3: 'AIML, Data Science and CSE HOD evaru?',
    },
    {
      lang: 'malayalam',
      script: /[\u0D00-\u0D7F]/,
      q1: 'CSE Data Science HOD aaranu?',
      q2: 'AIML and Data Science HOD aaranu?',
      q3: 'AIML, Data Science and CSE HOD aaranu?',
    },
  ];

  for (const row of regional) {
    test(`${row.lang} single HOD keeps localized card body`, async ({ page }) => {
      await reachReadyChat(page, row.lang);
      await ask(page, row.q1);
      await waitForHod(page, ['cse_ds.hod']);
      await waitForClipSlots(page, 1);
      await assertClip(page, 'cse_ds.hod');
      const body = (await m52(page)).unitCardContents?.[0]?.content || '';
      expect(body).toMatch(row.script);
      const cardText = await page.getByTestId('hod-card').innerText();
      expect(cardText).toMatch(row.script);
    });

    test(`${row.lang} two HOD sequential clips`, async ({ page }) => {
      await reachReadyChat(page, row.lang);
      await ask(page, row.q2);
      await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod']);
      await waitForClipSlots(page, 2);
      await assertClip(page, 'cse_aiml.hod');
      await endClipWhenQueued(page, 'cse_ds.hod', 2);
    });

    test(`${row.lang} three HOD sequential clips`, async ({ page }) => {
      await reachReadyChat(page, row.lang);
      await ask(page, row.q3);
      await waitForHod(page, ['cse_aiml.hod', 'cse_ds.hod', 'cse.hod']);
      await waitForClipSlots(page, 3);
      await assertClip(page, 'cse_aiml.hod');
      await endClipWhenQueued(page, 'cse_ds.hod', 2);
      await endClipWhenQueued(page, 'cse.hod', 3);
    });
  }
});
