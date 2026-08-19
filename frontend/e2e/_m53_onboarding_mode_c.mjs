/**
 * Mode C: wait for Clara WS :6969 OPEN, then wake.
 * Forensic only. Not an official spec.
 */
import { chromium } from '@playwright/test';

const URL = 'http://localhost:5176/?e2e=1';
const now = () => Date.now();

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const t0 = now();
const events = [];
const log = (label, extra = {}) => {
  const row = { t_ms: now() - t0, label, ...extra };
  events.push(row);
  console.log(JSON.stringify(row));
};

await page.addInitScript(() => {
  HTMLMediaElement.prototype.play = function () {
    return Promise.resolve();
  };
});

page.on('websocket', (ws) => {
  log('ws_created', { wsUrl: ws.url() });
  ws.on('close', () => log('ws_close', { wsUrl: ws.url() }));
  ws.on('framesent', (frame) => log('ws_tx', { snippet: String(frame.payload).slice(0, 220) }));
  ws.on('framereceived', (frame) => {
    const payload = String(frame.payload || '');
    log('ws_rx', {
      snippet: payload.slice(0, 220),
      hasGreeting: /greeting_opening|Good evening|Good afternoon|Good morning|I am CLARA/i.test(
        payload,
      ),
      hasPlan: /narration_plan/.test(payload),
    });
  });
});

log('goto_start');
await page.goto(URL, { waitUntil: 'domcontentloaded' });
log('goto_done');

const readyDeadline = now() + 20000;
let diag = null;
while (now() < readyDeadline) {
  diag = await page.evaluate(() => window.claraDebug?.peekClaraWsDiagnostics?.() ?? null);
  if (diag && diag.socketReadyState === 1) {
    log('clara_ws_open', diag);
    break;
  }
  log('clara_ws_poll', diag || { missing: true });
  await new Promise((r) => setTimeout(r, 150));
}
if (!diag || diag.socketReadyState !== 1) {
  log('clara_ws_never_open', diag || {});
  await browser.close();
  process.exit(2);
}

const sleep = page.getByTestId('sleep-screen');
const sleepVisible = await sleep.isVisible();
log('sleep_visible_check', { sleepVisible });
await sleep.click({ force: true });
log('sleep_clicked');

const chatDeadline = now() + 15000;
let chatVisible = false;
while (now() < chatDeadline) {
  chatVisible = await page.getByTestId('chat-screen').isVisible().catch(() => false);
  if (chatVisible) break;
  await new Promise((r) => setTimeout(r, 100));
}
log('chat_visible_check', {
  chatVisible,
  wake_tx: events.some((e) => /"wake"/.test(e.snippet || '')),
  conversation_started_tx: events.some((e) => /conversation_started/.test(e.snippet || '')),
});

const pickerDeadline = now() + 45000;
let pickerVisible = false;
while (now() < pickerDeadline) {
  pickerVisible = await page.getByTestId('inline-language-english').isVisible().catch(() => false);
  if (pickerVisible) break;
  await new Promise((r) => setTimeout(r, 200));
}
log('picker_check', {
  pickerVisible,
  greeting_rx: events.some((e) => e.hasGreeting),
  wake_tx: events.some((e) => /"wake"/.test(e.snippet || '')),
  conversation_started_tx: events.some((e) => /conversation_started/.test(e.snippet || '')),
});

if (!pickerVisible) {
  const body = await page.locator('body').innerText();
  log('fail_language_picker', { body_prefix: body.slice(0, 400) });
  await browser.close();
  process.exit(3);
}

await page.getByTestId('inline-language-english').click({ force: true });
log('english_clicked');
const nameDeadline = now() + 30000;
let nameVisible = false;
while (now() < nameDeadline) {
  const text = await page.locator('body').innerText();
  if (/May I know your preferred name/i.test(text)) {
    nameVisible = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 200));
}
log('name_prompt_check', { nameVisible });
if (!nameVisible) {
  await browser.close();
  process.exit(4);
}

await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
const readyDeadline2 = now() + 45000;
let ready = false;
while (now() < readyDeadline2) {
  const text = await page.locator('body').innerText();
  if (/Wonderful|What would you like/i.test(text)) {
    ready = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 200));
}
log('ready_chat_check', { ready });
if (!ready) {
  await browser.close();
  process.exit(5);
}

await page.evaluate(() =>
  window.__CLARA_TEST_SEND_MESSAGE?.('Who are the HODs of AIML, Data Science and CSE?'),
);
const hodDeadline = now() + 90000;
let dbg = null;
while (now() < hodDeadline) {
  dbg = await page.evaluate(() =>
    typeof window.__CLARA_M52_DEBUG === 'function' ? window.__CLARA_M52_DEBUG() : null,
  );
  if (dbg?.unitIds?.join(',') === 'cse_aiml.hod,cse_ds.hod,cse.hod') {
    log('hod_plan', dbg);
    break;
  }
  await new Promise((r) => setTimeout(r, 250));
}
if (dbg?.unitIds?.join(',') !== 'cse_aiml.hod,cse_ds.hod,cse.hod') {
  log('hod_missing', dbg || {});
  await browser.close();
  process.exit(6);
}

const clips = [];
for (let i = 0; i < 3; i += 1) {
  const snap = await page.evaluate(() => window.__CLARA_M52_DEBUG());
  const card = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="hod-card"]');
    return {
      unitId: el?.getAttribute('data-unit-id') ?? null,
      count: el?.getAttribute('data-hod-count') ?? null,
      index: el?.getAttribute('data-card-index') ?? null,
      text: (el?.textContent || '').slice(0, 160),
    };
  });
  clips.push({ i, ...snap, card });
  log(`clip_${i}`, clips[i]);
  if (i < 2) {
    const qDeadline = now() + 60000;
    while (now() < qDeadline) {
      const q = await page.evaluate(() => window.__CLARA_M52_DEBUG());
      if (q.queueLength >= i + 2 && q.hasCurrentAudio) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
  }
}
await page.evaluate(() => window.__CLARA_M52_END_CLIP?.());
const completeDeadline = now() + 20000;
let complete = null;
while (now() < completeDeadline) {
  complete = await page.evaluate(() => window.__CLARA_M52_DEBUG());
  if (complete.engineState === 'PRESENTATION_COMPLETE') break;
  await new Promise((r) => setTimeout(r, 200));
}
log('after_last_clip', complete);
log('RESULT_C', {
  ok: true,
  spoken_visible: clips.map((c) => ({
    i: c.i,
    visible: c.visibleUnitId,
    spoken: c.playbackUnitId,
    engine: c.engineState,
    card: c.card?.unitId,
  })),
  complete: complete?.engineState,
});

await browser.close();
