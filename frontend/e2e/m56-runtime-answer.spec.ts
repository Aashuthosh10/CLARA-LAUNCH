import { test, expect, type Page } from '@playwright/test';

const TINY_WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const LANG_BUTTON = ['english', 'kannada', 'hindi', 'tamil', 'telugu', 'malayalam'] as const;

const ANSWER_MATRIX: { language: (typeof LANG_BUTTON)[number]; query: string; answer: string }[] = [
  { language: 'english', query: 'How good are the teachers here?', answer: 'EN-FACULTY-ANSWER' },
  { language: 'kannada', query: 'teachers hegiddare?', answer: 'KN-FACULTY-ANSWER' },
  { language: 'hindi', query: 'teachers kaise hain?', answer: 'HI-FACULTY-ANSWER' },
  { language: 'tamil', query: 'campus life eppadi irukku?', answer: 'TA-CAMPUS-ANSWER' },
  { language: 'telugu', query: 'teachers ela unnaru?', answer: 'TE-FACULTY-ANSWER' },
  { language: 'malayalam', query: 'campus engane aanu?', answer: 'ML-CAMPUS-ANSWER' },
];

async function installRuntimeSocket(page: Page, opts: { failPlay?: boolean } = {}) {
  await page.addInitScript(({ failPlay, wav }) => {
    const playCalls: Array<{ turnId?: string }> = [];
    (window as unknown as { __CLARA_PLAY_CALLS?: typeof playCalls }).__CLARA_PLAY_CALLS = playCalls;
    HTMLMediaElement.prototype.play = function () {
      playCalls.push({ turnId: (this as HTMLAudioElement).dataset?.turnId });
      if (failPlay) {
        return Promise.reject(new Error('NotAllowedError'));
      }
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
          const turnId = `answer-turn-${MockClaraWebSocket.turnSerial}`;
          const marker =
            ut.includes('SECOND-QUESTION')
              ? 'SECOND-ANSWER-VISIBLE'
              : ut.includes('FAIL-TTS')
                ? 'TTS-FAIL-ANSWER'
                : ut.includes('hegiddare')
                  ? 'KN-FACULTY-ANSWER'
                  : ut.includes('kaise')
                    ? 'HI-FACULTY-ANSWER'
                    : ut.includes('eppadi')
                      ? 'TA-CAMPUS-ANSWER'
                      : ut.includes('unnaru')
                        ? 'TE-FACULTY-ANSWER'
                        : ut.includes('engane')
                          ? 'ML-CAMPUS-ANSWER'
                          : 'EN-FACULTY-ANSWER';
          const messages = [
            { id: `user-${turnId}`, role: 'user', text: ut },
            { id: `clara-${turnId}`, role: 'clara', text: marker },
          ];
          this.emit(5, {
            turn_id: turnId,
            isProcessing: true,
            isSpeaking: false,
            audioPending: false,
          });
          this.emit(5, {
            turn_id: turnId,
            isProcessing: false,
            isSpeaking: true,
            audioPending: true,
            utterance_kind: 'assistant_visible_answer',
            messages,
          });
          const failTts = ut.includes('FAIL-TTS');
          window.setTimeout(() => {
            if (failTts) {
              this.emit(5, {
                type: 'assistant_audio_update',
                turn_id: turnId,
                isProcessing: false,
                isSpeaking: false,
                audioPending: false,
                audioUnavailable: true,
                tts_streaming: false,
                messages,
              });
              return;
            }
            this.emit(5, {
              type: 'assistant_audio_update',
              turn_id: turnId,
              isProcessing: false,
              isSpeaking: true,
              audioPending: false,
              audioUnavailable: false,
              tts_streaming: true,
              tts_chunk_index: 0,
              audioBase64: wav,
              messages,
            });
          }, 40);
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
          if (payload && typeof payload === 'object' && (payload as { type?: string }).type === 'assistant_audio_update') {
            (window as unknown as { __CLARA_AUDIO_UPDATE_SEEN?: boolean }).__CLARA_AUDIO_UPDATE_SEEN = true;
          }
          this.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({ state, payload }),
            }),
          );
        }, 0);
      }
    }

    window.WebSocket = MockClaraWebSocket as unknown as typeof WebSocket;
  }, { failPlay: Boolean(opts.failPlay), wav: TINY_WAV });
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

test.describe('M5.6 runtime ANSWER text/TTS', () => {
  test.describe.configure({ timeout: 60000 });

  for (const row of ANSWER_MATRIX) {
    test(`${row.language}: ANSWER text is visible while audioPending`, async ({ page }) => {
      await installRuntimeSocket(page);
      await page.goto('http://localhost:5176/?e2e=1');
      await wakeFromSleep(page);
      await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
      await selectInlineLanguage(page, row.language);
      await completeInlineGuestNameGate(page);
      await page.evaluate((q) => window.__CLARA_TEST_SEND_MESSAGE?.(q), row.query);
      await expect(page.getByText(row.answer)).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('chat-screen')).toBeVisible();
    });
  }

  test('TTS failure keeps text visible and the next turn works', async ({ page }) => {
    await installRuntimeSocket(page);
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('FAIL-TTS How good are the teachers here?'));
    await expect(page.getByText('TTS-FAIL-ANSWER')).toBeVisible({ timeout: 15000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __CLARA_AUDIO_UPDATE_SEEN?: boolean }).__CLARA_AUDIO_UPDATE_SEEN));
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('SECOND-QUESTION How is campus life?'));
    await expect(page.getByText('SECOND-ANSWER-VISIBLE')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('chat-screen')).toBeVisible();
  });

  test('audio.play() rejection recovers without hiding text', async ({ page }) => {
    await installRuntimeSocket(page, { failPlay: true });
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('How good are the teachers here?'));
    await expect(page.getByText('EN-FACULTY-ANSWER')).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('SECOND-QUESTION How are placements?'));
    await expect(page.getByText('SECOND-ANSWER-VISIBLE')).toBeVisible({ timeout: 15000 });
  });
});
