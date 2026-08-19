import { test, expect, type Page } from '@playwright/test';

/**
 * M5.4 live browser acceptance.
 *
 * The frontend is a consumer: it renders exactly the units the backend selected, each
 * against its own department, and renders no card at all when the backend selected none.
 */

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

const NAME_PROMPT = /May I know your preferred name|ಆತ್ಮೀಯ/;
const READY_PROMPT = /Wonderful to meet you|What would you like|ಸಂತೋಷ/;

async function reachReadyChat(page: Page, language: 'english' | 'kannada' = 'english') {
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

test.describe('M5.4 authority — the frontend only renders what was selected', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await stubMediaOnly(page);
  });

  test('mixed families render one card per unit, each from its own department', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Data Science overview, AIML HOD and CSE fees');

    await expect
      .poll(async () => (await m52(page)).unitIds, { timeout: 90000 })
      .toEqual(['cse_ds.overview', 'cse_aiml.hod', 'cse.fees']);

    const debug = await m52(page);
    expect(debug.slideCount).toBe(3);

    const contents = debug.unitCardContents ?? [];
    expect(contents.map((c) => c.unitId)).toEqual([
      'cse_ds.overview',
      'cse_aiml.hod',
      'cse.fees',
    ]);
    // Each body must be distinct; a single-department factory would repeat one deck.
    const bodies = contents.map((c) => c.content);
    expect(new Set(bodies).size).toBe(3);
  });

  test('an unbindable multi-department request renders no card', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'tell me about CSE and AIML');

    await page.waitForTimeout(20000);
    const debug = await m52(page);
    expect(debug.isDepartmentOverviewStage).toBe(false);
    expect(debug.isHodStage).toBe(false);
    expect(debug.isFeesStage).toBe(false);
    expect(debug.unitIds ?? []).toEqual([]);
  });

  test('a bare topic with no department clarifies instead of carding', async ({ page }) => {
    await reachReadyChat(page);
    await ask(page, 'Who is the HOD?');

    await page.waitForTimeout(20000);
    const debug = await m52(page);
    expect(debug.isHodStage).toBe(false);
    expect(debug.unitIds ?? []).toEqual([]);
  });
});
