import { test, expect, type Page } from '@playwright/test';

async function stubMediaOnly(page: Page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });
}

async function peekDiag(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as {
      claraDebug?: {
        peekClaraWsDiagnostics?: () => {
          socketReadyState?: number;
          pendingOutbound?: number;
        };
        retryConnect?: () => void;
      };
    };
    return w.claraDebug?.peekClaraWsDiagnostics?.() ?? null;
  });
}

async function expectOnboardedToPicker(page: Page) {
  await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('inline-language-english')).toBeVisible({ timeout: 60000 });
}

test.describe('M5.3 WS outbound lifecycle', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await stubMediaOnly(page);
  });

  test('A. cold-start wake during CONNECTING shows greeting picker', async ({ page }) => {
    await page.goto('http://localhost:5176/?e2e=1', { waitUntil: 'domcontentloaded' });
    const sleep = page.getByTestId('sleep-screen');
    await expect(sleep).toBeVisible({ timeout: 30000 });
    await sleep.click({ force: true });
    await expectOnboardedToPicker(page);
  });

  test('B. cold-start wake after OPEN shows greeting picker', async ({ page }) => {
    await page.goto('http://localhost:5176/?e2e=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('sleep-screen')).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => (await peekDiag(page))?.socketReadyState, { timeout: 20000 })
      .toBe(1);
    await page.getByTestId('sleep-screen').click({ force: true });
    await expectOnboardedToPicker(page);
  });

  test('C. reconnect while CONNECTING does not lose wake', async ({ page }) => {
    await page.goto('http://localhost:5176/?e2e=1', { waitUntil: 'domcontentloaded' });
    const sleep = page.getByTestId('sleep-screen');
    await expect(sleep).toBeVisible({ timeout: 30000 });
    await sleep.click({ force: true });
    await page.evaluate(() => {
      const w = window as unknown as {
        claraDebug?: {
          peekClaraWsDiagnostics?: () => { socketReadyState?: number };
          retryConnect?: () => void;
        };
      };
      const d = w.claraDebug?.peekClaraWsDiagnostics?.();
      if (d && d.socketReadyState !== 1) {
        w.claraDebug?.retryConnect?.();
      }
    });
    await expectOnboardedToPicker(page);
  });
});
