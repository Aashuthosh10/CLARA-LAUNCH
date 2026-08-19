/**
 * Forensic onboarding + optional English 3-HOD playback.
 * Not a Playwright spec. Does not change production.
 * Run: node e2e/_m53_onboarding_smoke.mjs
 */
import { chromium } from '@playwright/test';

const URL = 'http://localhost:5176/?e2e=1';

function now() {
  return Date.now();
}

async function snap(page, label, t0) {
  const data = await page.evaluate(() => {
    const sleep = document.querySelector('[data-testid="sleep-screen"]');
    const chat = document.querySelector('[data-testid="chat-screen"]');
    const lang = document.querySelector('[data-testid="inline-language-english"]');
    const hod = document.querySelector('[data-testid="hod-card"]');
    const sleepStyle = sleep ? getComputedStyle(sleep) : null;
    return {
      href: location.href,
      sleep: Boolean(sleep),
      sleepOpacity: sleepStyle?.opacity ?? null,
      chat: Boolean(chat),
      langEn: Boolean(lang),
      langCount: document.querySelectorAll('[data-testid^="inline-language-"]').length,
      hod: Boolean(hod),
      hodUnit: hod?.getAttribute('data-unit-id') ?? null,
      hodCount: hod?.getAttribute('data-hod-count') ?? null,
    };
  });
  const row = { t_ms: now() - t0, label, ...data };
  console.log(JSON.stringify(row));
  return row;
}

async function runMode(browser, mode, { continueHod } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const t0 = now();
  const events = [];
  const log = (label, extra) => {
    const row = { t_ms: now() - t0, mode, label, ...extra };
    events.push(row);
    console.log(JSON.stringify(row));
  };

  page.on('websocket', (ws) => {
    log('ws_created', { wsUrl: ws.url() });
    if (!ws.isClosed()) log('ws_open', { wsUrl: ws.url() });
    ws.on('close', () => log('ws_close', { wsUrl: ws.url() }));
    ws.on('framereceived', (frame) => {
      const payload = String(frame.payload || '');
      const snippet = payload.slice(0, 240);
      const hasGreeting = /greeting_opening|Good evening|Good afternoon|Good morning|I am CLARA/i.test(
        payload,
      );
      const hasName = /preferred name|Wonderful|What would you like/i.test(payload);
      const hasPlan = /narration_plan/.test(payload);
      if (hasGreeting || hasName || hasPlan || /"unitId"/.test(payload)) {
        log('ws_rx', { hasGreeting, hasName, hasPlan, snippet });
      }
    });
    ws.on('framesent', (frame) => {
      const payload = String(frame.payload || '');
      log('ws_tx', { snippet: payload.slice(0, 200) });
    });
  });

  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.resolve();
    };
  });

  log('goto_start');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  log('goto_done');
  await snap(page, 'after_goto', t0);

  if (mode === 'wait_ws') {
    const deadline = now() + 15000;
    while (now() < deadline) {
      const openedAt = events.find((e) => e.label === 'ws_open' || e.label === 'ws_tx');
      if (openedAt) {
        log('ws_ready_before_wake', { opened_at_ms: openedAt.t_ms });
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!events.find((e) => e.label === 'ws_open' || e.label === 'ws_tx')) {
      log('ws_not_open_before_wake', {});
    }
  }

  const sleep = page.getByTestId('sleep-screen');
  const sleepVisible = await sleep.isVisible().catch(() => false);
  log('sleep_visible_check', { sleepVisible });
  if (!sleepVisible) {
    await snap(page, 'sleep_missing', t0);
    await context.close();
    return { mode, failed_at: 'sleep', events };
  }

  await sleep.click({ force: true });
  log('sleep_clicked');
  await snap(page, 'after_sleep_click', t0);

  const chatDeadline = now() + 15000;
  let chatVisible = false;
  while (now() < chatDeadline) {
    chatVisible = await page.getByTestId('chat-screen').isVisible().catch(() => false);
    if (chatVisible) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  log('chat_visible_check', {
    chatVisible,
    wake_tx: Boolean(events.find((e) => /"wake"/.test(e.snippet || ''))),
    conversation_started_tx: Boolean(
      events.find((e) => /conversation_started/.test(e.snippet || '')),
    ),
  });
  await snap(page, 'chat_check', t0);
  if (!chatVisible) {
    await context.close();
    return { mode, failed_at: 'chat-screen', events };
  }

  const pickerDeadline = now() + 45000;
  let pickerVisible = false;
  while (now() < pickerDeadline) {
    pickerVisible = await page.getByTestId('inline-language-english').isVisible().catch(() => false);
    if (pickerVisible) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const greetingRx = events.find((e) => e.hasGreeting);
  log('picker_check', {
    pickerVisible,
    greeting_rx: Boolean(greetingRx),
    greeting_at_ms: greetingRx?.t_ms ?? null,
    conversation_started_tx: Boolean(
      events.find((e) => e.label === 'ws_tx' && /conversation_started/.test(e.snippet || '')),
    ),
    wake_tx: Boolean(events.find((e) => e.label === 'ws_tx' && /"wake"/.test(e.snippet || ''))),
  });
  await snap(page, 'picker_check', t0);

  if (!pickerVisible) {
    await context.close();
    return { mode, failed_at: 'language-picker', events };
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
  await snap(page, 'name_prompt', t0);
  if (!nameVisible) {
    await context.close();
    return { mode, failed_at: 'name-prompt', events, ok: false };
  }

  if (!continueHod) {
    await context.close();
    return { mode, failed_at: null, ok: true, events };
  }

  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
  const readyDeadline = now() + 45000;
  let ready = false;
  while (now() < readyDeadline) {
    const text = await page.locator('body').innerText();
    if (/Wonderful|What would you like/i.test(text)) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  log('ready_chat_check', { ready });
  if (!ready) {
    await context.close();
    return { mode, failed_at: 'ready-chat', events, ok: false };
  }

  await page.evaluate(() =>
    window.__CLARA_TEST_SEND_MESSAGE?.('Who are the HODs of AIML, Data Science and CSE?'),
  );
  const hodDeadline = now() + 90000;
  let hodReady = false;
  while (now() < hodDeadline) {
    const dbg = await page.evaluate(() =>
      typeof window.__CLARA_M52_DEBUG === 'function' ? window.__CLARA_M52_DEBUG() : null,
    );
    if (
      dbg &&
      Array.isArray(dbg.unitIds) &&
      dbg.unitIds.join(',') === 'cse_aiml.hod,cse_ds.hod,cse.hod'
    ) {
      hodReady = true;
      log('hod_plan', dbg);
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!hodReady) {
    const dbg = await page.evaluate(() =>
      typeof window.__CLARA_M52_DEBUG === 'function' ? window.__CLARA_M52_DEBUG() : null,
    );
    log('hod_missing', dbg || {});
    await context.close();
    return { mode, failed_at: 'hod-plan', events, ok: false };
  }

  const clips = [];
  for (let i = 0; i < 3; i += 1) {
    const dbg = await page.evaluate(() => window.__CLARA_M52_DEBUG());
    clips.push({
      i,
      visibleUnitId: dbg.visibleUnitId,
      playbackUnitId: dbg.playbackUnitId,
      engineUnitId: dbg.engineUnitId,
      cardIndex: dbg.cardIndex,
      playhead: dbg.playhead,
      queueLength: dbg.queueLength,
      queueUnitIds: dbg.queueUnitIds,
      engineState: dbg.engineState,
      hasCurrentAudio: dbg.hasCurrentAudio,
      hodCount: dbg.hodCount,
    });
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
  await snap(page, 'hod_final', t0);
  await context.close();
  return { mode, failed_at: null, ok: true, events, clips, complete };
}

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  console.log('=== MODE A: immediate wake after domcontentloaded (repro Playwright) ===');
  const a = await runMode(browser, 'immediate');
  console.log('RESULT_A', JSON.stringify({ mode: a.mode, failed_at: a.failed_at, ok: a.ok }));

  console.log('=== MODE B: wait for WS open, then wake, then 3-HOD ===');
  const b = await runMode(browser, 'wait_ws', { continueHod: true });
  console.log(
    'RESULT_B',
    JSON.stringify({
      mode: b.mode,
      failed_at: b.failed_at,
      ok: b.ok,
      clips: b.clips,
      complete: b.complete
        ? { engineState: b.complete.engineState, visibleUnitId: b.complete.visibleUnitId }
        : null,
    }),
  );
} finally {
  await browser.close();
}
