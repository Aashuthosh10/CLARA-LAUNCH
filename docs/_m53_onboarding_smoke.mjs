/**
 * Forensic onboarding smoke. Does not change production or official e2e specs.
 * Run from frontend/: node ../docs/_m53_onboarding_smoke.mjs
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
    const sleepStyle = sleep ? getComputedStyle(sleep) : null;
    return {
      href: location.href,
      sleep: Boolean(sleep),
      sleepDisplay: sleepStyle?.display ?? null,
      sleepOpacity: sleepStyle?.opacity ?? null,
      sleepAriaHidden: sleep?.getAttribute('aria-hidden') ?? null,
      chat: Boolean(chat),
      langEn: Boolean(lang),
      langCount: document.querySelectorAll('[data-testid^="inline-language-"]').length,
      claraText: Array.from(document.querySelectorAll('p, h1, h2, span, div'))
        .map((el) => (el.textContent || '').trim())
        .filter((t) => t.length > 12 && t.length < 180)
        .slice(0, 8),
    };
  });
  const row = { t_ms: now() - t0, label, ...data };
  console.log(JSON.stringify(row));
  return row;
}

async function wsReady(page) {
  return page.evaluate(() => {
    const sockets = [];
    // Playwright cannot list native WS easily; hook via performance / page sockets is unavailable.
    return {
      connectedHint: Boolean(document.querySelector('[data-testid="chat-screen"]')),
    };
  });
}

async function runMode(browser, mode) {
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
      const snippet = payload.slice(0, 220);
      const hasGreeting = /greeting_opening|Good evening|Good afternoon|Good morning|I am CLARA/i.test(
        payload,
      );
      const hasName = /preferred name|ಆತ್ಮೀಯ ಹೆಸರು/i.test(payload);
      const hasPlan = /narration_plan/.test(payload);
      if (hasGreeting || hasName || hasPlan || /conversation_started|language_selected/.test(payload)) {
        log('ws_rx', { hasGreeting, hasName, hasPlan, snippet });
      }
    });
    ws.on('framesent', (frame) => {
      const payload = String(frame.payload || '');
      log('ws_tx', { snippet: payload.slice(0, 180) });
    });
  });

  log('goto_start');
  await page.goto(URL, { waitUntil: mode === 'domcontentloaded' ? 'domcontentloaded' : 'networkidle' });
  log('goto_done');
  await snap(page, 'after_goto', t0);

  if (mode === 'wait_ws') {
    const deadline = now() + 15000;
    while (now() < deadline) {
      const openedAt = events.find((e) => e.label === 'ws_open' || e.label === 'ws_rx');
      if (openedAt) {
        log('ws_ready_before_wake', { opened_at_ms: openedAt.t_ms });
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!events.find((e) => e.label === 'ws_open' || e.label === 'ws_rx')) {
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
  log('chat_visible_check', { chatVisible, waited_ms: now() - t0 });
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
    if (/May I know your preferred name|ಆತ್ಮೀಯ ಹೆಸರು/i.test(text)) {
      nameVisible = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  log('name_prompt_check', { nameVisible });
  await snap(page, 'name_prompt', t0);

  await context.close();
  return {
    mode,
    failed_at: nameVisible ? null : 'name-prompt',
    ok: nameVisible,
    events,
  };
}

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  console.log('=== MODE A: immediate wake after domcontentloaded (repro Playwright) ===');
  const a = await runMode(browser, 'domcontentloaded');
  console.log('RESULT_A', JSON.stringify({ mode: a.mode, failed_at: a.failed_at, ok: a.ok }));

  console.log('=== MODE B: wait for WS open, then wake ===');
  const b = await runMode(browser, 'wait_ws');
  console.log('RESULT_B', JSON.stringify({ mode: b.mode, failed_at: b.failed_at, ok: b.ok }));
} finally {
  await browser.close();
}
