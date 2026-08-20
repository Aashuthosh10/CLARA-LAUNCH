import { test, expect, type Page } from '@playwright/test';

const TINY_WAV = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

type InlineLang = 'english' | 'kannada' | 'hindi' | 'tamil' | 'telugu' | 'malayalam';

const NAME_PROMPT =
  /May I know your preferred name|ಆತ್ಮೀಯ|आपका नाम|உங்கள் பெயரை|మీ పేరు|നിങ്ങളുടെ/;
const READY_PROMPT =
  /Wonderful to meet you|What would you like|ಸಂತೋಷ|मिलकर अच्छा|மகிழ்ச்சி|కలవడం ఆనందం|കാണാൻ സന്തോഷം/;

const LANG_PAYLOAD: Record<InlineLang, { code: string; name: string }> = {
  english: { code: 'en', name: 'English' },
  kannada: { code: 'kn', name: 'Kannada' },
  hindi: { code: 'hi', name: 'Hindi' },
  tamil: { code: 'ta', name: 'Tamil' },
  telugu: { code: 'te', name: 'Telugu' },
  malayalam: { code: 'ml', name: 'Malayalam' },
};

async function installM59Socket(page: Page) {
  await page.addInitScript((wav: string) => {
    HTMLMediaElement.prototype.play = function () {
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

    const BODIES: Record<string, { title: string; body: string }> = {
      en: { title: 'HOD & Vision', body: 'The Head of the CSE (Data Science) department is Dr. Nagashree N.' },
      kn: { title: 'HOD ಮತ್ತು ದೃಷ್ಟಿಕೋನ', body: 'CSE (ಡೇಟಾ ಸೈನ್ಸ್) ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು Dr. Nagashree N.' },
      hi: { title: 'HOD और दृष्टिकोण', body: 'CSE (डेटा साइंस) विभाग के प्रमुख Dr. Nagashree N हैं।' },
      ta: { title: 'HOD மற்றும் பார்வை', body: 'CSE (Data Science) துறையின் தலைவர் Dr. Nagashree N.' },
      te: { title: 'HOD మరియు దృక్పథం', body: 'CSE (Data Science) విభాగం అధిపతి Dr. Nagashree N.' },
      ml: { title: 'HOD ഉം വീക്ഷണവും', body: 'CSE (Data Science) വിഭാഗത്തിന്റെ മേധാവി Dr. Nagashree N ആണ്.' },
    };

    class MockClaraWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      static postLangUserMsgCount = 0;
      static turnSerial = 0;
      static langCode = 'en';
      static langName = 'English';
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

      emit(state: number, payload: Record<string, unknown>) {
        const event = new MessageEvent('message', { data: JSON.stringify({ state, payload }) });
        this.onmessage?.(event);
        this.dispatchEvent(event);
      }

      send(raw: string) {
        const msg = JSON.parse(raw);
        if (msg.action === 'wake') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          this.emit(5, greetingPayload);
        }
        if (msg.action === 'language_selected') {
          MockClaraWebSocket.postLangUserMsgCount = 0;
          const picked = String(msg.language || 'English');
          const map: Record<string, { code: string; name: string }> = {
            English: { code: 'en', name: 'English' },
            Kannada: { code: 'kn', name: 'Kannada' },
            Hindi: { code: 'hi', name: 'Hindi' },
            Tamil: { code: 'ta', name: 'Tamil' },
            Telugu: { code: 'te', name: 'Telugu' },
            Malayalam: { code: 'ml', name: 'Malayalam' },
          };
          const loc = map[picked] || map.English;
          MockClaraWebSocket.langCode = loc.code;
          MockClaraWebSocket.langName = loc.name;
          this.emit(5, namePayload);
        }
        if (msg.action === 'user_message') {
          MockClaraWebSocket.postLangUserMsgCount += 1;
          const n = MockClaraWebSocket.postLangUserMsgCount;
          const ut = typeof msg.text === 'string' ? msg.text : '';
          if (n === 1) {
            this.emit(5, {
              turn_id: 'name_ack',
              isProcessing: false,
              isSpeaking: false,
              messages: [
                { id: 'user-name', role: 'user', text: ut },
                { id: 'ready', role: 'clara', text: 'Wonderful to meet you, Alex. What would you like to know?' },
              ],
            });
            return;
          }
          MockClaraWebSocket.turnSerial += 1;
          const turnId = `m59-${MockClaraWebSocket.turnSerial}`;
          const copy = BODIES[MockClaraWebSocket.langCode] || BODIES.en;
          const lower = ut.toLowerCase();
          const mixed =
            (lower.includes('data science') && lower.includes('aiml')) ||
            (lower.includes('cse_ds') && lower.includes('aiml'));
          const units = mixed
            ? [
                { unitId: 'cse_ds.overview', sectionId: 'intro', title: copy.title, body: copy.body },
                { unitId: 'cse_aiml.overview', sectionId: 'intro', title: copy.title, body: copy.body },
              ]
            : lower.includes('principal')
              ? [{ unitId: 'leadership.principal', sectionId: 'principal', title: 'Principal', body: copy.body }]
              : [{ unitId: 'cse_ds.hod', sectionId: 'hod_voice', title: copy.title, body: copy.body }];
          const segments = units.map((u, i) => ({
            segmentId: `${turnId}:seg:${i}`,
            displayText: `${u.title}\n${u.body}`,
            ttsText: u.body,
            cardIndex: i,
            cardId: 'dept_slide',
            sectionId: u.sectionId,
            unitId: u.unitId,
            isFinalSegment: i === units.length - 1,
          }));
          this.emit(5, {
            type: 'assistant_audio_update',
            turn_id: turnId,
            isProcessing: false,
            isSpeaking: true,
            audioPending: false,
            audioUnavailable: false,
            showCard: units[0]?.unitId.startsWith('leadership.') ? 'department_overview' : 'department_overview',
            language_code_key: MockClaraWebSocket.langCode,
            language_name: MockClaraWebSocket.langName,
            narration_plan: { turnId, mode: 'card_narration', segments },
            tts_streaming: false,
            tts_chunk_index: units.length - 1,
            tts_audio_queue: units.map(() => wav),
            audioBase64: wav,
            messages: [
              { id: `user-${turnId}`, role: 'user', text: ut },
              { id: `clara-${turnId}`, role: 'clara', text: units.map((u) => u.body).join(' ') },
            ],
          });
        }
      }

      close() {
        this.readyState = MockClaraWebSocket.CLOSED;
      }
    }

    (window as unknown as { WebSocket: unknown }).WebSocket = MockClaraWebSocket;
  }, TINY_WAV);
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

test.describe('M5.9 localized card presentation', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await installM59Socket(page);
  });

  for (const lang of ['english', 'kannada', 'hindi', 'tamil', 'telugu', 'malayalam'] as InlineLang[]) {
    test(`${lang} HOD card follows selected language`, async ({ page }) => {
      await reachReadyChat(page, lang);
      await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Who is the HOD of CSE Data Science?'));
      const expected = LANG_PAYLOAD[lang].name;
      await expect(page.locator('[data-card-language]').first()).toHaveAttribute(
        'data-card-language',
        expected,
        { timeout: 20000 },
      );
      await expect(page.getByTestId('chat-screen')).toBeVisible();
    });
  }

  test('Kannada principal card is Kannada', async ({ page }) => {
    await reachReadyChat(page, 'kannada');
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Who is the principal?'));
    await expect(page.getByTestId('principal-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('principal-card')).toHaveAttribute('data-card-language', 'Kannada');
    const text = await page.getByTestId('principal-card').innerText();
    expect(text).toMatch(/[\u0C80-\u0CFF]/);
  });

  test('mixed department overviews render without a black screen', async ({ page }) => {
    await reachReadyChat(page, 'english');
    await page.evaluate(() =>
      window.__CLARA_TEST_SEND_MESSAGE?.('Show me CSE Data Science and CSE AIML.'),
    );
    await expect(page.getByTestId('department-card')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('chat-screen')).toBeVisible();
    await expect.poll(async () => {
      return page.evaluate(() => window.__CLARA_M52_DEBUG?.()?.unitIds ?? []);
    }).toEqual(['cse_ds.overview', 'cse_aiml.overview']);
  });
});
