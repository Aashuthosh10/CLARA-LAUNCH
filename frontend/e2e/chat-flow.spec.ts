import { test, expect, type Page } from '@playwright/test';

async function installMockClaraSocket(page: Page) {
  await page.addInitScript(() => {
    const greetingPayload = {
      turn_id: 'greeting_opening',
      isProcessing: false,
      isSpeaking: false,
      messages: [
        {
          id: 'greeting',
          role: 'clara',
          text: 'Good evening. I am CLARA. How can I help you today?',
        },
      ],
    };
    const namePayload = {
      turn_id: 'name_after_language_pick',
      isProcessing: false,
      isSpeaking: false,
      messages: [
        {
          id: 'name_prompt',
          role: 'clara',
          text: 'May I know your preferred name?',
        },
      ],
    };
    const readyPayload = {
      turn_id: 'ready_after_language_pick',
      isProcessing: false,
      isSpeaking: false,
      messages: [
        {
          id: 'ready_prompt',
          role: 'clara',
          text: 'Wonderful. What would you like to know?',
        },
      ],
    };
    const documentsPayload = {
      turn_id: 'documents-answer',
      isProcessing: false,
      isSpeaking: true,
      audioPending: true,
      showCard: 'documents',
      messages: [
        { id: 'user-docs', role: 'user', text: 'admission documents' },
        {
          id: 'docs-answer',
          role: 'clara',
          text: 'These are the core admission documents.',
        },
      ],
    };
    const documentsAudioPayload = {
      ...documentsPayload,
      type: 'assistant_audio_update',
      isSpeaking: true,
      audioPending: false,
      audioUnavailable: false,
      audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
    };
    const normalAnswerPayload = {
      turn_id: 'library-answer',
      isProcessing: false,
      isSpeaking: false,
      audioPending: false,
      audioUnavailable: true,
      thinking_audio_failed: true,
      showCard: null,
      assistantText: 'The library has reference books. It also provides digital resources.',
      spokenText: 'The library has reference books. It also provides digital resources.',
      messages: [
        { id: 'user-library', role: 'user', text: 'library services' },
        {
          id: 'library-answer',
          role: 'clara',
          text: 'The library has reference books. It also provides digital resources.',
          answerPresentation: {
            schemaVersion: 1,
            type: 'INFO_CARD',
            eyebrow: 'CLARA',
            title: 'Information',
            summary: 'The library has reference books. It also provides digital resources.',
            points: ['The library has reference books.', 'It also provides digital resources.'],
            highlights: [],
            choices: [],
          },
        },
      ],
    };
    const choiceAnswerPayload = {
      turn_id: 'choice-answer',
      isProcessing: false,
      isSpeaking: false,
      audioPending: false,
      audioUnavailable: true,
      thinking_audio_failed: true,
      showCard: null,
      messages: [
        { id: 'user-choice', role: 'user', text: 'need guidance' },
        {
          id: 'choice-answer', role: 'clara', text: 'Please choose:\n- Eligibility\n- Documents',
          answerPresentation: { schemaVersion: 1, type: 'CHOICE_CARD', eyebrow: 'CLARA', title: 'Choose an option', summary: 'Please choose:\n- Eligibility\n- Documents', points: ['Eligibility', 'Documents'], highlights: [], choices: ['Eligibility', 'Documents'] },
        },
      ],
    };
    const visualDemoModels = {
      INFO_CARD: {
        title: 'Information',
        summary: 'A detailed authoritative answer for kiosk layout validation.',
        points: [
          'Applicants should review the published eligibility requirements for their selected programme.',
          'Required qualifications and applicable category rules are presented by the admission office.',
          'Entrance examination requirements depend on the programme selected by the applicant.',
          'Original documents are verified during the formal admission process.',
          'Candidates should retain copies of every document they submit.',
          'The admission office remains the authority for current dates and programme-specific requirements.',
        ],
        highlights: [], choices: [],
      },
      GENERIC_ANSWER_CARD: {
        title: 'Answer',
        summary: 'This is the first grounded sentence. This is the second grounded sentence. This is the third grounded sentence. This is the fourth grounded sentence. This is the fifth grounded sentence.',
        points: [], highlights: [], choices: [],
      },
      LIST_CARD: {
        title: 'Key points', summary: 'Authoritative list.',
        points: ['Application form', 'Academic records', 'Identity proof', 'Transfer certificate', 'Programme-specific documents'],
        highlights: [], choices: [],
      },
      STEP_CARD: {
        title: 'Steps', summary: 'Authoritative procedure.',
        points: ['Review eligibility', 'Complete the application', 'Submit required documents', 'Attend verification', 'Confirm the admission', 'Keep the acknowledgement'],
        highlights: [], choices: [],
      },
      STATS_CARD: {
        title: 'Highlights', summary: 'Grounded numeric information.', points: [],
        highlights: ['45% minimum aggregate where stated.', '40% aggregate for applicable categories.', 'Three programme groups are listed.', 'Two verification stages are required.'], choices: [],
      },
      CHOICE_CARD: {
        title: 'Choose an option', summary: 'What would you like to explore?', points: [], highlights: [],
        choices: ['Admission steps', 'Eligibility details', 'Documents required', 'Contact the admission office'],
      },
    };
    const scriptDemoModels = {
      english: { title: 'Information', points: ['The library supports coursework and research.', 'Books, journals, and digital resources are available.', 'Visitors can ask staff for current access details.'] },
      kannada: { title: 'ಮಾಹಿತಿ', points: ['ಗ್ರಂಥಾಲಯವು ಪಠ್ಯಕ್ರಮ ಮತ್ತು ಸಂಶೋಧನೆಗೆ ಬೆಂಬಲ ನೀಡುತ್ತದೆ.', 'ಪುಸ್ತಕಗಳು, ನಿಯತಕಾಲಿಕೆಗಳು ಮತ್ತು ಡಿಜಿಟಲ್ ಸಂಪನ್ಮೂಲಗಳು ಲಭ್ಯವಿವೆ.', 'ಪ್ರಸ್ತುತ ಪ್ರವೇಶ ವಿವರಗಳಿಗಾಗಿ ಸಂದರ್ಶಕರು ಸಿಬ್ಬಂದಿಯನ್ನು ಕೇಳಬಹುದು.'] },
      hindi: { title: 'जानकारी', points: ['पुस्तकालय पाठ्यक्रम और अनुसंधान में सहायता करता है।', 'पुस्तकें, पत्रिकाएँ और डिजिटल संसाधन उपलब्ध हैं।', 'वर्तमान प्रवेश विवरण के लिए आगंतुक कर्मचारियों से पूछ सकते हैं।'] },
      telugu: { title: 'సమాచారం', points: ['గ్రంథాలయం పాఠ్యాంశాలు మరియు పరిశోధనకు మద్దతు ఇస్తుంది.', 'పుస్తకాలు, పత్రికలు మరియు డిజిటల్ వనరులు అందుబాటులో ఉన్నాయి.', 'ప్రస్తుత ప్రవేశ వివరాల కోసం సందర్శకులు సిబ్బందిని అడగవచ్చు.'] },
      tamil: { title: 'தகவல்', points: ['நூலகம் பாடத்திட்டம் மற்றும் ஆராய்ச்சிக்கு ஆதரவு அளிக்கிறது.', 'புத்தகங்கள், இதழ்கள் மற்றும் டிஜிட்டல் வளங்கள் கிடைக்கின்றன.', 'தற்போதைய அணுகல் விவரங்களை பார்வையாளர்கள் ஊழியர்களிடம் கேட்கலாம்.'] },
      malayalam: { title: 'വിവരം', points: ['ലൈബ്രറി പഠനത്തിനും ഗവേഷണത്തിനും പിന്തുണ നൽകുന്നു.', 'പുസ്തകങ്ങളും ജേണലുകളും ഡിജിറ്റൽ വിഭവങ്ങളും ലഭ്യമാണ്.', 'നിലവിലെ പ്രവേശന വിവരങ്ങൾ സന്ദർശകർക്ക് ജീവനക്കാരോട് ചോദിക്കാം.'] },
    };

    class MockClaraWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      /** First user_message after language_selected simulates guest-name reply → ready_prompt. */
      static postLangUserMsgCount = 0;
      static visualTurnCount = 0;
      static navigationTurnCount = 0;
      static selectedLanguage = 'English';

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
          MockClaraWebSocket.selectedLanguage = typeof msg.language === 'string' ? msg.language : 'English';
          this.emit(5, namePayload);
        }
        if (msg.action === 'user_message') {
          MockClaraWebSocket.postLangUserMsgCount += 1;
          const n = MockClaraWebSocket.postLangUserMsgCount;
          if (n === 1) {
            const ut = typeof msg.text === 'string' ? msg.text : '';
            this.emit(5, {
              turn_id: 'ready_after_language_pick',
              isProcessing: false,
              isSpeaking: false,
              messages: [
                { id: 'user-mock', role: 'user', text: ut },
                {
                  id: 'ready_prompt',
                  role: 'clara',
                  text: 'Wonderful. What would you like to know?',
                },
              ],
            });
            return;
          }
          const utterance = typeof msg.text === 'string' ? msg.text : '';
          const normalized = utterance.toLocaleLowerCase();
          const room = normalized.includes('data science hod')
            ? { id: 'sf-b-201', code: 'B-201', name: 'CSE (Data Science) HOD Room', floor_id: 'SF', floor_name: 'Second Floor', block_code: 'B', block_id: 'SF-B' }
            : normalized.includes('library')
              ? { id: 'gf-c-003', code: 'C-003', name: 'Library & Information Center', floor_id: 'GF', floor_name: 'Ground Floor', block_code: 'C', block_id: 'GF-C' }
              : normalized.includes('principal')
                ? { id: 'gf-b-004', code: 'B-004', name: 'Principal Office', floor_id: 'GF', floor_name: 'Ground Floor', block_code: 'B', block_id: 'GF-B' }
                : null;
          const wantsNavigation = /\b(where|ellide|kaha|ekkada|enge|evide)\b/.test(normalized)
            || /[ಎಎಹತಕದ][^ ]*|कहाँ|ఎక్కడ|எங்கே|എവിടെ/.test(utterance);
          const isWhoHod = normalized.includes('who is') && normalized.includes('hod');
          if (isWhoHod) {
            MockClaraWebSocket.navigationTurnCount += 1;
            const turnId = `hod-${MockClaraWebSocket.navigationTurnCount}`;
            this.emit(5, {
              turn_id: turnId,
              isProcessing: false,
              isSpeaking: false,
              audioPending: false,
              audioUnavailable: true,
              thinking_audio_failed: true,
              showCard: 'hod',
              targetDepartment: 'cse_ds',
              messages: [
                { id: `user-${turnId}`, role: 'user', text: utterance },
                { id: `answer-${turnId}`, role: 'clara', text: 'Data Science HOD profile.' },
              ],
            });
            return;
          }
          if (room && wantsNavigation) {
            MockClaraWebSocket.navigationTurnCount += 1;
            const turnId = `navigation-${MockClaraWebSocket.navigationTurnCount}`;
            const narration: Record<string, string> = {
              English: `Showing directions to ${room.name}.`,
              Kannada: `${room.name}ಗೆ ದಾರಿ ತೋರಿಸುತ್ತಿದ್ದೇನೆ.`,
              Hindi: `${room.name} का रास्ता दिखा रही हूँ।`,
              Telugu: `${room.name}కి దారి చూపిస్తున్నాను.`,
              Tamil: `${room.name} நோக்கி வழிகாட்டுகிறேன்.`,
              Malayalam: `${room.name} ലേക്കുള്ള വഴി കാണിക്കുന്നു.`,
            };
            const text = narration[MockClaraWebSocket.selectedLanguage] ?? narration.English;
            this.emit(5, {
              turn_id: turnId,
              isProcessing: false,
              isSpeaking: false,
              audioPending: false,
              audioUnavailable: true,
              thinking_audio_failed: true,
              showCard: 'campus_navigation',
              campusDestination: room,
              assistantText: text,
              spokenText: text,
              messages: [
                { id: `user-${turnId}`, role: 'user', text: utterance },
                { id: `answer-${turnId}`, role: 'clara', text },
              ],
            });
            return;
          }
          if (msg.text === 'library services') {
            this.emit(5, {
              turn_id: 'library-answer',
              isProcessing: true,
              isSpeaking: false,
              audioPending: false,
              messages: [{ id: 'user-library', role: 'user', text: 'library services' }],
            });
            window.setTimeout(() => this.emit(5, normalAnswerPayload), 80);
            return;
          }
          if (msg.text === 'need guidance') {
            this.emit(5, { turn_id: 'choice-answer', isProcessing: true, isSpeaking: false, messages: [] });
            window.setTimeout(() => this.emit(5, choiceAnswerPayload), 80);
            return;
          }
          if (typeof msg.text === 'string' && msg.text.startsWith('visual demo ')) {
            const type = msg.text.slice('visual demo '.length) as keyof typeof visualDemoModels;
            const model = visualDemoModels[type];
            if (model) {
              MockClaraWebSocket.visualTurnCount += 1;
              const visualTurnId = `visual-${type}-${MockClaraWebSocket.visualTurnCount}`;
              this.emit(5, {
                turn_id: visualTurnId,
                isProcessing: false,
                isSpeaking: false,
                audioPending: false,
                audioUnavailable: true,
                thinking_audio_failed: true,
                showCard: null,
                messages: [
                  { id: `user-${visualTurnId}`, role: 'user', text: msg.text },
                  {
                    id: `answer-${visualTurnId}`,
                    role: 'clara',
                    text: model.summary,
                    answerPresentation: { schemaVersion: 1, type, eyebrow: 'CLARA', ...model },
                  },
                ],
              });
              return;
            }
          }
          if (typeof msg.text === 'string' && msg.text.startsWith('visual script ')) {
            const language = msg.text.slice('visual script '.length) as keyof typeof scriptDemoModels;
            const model = scriptDemoModels[language];
            if (model) {
              MockClaraWebSocket.visualTurnCount += 1;
              const visualTurnId = `visual-script-${language}-${MockClaraWebSocket.visualTurnCount}`;
              const summary = model.points.join(' ');
              this.emit(5, {
                turn_id: visualTurnId,
                isProcessing: false,
                isSpeaking: false,
                audioPending: false,
                audioUnavailable: true,
                thinking_audio_failed: true,
                showCard: null,
                messages: [
                  { id: `user-${visualTurnId}`, role: 'user', text: msg.text },
                  {
                    id: `answer-${visualTurnId}`,
                    role: 'clara',
                    text: summary,
                    answerPresentation: { schemaVersion: 1, type: 'INFO_CARD', eyebrow: 'CLARA', title: model.title, summary, points: model.points, highlights: [], choices: [] },
                  },
                ],
              });
              return;
            }
          }
          this.emit(5, documentsPayload);
          window.setTimeout(() => this.emit(5, documentsAudioPayload), 120);
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
          if (payload && typeof payload === 'object' && (payload as { showCard?: string }).showCard === 'campus_navigation') {
            const stateWindow = window as unknown as { __CLARA_NAV_PAYLOADS?: unknown[] };
            stateWindow.__CLARA_NAV_PAYLOADS = [...(stateWindow.__CLARA_NAV_PAYLOADS ?? []), payload];
          }
          if (payload && typeof payload === 'object' && (payload as { type?: string }).type === 'assistant_audio_update') {
            (window as unknown as { __CLARA_AUDIO_UPDATE_SEEN?: boolean }).__CLARA_AUDIO_UPDATE_SEEN = true;
          }
          this.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({ state, payload }),
            })
          );
        }, 0);
      }
    }

    window.WebSocket = MockClaraWebSocket as unknown as typeof WebSocket;
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
  await expect(
    page.getByText(
      /May I know your preferred name\?|ನಿಮ್ಮ ಆತ್ಮೀಯ ಹೆಸರನ್ನು|आपका नाम|உங்கள் பெயரை|మీ పేరు|നിങ്ങളുടെ പേരറിയാമോ/i
    )
  ).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => typeof window.__CLARA_TEST_SEND_MESSAGE === 'function');
  await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Alex'));
  await expect(
    page.getByText(/Wonderful|ready to help|What would you like|सहायता|ಸಹಾಯ|உதவ|సహాయం|സഹായ/i)
  ).toBeVisible({ timeout: 15000 });
}

test.describe('CLARA chat flow', () => {
  test.beforeEach(async ({ page }) => {
    await installMockClaraSocket(page);
  });

  test('Sleep -> Language -> Chat (no menu) shows greeting then orb after language', async ({ page }) => {
    await page.goto('http://localhost:5176/?e2e=1');

    await wakeFromSleep(page);

    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
    // Orb stays hidden through greeting / language picker.
    await expect(page.getByTestId('chat-orb')).toHaveCount(0);
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);

    await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Voice input|Tap to speak/i })).toBeVisible();
  });

  test('URL ?state=5 shows chat screen with greeting (no language gate)', async ({ page }) => {
    await page.goto('http://localhost:5176/?state=5&e2e=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Good (morning|afternoon|evening)|I am CLARA|selectLanguage|Select Language/i)
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-results/chat-screen-verified.png', fullPage: true });
  });

  test('Keyboard wake reaches language then chat', async ({ page }) => {
    await page.goto('http://localhost:5176/?e2e=1', { waitUntil: 'networkidle' });
    await wakeFromSleep(page);

    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 10000 });
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);

    await expect(page.getByRole('button', { name: /Voice input|Tap to speak/i })).toBeVisible();
  });

  test('English text query shows assistant result and reset returns to sleep', async ({ page }) => {
    // Wake → language → guest name → documents card is slower than the suite's 15s default.
    test.setTimeout(120_000);
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);

    await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);

    await expect(page.getByRole('button', { name: /Voice input|Tap to speak/i })).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('admission documents'));

    await expect(page.getByTestId('documents-block')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/10th Marks Card/i)).toBeVisible();
    await page.waitForFunction(() => Boolean((window as unknown as { __CLARA_AUDIO_UPDATE_SEEN?: boolean }).__CLARA_AUDIO_UPDATE_SEEN));

    await page.getByTestId('home-button').click();
    await expect(page.getByTestId('sleep-screen')).toBeVisible({ timeout: 10000 });
  });

  test('normal successful answer renders a visual card and keeps the shared orb', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('library services'));

    const card = page.locator('[data-presentation-type="INFO_CARD"]');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText('The library has reference books.');
    await expect(page.getByTestId('chat-orb')).toBeVisible();
  });

  test('choice tap returns through the existing user-message pipeline', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('need guidance'));
    const choice = page.getByRole('button', { name: 'Documents', exact: true });
    await expect(choice).toBeVisible({ timeout: 15_000 });
    await choice.click();
    await expect(page.getByTestId('documents-block')).toBeVisible({ timeout: 20_000 });
  });

  test('all adaptive card families remain scrollbar-free in the short kiosk viewport', async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 1920, height: 856 });
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await selectInlineLanguage(page, 'english');
    await completeInlineGuestNameGate(page);

    const types = ['INFO_CARD', 'GENERIC_ANSWER_CARD', 'LIST_CARD', 'STEP_CARD', 'STATS_CARD', 'CHOICE_CARD'] as const;
    for (const type of types) {
      await page.evaluate((query) => window.__CLARA_TEST_SEND_MESSAGE?.(query), `visual demo ${type}`);
      const card = page.locator(`[data-presentation-type="${type}"]`);
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.clara-thinking-overlay')).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.faq-carousel-shell-full')).toBeVisible({ timeout: 15_000 });
      const metrics = await card.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const orb = document.querySelector('[data-testid="chat-orb"]')?.getBoundingClientRect();
        const suggestions = document.querySelector('.faq-carousel-shell-full')?.getBoundingClientRect();
        return {
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          overflowY: getComputedStyle(element).overflowY,
          top: rect.top,
          bottom: rect.bottom,
          viewportHeight: window.innerHeight,
          overlapsOrb: Boolean(orb && rect.bottom > orb.top),
          overlapsSuggestions: Boolean(suggestions && rect.bottom > suggestions.top),
          documentScrollHeight: document.documentElement.scrollHeight,
        };
      });
      expect(metrics.overflowY).not.toMatch(/auto|scroll/);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
      expect(metrics.top).toBeGreaterThanOrEqual(0);
      expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight);
      expect(metrics.overlapsOrb).toBe(false);
      expect(metrics.overlapsSuggestions).toBe(false);
      expect(metrics.documentScrollHeight).toBe(metrics.viewportHeight);
      await page.screenshot({ path: `test-results/adaptive-${type.toLowerCase()}-1920x856.png`, fullPage: true });

      const next = page.getByRole('button', { name: 'Next page' });
      if (await next.isVisible()) {
        await next.click();
        await expect(card).toHaveAttribute('data-card-page', '2');
        if (type === 'INFO_CARD') {
          await page.waitForTimeout(300);
          await page.screenshot({ path: 'test-results/adaptive-info-card-page-2-1920x856.png', fullPage: true });
        }
      }
    }

    for (const viewport of [{ width: 1600, height: 720 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('visual demo INFO_CARD'));
      const card = page.locator('[data-presentation-type="INFO_CARD"]');
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.clara-thinking-overlay')).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(150);
      const layout = await card.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const orb = document.querySelector('[data-testid="chat-orb"]')?.getBoundingClientRect();
        const suggestions = document.querySelector('.faq-carousel-shell-full')?.getBoundingClientRect();
        return {
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          overflowY: getComputedStyle(element).overflowY,
          top: rect.top,
          bottom: rect.bottom,
          viewportHeight: window.innerHeight,
          overlapsOrb: Boolean(orb && rect.bottom > orb.top),
          overlapsSuggestions: Boolean(suggestions && rect.bottom > suggestions.top),
        };
      });
      expect(layout.overflowY).not.toMatch(/auto|scroll/);
      expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
      expect(layout.top).toBeGreaterThanOrEqual(0);
      expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight);
      expect(layout.overlapsOrb).toBe(false);
      expect(layout.overlapsSuggestions).toBe(false);
      await page.screenshot({ path: `test-results/adaptive-info-${viewport.width}x${viewport.height}.png`, fullPage: true });
    }
  });

  for (const language of ['english', 'kannada', 'hindi', 'tamil', 'telugu', 'malayalam']) {
    test(`language selection reaches ready chat for ${language}`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width: 1920, height: 856 });
      await page.goto('http://localhost:5176/?e2e=1');
      await wakeFromSleep(page);

      await expect(page.getByTestId('chat-screen')).toBeVisible({ timeout: 15000 });
      await selectInlineLanguage(page, language);
      await completeInlineGuestNameGate(page);

      await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15000 });
      await page.evaluate((query) => window.__CLARA_TEST_SEND_MESSAGE?.(query), `visual script ${language}`);
      const card = page.locator('[data-presentation-type="INFO_CARD"]');
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.clara-thinking-overlay')).toHaveCount(0, { timeout: 15_000 });
      await expect(page.getByTestId('chat-orb')).toBeVisible({ timeout: 15_000 });
      const code = ({ english: 'en', kannada: 'kn', hindi: 'hi', tamil: 'ta', telugu: 'te', malayalam: 'ml' } as const)[language as 'english' | 'kannada' | 'hindi' | 'tamil' | 'telugu' | 'malayalam'];
      await expect(card).toHaveClass(new RegExp(`script-typo-${code}`));
      const metrics = await card.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflowY: getComputedStyle(element).overflowY,
      }));
      expect(metrics.overflowY).not.toMatch(/auto|scroll/);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
      await page.screenshot({ path: `test-results/adaptive-language-${language}-1920x856.png`, fullPage: true });
    });
  }

  test('Kannada canonical navigation repeats, transitions to HOD card, and returns to navigation', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1920, height: 856 });
    await page.goto('http://localhost:5176/?e2e=1');
    await wakeFromSleep(page);
    await selectInlineLanguage(page, 'kannada');
    await completeInlineGuestNameGate(page);

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('principal cabin ellide'));
    await expect(page.locator('.split-cards-layout--campus-map-and-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.campus-direction-card h3')).toContainText('B-004');
    await expect(page.locator('.campus-direction-steps')).toContainText(/[\u0C80-\u0CFF]/);
    await expect(page.getByTestId('campus-nav-orb-slot')).toBeVisible();
    await expect(page.getByTestId('chat-orb')).toBeVisible();

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('data science HOD ellide'));
    await expect.poll(() => page.evaluate(() => {
      const rows = (window as unknown as { __CLARA_NAV_PAYLOADS?: Array<{ campusDestination?: { code?: string } }> }).__CLARA_NAV_PAYLOADS ?? [];
      return rows.at(-1)?.campusDestination?.code ?? '';
    })).toBe('B-201');
    await expect(page.locator('.campus-direction-card h3')).toContainText('B-201', { timeout: 15_000 });
    await expect(page.locator('.campus-nav-floor-tabs [aria-selected="true"]')).toContainText('ಎರಡನೇ ಮಹಡಿ');

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('Who is Data Science HOD?'));
    await expect(page.getByTestId('hod-card')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.split-cards-layout--campus-map-and-panel')).toHaveCount(0);

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('library ellide'));
    await expect(page.locator('.split-cards-layout--campus-map-and-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.campus-direction-card h3')).toContainText('C-003');
    await expect(page.locator('.campus-nav-floor-tabs [aria-selected="true"]')).toContainText('ನೆಲ ಮಹಡಿ');

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('visual script kannada'));
    await expect(page.locator('[data-presentation-type="INFO_CARD"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.split-cards-layout--campus-map-and-panel')).toHaveCount(0);
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('principal cabin ellide'));
    await expect(page.locator('.campus-direction-card h3')).toContainText('B-004', { timeout: 15_000 });

    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('need guidance'));
    await expect(page.locator('[data-presentation-type="CHOICE_CARD"]')).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => window.__CLARA_TEST_SEND_MESSAGE?.('library ellide'));
    await expect(page.locator('.campus-direction-card h3')).toContainText('C-003', { timeout: 15_000 });
    await page.screenshot({ path: 'test-results/campus-navigation-kannada.png', fullPage: true });
  });

  for (const scenario of [
    { language: 'english', query: 'where is principal office', code: 'B-004', directionScript: /Start from the main entrance/, narrationScript: /Showing directions/ },
    { language: 'hindi', query: 'principal office kaha hai', code: 'B-004', directionScript: /[\u0900-\u097F]/, narrationScript: /[\u0900-\u097F]/ },
    { language: 'telugu', query: 'library ఎక్కడ ఉంది', code: 'C-003', directionScript: /[\u0C00-\u0C7F]/, narrationScript: /[\u0C00-\u0C7F]/ },
    { language: 'tamil', query: 'principal office எங்கே', code: 'B-004', directionScript: /[\u0B80-\u0BFF]/, narrationScript: /[\u0B80-\u0BFF]/ },
    { language: 'malayalam', query: 'library എവിടെയാണ്', code: 'C-003', directionScript: /[\u0D00-\u0D7F]/, narrationScript: /[\u0D00-\u0D7F]/ },
  ]) {
    test(`${scenario.language} session keeps localized directions and narration for mixed navigation`, async ({ page }) => {
      test.setTimeout(45_000);
      await page.setViewportSize({ width: 1920, height: 856 });
      await page.goto('http://localhost:5176/?e2e=1');
      await wakeFromSleep(page);
      await selectInlineLanguage(page, scenario.language);
      await completeInlineGuestNameGate(page);
      await page.evaluate((query) => window.__CLARA_TEST_SEND_MESSAGE?.(query), scenario.query);

      await expect(page.locator('.split-cards-layout--campus-map-and-panel')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.campus-direction-card h3')).toContainText(scenario.code);
      await expect(page.locator('.campus-direction-steps')).toContainText(scenario.directionScript);
      const spoken = await page.evaluate(() => {
        const rows = (window as unknown as { __CLARA_NAV_PAYLOADS?: Array<{ spokenText?: string }> }).__CLARA_NAV_PAYLOADS ?? [];
        return rows.at(-1)?.spokenText ?? '';
      });
      expect(spoken).toMatch(scenario.narrationScript);
      await expect(page.getByTestId('chat-orb')).toBeVisible();
      await page.screenshot({ path: `test-results/campus-navigation-${scenario.language}.png`, fullPage: true });
    });
  }
});
