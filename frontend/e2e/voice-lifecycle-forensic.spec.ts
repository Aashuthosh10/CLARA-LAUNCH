import { test, expect, type Page } from '@playwright/test';

/**
 * Forensic verification of auto-listen NO_INPUT warnings with mocked
 * WebSocket + SpeechRecognition (no real microphone).
 */

const TINY_WAV =
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

async function installForensicMocks(page: Page) {
  await page.addInitScript((wav) => {
    (window as unknown as { __CLARA_OUTBOUND?: object[] }).__CLARA_OUTBOUND = [];
    (window as unknown as { __CLARA_SR_STARTS?: number }).__CLARA_SR_STARTS = 0;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult: ((ev: unknown) => void) | null = null;
      onerror: ((ev: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        (window as unknown as { __CLARA_SR_STARTS: number }).__CLARA_SR_STARTS += 1;
        // Soft no-speech → NO_INPUT path while auto-armed
        window.setTimeout(() => {
          this.onerror?.({ error: 'no-speech' });
          this.onend?.();
        }, 40);
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });

    class MockClaraWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      static postLangUserMsgCount = 0;
      readyState = 0;
      onopen: ((e: Event) => void) | null = null;
      onmessage: ((e: MessageEvent) => void) | null = null;
      onclose: ((e: CloseEvent) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;

      constructor(_url: string) {
        super();
        window.setTimeout(() => {
          this.readyState = 1;
          this.onopen?.(new Event('open'));
        }, 0);
      }

      send(raw: string) {
        const msg = JSON.parse(raw);
        (window as unknown as { __CLARA_OUTBOUND: object[] }).__CLARA_OUTBOUND.push(msg);

        if (msg.action === 'wake') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          this.emit(5, {
            turn_id: 'greeting_opening',
            isProcessing: false,
            isSpeaking: false,
            messages: [{ id: 'greeting', role: 'clara', text: 'Good evening. I am CLARA.' }],
          });
        }
        if (msg.action === 'language_selected') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          this.emit(5, {
            turn_id: 'name_after_language_pick',
            isProcessing: false,
            isSpeaking: false,
            messages: [
              { id: 'name_prompt', role: 'clara', text: 'May I know your preferred name?' },
            ],
          });
        }
        if (msg.action === 'user_message') {
          const li = msg.localIntent;
          const liType = li && typeof li === 'object' ? String(li.type || '') : '';
          if (liType === 'session_no_input_warning') {
            const attempt = Number(li.attempt || 1);
            const text =
              attempt >= 2
                ? "I still couldn't hear you. Please tap the orb and start speaking whenever you're ready."
                : "I didn't quite hear you. Whenever you're ready, you can speak.";
            this.emit(5, {
              turn_id: `no_input_${attempt}`,
              isProcessing: false,
              isSpeaking: true,
              audioPending: false,
              no_input_warning_attempt: attempt,
              awaiting_manual_listen: attempt >= 2,
              messages: [{ id: `no_input_${attempt}`, role: 'clara', text }],
              audioBase64: wav,
            });
            return;
          }

          MockClaraWebSocket.postLangUserMsgCount += 1;
          const n = MockClaraWebSocket.postLangUserMsgCount;
          if (n === 1) {
            // Guest name → ready + short TTS so auto-listen can arm after local play.
            this.emit(5, {
              turn_id: 'ready_after_language_pick',
              isProcessing: false,
              isSpeaking: true,
              audioPending: false,
              guest_name: String(msg.text || 'Alex'),
              messages: [
                { id: 'user-name', role: 'user', text: String(msg.text || '') },
                {
                  id: 'ready_prompt',
                  role: 'clara',
                  text: 'Wonderful. What would you like to know?',
                },
              ],
              audioBase64: wav,
            });
            return;
          }
          // Should not receive campus user turns from silence path.
          this.emit(5, {
            turn_id: 'unexpected_campus_turn',
            isProcessing: false,
            isSpeaking: false,
            messages: [
              { id: 'u', role: 'user', text: String(msg.text || '') },
              { id: 'c', role: 'clara', text: 'UNEXPECTED_CAMPUS_REPLY' },
            ],
          });
        }
      }

      close() {
        this.readyState = 3;
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
  }, TINY_WAV);
}

test.describe('Voice lifecycle forensic (mocked mic)', () => {
  test.setTimeout(60000);

  test('silence auto-listen → warning #1 then #2 without campus LLM turns', async ({ page }) => {
    await installForensicMocks(page);
    await page.goto('http://localhost:5176/?e2e=1');

    await expect(page.getByTestId('sleep-screen')).toBeVisible();
    await page.getByTestId('sleep-screen').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('inline-language-english').click({ force: true });
    await expect(page.getByText(/May I know your preferred name/i)).toBeVisible({
      timeout: 15000,
    });
    await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Rahul'));
    await expect(page.getByText(/Wonderful|What would you like/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15000 });

    // Wait for auto-listen → no-speech → warning #1
    await expect(
      page.getByText(/I didn't quite hear you|Whenever you're ready/i),
    ).toBeVisible({ timeout: 20000 });

    // Then warning #2 after second auto-arm no-speech
    await expect(
      page.getByText(/I still couldn't hear you|Please tap the orb/i),
    ).toBeVisible({ timeout: 25000 });

    const outbound = await page.evaluate(() => {
      const all = (window as unknown as { __CLARA_OUTBOUND?: object[] }).__CLARA_OUTBOUND || [];
      return all.filter((m) => (m as { action?: string }).action === 'user_message') as Array<{
        text?: string;
        localIntent?: { type?: string; attempt?: number };
      }>;
    });

    const campus = outbound.filter(
      (m) =>
        typeof m.text === 'string' &&
        !m.text.startsWith('__CLARA_') &&
        !(m.localIntent && String(m.localIntent.type || '').startsWith('session_')),
    );
    // First campus-ish message is guest name "Rahul" only.
    expect(campus.map((m) => m.text)).toEqual(['Rahul']);

    const warnings = outbound.filter(
      (m) => m.localIntent?.type === 'session_no_input_warning',
    );
    expect(warnings.map((w) => w.localIntent?.attempt)).toEqual([1, 2]);

    await expect(page.getByText('UNEXPECTED_CAMPUS_REPLY')).toHaveCount(0);

    const srStarts = await page.evaluate(
      () => (window as unknown as { __CLARA_SR_STARTS?: number }).__CLARA_SR_STARTS || 0,
    );
    // Ready TTS arm + re-arm after warning #1 at minimum; should not infinite-loop.
    expect(srStarts).toBeGreaterThanOrEqual(2);
    expect(srStarts).toBeLessThan(8);
  });
});
