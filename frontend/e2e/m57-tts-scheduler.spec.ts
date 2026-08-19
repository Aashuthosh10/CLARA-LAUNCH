import { test, expect, type Page } from '@playwright/test';

const TINY_WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const ACK_WAV = 'UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAAA=';

type PlayCall = { turnId?: string; channel?: string };

async function installM57Socket(
  page: Page,
  opts: { failPlay?: boolean; delayMs?: number; includeAck?: boolean } = {},
) {
  await page.addInitScript(({ failPlay, delayMs, includeAck, wav, ackWav }) => {
    const playCalls: PlayCall[] = [];
    (window as unknown as { __CLARA_PLAY_CALLS?: PlayCall[] }).__CLARA_PLAY_CALLS = playCalls;
    HTMLMediaElement.prototype.play = function () {
      playCalls.push({
        turnId: (this as HTMLAudioElement).dataset?.turnId,
        channel: (this as HTMLAudioElement).dataset?.claraChannel,
      });
      if (failPlay) return Promise.reject(new Error('NotAllowedError'));
      window.setTimeout(() => this.dispatchEvent(new Event('ended')), 20);
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

    class MockClaraWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      static postLangUserMsgCount = 0;
      static turnSerial = 0;

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
          if (new URLSearchParams(window.location.search).get('state') === '5') {
            this.emit(5, greetingPayload);
          }
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
          MockClaraWebSocket.turnSerial += 1;
          const turnId = `m57-turn-${MockClaraWebSocket.turnSerial}`;
          const marker = ut.includes('SECOND-QUESTION') ? 'SECOND-ANSWER-VISIBLE' : 'EN-FACULTY-ANSWER';
          const messages = [
            { id: `user-${turnId}`, role: 'user', text: ut },
            { id: `clara-${turnId}`, role: 'clara', text: marker },
          ];
          this.emit(5, { turn_id: turnId, isProcessing: true, isSpeaking: false, audioPending: false });
          if (includeAck) {
            this.emit(5, {
              type: 'assistant_ack_audio',
              utterance_kind: 'ack_earcon',
              turn_id: turnId,
              isProcessing: true,
              audioBase64: ackWav,
            });
          }
          window.setTimeout(() => {
            this.emit(5, {
              type: 'assistant_audio_update',
              turn_id: turnId,
              isProcessing: false,
              isSpeaking: true,
              audioPending: false,
              audioUnavailable: false,
              tts_streaming: false,
              tts_audio_queue: [wav],
              audioBase64: wav,
              messages,
            });
          }, delayMs);
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
  }, {
    failPlay: Boolean(opts.failPlay),
    delayMs: opts.delayMs ?? 400,
    includeAck: opts.includeAck !== false,
    wav: TINY_WAV,
    ackWav: ACK_WAV,
  });
}

async function wakeFromSleep(page: Page) {
  const sleepScreen = page.getByTestId('sleep-screen');
  await expect(sleepScreen).toBeVisible();
  await sleepScreen.focus();
  await page.keyboard.press('Enter');
}

async function selectInlineLanguage(page: Page, language: string) {
  const button = page.getByTestId(`inline-language-${language}`);
  await expect(button).toBeVisible({ timeout: 15000 });
  await button.scrollIntoViewIfNeeded();
  await button.click({ force: true });
}

async function completeInlineGuestNameGate(page: Page) {
  await expect(page.getByText(/May I know your preferred name\?/i)).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
  await expect(page.getByText(/Wonderful|What would you like/i)).toBeVisible({ timeout: 15000 });
}

test.describe('M5.7 TTS scheduler / ACK isolation', () => {
  test.describe.configure({ timeout: 60000 });

  test('thinking stays until complete TTS; ACK does not skip response audio', async ({ page }) => {
    await installM57Socket(page, { includeAck: true, delayMs: 500 });
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('How good are the teachers here?'));
    await expect(page.getByText('EN-FACULTY-ANSWER')).toBeVisible({ timeout: 15000 });
    const calls = await page.evaluate(() => (window as unknown as { __CLARA_PLAY_CALLS?: PlayCall[] }).__CLARA_PLAY_CALLS || []);
    expect(calls.some((c) => c.channel === 'ack')).toBeTruthy();
    expect(calls.some((c) => c.channel === 'response')).toBeTruthy();
  });

  test('audio.play() rejection still presents text and allows the next turn', async ({ page }) => {
    await installM57Socket(page, { failPlay: true, includeAck: true, delayMs: 80 });
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('How good are the teachers here?'));
    await expect(page.getByText('EN-FACULTY-ANSWER')).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('SECOND-QUESTION How is campus life?'));
    await expect(page.getByText('SECOND-ANSWER-VISIBLE')).toBeVisible({ timeout: 15000 });
  });
});
