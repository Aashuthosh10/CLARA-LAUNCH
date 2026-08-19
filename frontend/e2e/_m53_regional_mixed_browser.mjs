/**
 * Read-only browser probe for the exact mixed query.
 * Run from frontend/: node e2e/_m53_regional_mixed_browser.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL = 'http://localhost:5176/?e2e=1';
const Q = 'datascience mathe aiml du hod yaaru ?';
const OUT = join('..', 'docs', '_m53_regional_mixed_browser_out.json');
const NAME_PROMPT = /May I know your preferred name|ಆತ್ಮೀಯ|आपका नाम/;
const READY_PROMPT = /Wonderful to meet you|What would you like|ಸಂತೋಷ|मिलकर अच्छा/;

function now() {
  return Date.now();
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const t0 = now();
  const wsHits = [];

  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });

  page.on('websocket', (ws) => {
    const rec = { url: ws.url(), created_ms: now() - t0, plans: [] };
    wsHits.push(rec);
    ws.on('framereceived', (frame) => {
      const payload = String(frame.payload || '');
      if (!payload.includes('narration_plan') && !payload.includes('showCard')) return;
      let unitIds = [];
      let showCard = null;
      let intent = null;
      let departmentId = null;
      try {
        const msg = JSON.parse(payload);
        const p = msg.payload && typeof msg.payload === 'object' ? msg.payload : msg;
        showCard = p.showCard ?? null;
        intent = p.intent ?? null;
        departmentId = p.departmentId ?? null;
        const segs = p.narration_plan?.segments;
        if (Array.isArray(segs)) {
          unitIds = segs
            .map((s) => (typeof s?.unitId === 'string' ? s.unitId : null))
            .filter(Boolean);
        }
      } catch {
        /* ignore */
      }
      if (unitIds.length || showCard) {
        rec.plans.push({
          t_ms: now() - t0,
          showCard,
          intent,
          departmentId,
          unitIds,
        });
      }
    });
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  const sleep = page.getByTestId('sleep-screen');
  await sleep.waitFor({ state: 'visible', timeout: 30000 });
  await sleep.click({ force: true });
  try {
    await sleep.waitFor({ state: 'hidden', timeout: 8000 });
  } catch {
    await sleep.focus();
    await page.keyboard.press('Enter');
  }
  await page.getByTestId('chat-screen').waitFor({ state: 'visible', timeout: 30000 });
  const kn = page.getByTestId('inline-language-kannada');
  await kn.waitFor({ state: 'visible', timeout: 60000 });
  await kn.click({ force: true });
  await page.locator('body').waitFor({ timeout: 60000 });
  const nameDeadline = now() + 60000;
  let nameVisible = false;
  while (now() < nameDeadline) {
    const text = await page.locator('body').innerText();
    if (NAME_PROMPT.test(text)) {
      nameVisible = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function', null, {
    timeout: 60000,
  });
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Guest'));
  const readyDeadline = now() + 60000;
  let ready = false;
  while (now() < readyDeadline) {
    const text = await page.locator('body').innerText();
    if (READY_PROMPT.test(text)) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  await page.evaluate((q) => window.__CLARA_TEST_SEND_MESSAGE?.(q), Q);

  const hodDeadline = now() + 90000;
  let dbg = null;
  let hod = null;
  let overview = null;
  while (now() < hodDeadline) {
    dbg =
      (await page.evaluate(() =>
        typeof window.__CLARA_M52_DEBUG === 'function' ? window.__CLARA_M52_DEBUG() : null,
      )) || null;
    hod = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="hod-card"]');
      return el
        ? {
            visible: true,
            unitId: el.getAttribute('data-unit-id'),
            count: el.getAttribute('data-hod-count'),
          }
        : { visible: false, unitId: null, count: null };
    });
    overview = await page.evaluate(() => ({
      isDepartmentOverviewStage: Boolean(
        document.querySelector('[data-testid="department-card-stage"], [data-testid="dept-overview"]'),
      ),
      bodySnippet: (document.body?.innerText || '').slice(0, 500),
    }));
    if ((dbg?.unitIds && dbg.unitIds.length) || hod.visible || dbg?.isHodStage || dbg?.isDepartmentOverviewStage) {
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  const out = {
    href: page.url(),
    nameVisible,
    ready,
    wsUrls: wsHits.map((w) => w.url),
    wsPlans: wsHits.flatMap((w) => w.plans),
    debug: dbg,
    hod,
    overview,
    elapsed_ms: now() - t0,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
  await context.close();
  await browser.close();
}

await run();
