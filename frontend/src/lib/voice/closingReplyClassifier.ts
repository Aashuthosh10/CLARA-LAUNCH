/**
 * Deterministic CLOSE / CONTINUE classifier for the post-answer closing question.
 * No LLM. Multilingual + romanized cues; fail closed to AMBIGUOUS.
 */

export type ClosingReplyClass = 'CLOSE' | 'CONTINUE' | 'AMBIGUOUS';

const CLOSE_CUES: readonly string[] = [
  // English
  'no',
  'no thanks',
  'no thank you',
  "that's all",
  'thats all',
  "that's it",
  'thats it',
  'nothing else',
  "i'm good",
  'im good',
  'i am good',
  'thank you',
  'thanks',
  'bye',
  'goodbye',
  'good bye',
  'all good',
  'nothing',
  'done',
  // Hindi / romanized
  'nahi',
  'nahin',
  'nahī',
  'bas',
  'bas itna',
  'shukriya',
  'dhanyavad',
  'alvida',
  'नहीं',
  'नही',
  'बस',
  'शुक्रिया',
  'धन्यवाद',
  'अलविदा',
  // Kannada / romanized
  'illa',
  'beda',
  'saaku',
  'saku',
  'dhanyavada',
  'ಇಲ್ಲ',
  'ಬೇಡ',
  'ಸಾಕು',
  'ಧನ್ಯವಾದ',
  // Tamil / romanized
  'illa',
  'vendam',
  'podhum',
  'nandri',
  'இல்லை',
  'வேண்டாம்',
  'போதும்',
  'நன்றி',
  // Telugu / romanized
  'ledu',
  'vaddu',
  'chalu',
  'dhanyavadalu',
  'లేదు',
  'వద్దు',
  'చాలు',
  'ధన్యవాదాలు',
  // Malayalam / romanized
  'illa',
  'venda',
  'mathi',
  'nanni',
  'ഇല്ല',
  'വേണ്ട',
  'മതി',
  'നന്ദി',
];

const CONTINUE_CUES: readonly string[] = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'of course',
  'yes please',
  'please',
  'ok',
  'okay',
  'haan',
  'ha',
  'han',
  'ji',
  'haaji',
  'हो',
  'हाँ',
  'हां',
  'जी',
  'हाजी',
  'howto',
  'houdu',
  'ಹೌದು',
  'ಹಾ',
  'aama',
  'aam',
  'ஆமா',
  'ஆம்',
  'avunu',
  'అవును',
  'athe',
  'അതെ',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    // Drop combining marks so नहीं / नही share a skeleton.
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cueMatches(hay: string, cue: string): boolean {
  const c = normalize(cue);
  if (!c || !hay) return false;
  if (hay === c) return true;
  // Latin/romanized: prefer token boundaries. Indic scripts: substring.
  if (/^[\x00-\x7F]+$/.test(c)) {
    return new RegExp(`(?:^|\\s)${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(hay);
  }
  return hay.includes(c);
}

/**
 * If the utterance starts with a continue cue then adds a real request
 * (e.g. "Yeah, tell me about AIML."), return the residual request text.
 */
export function stripLeadingContinue(text: string): string | null {
  const hay = normalize(text);
  if (!hay) return null;
  const sorted = [...CONTINUE_CUES].sort((a, b) => b.length - a.length);
  for (const cue of sorted) {
    const c = cue.toLowerCase();
    if (hay === c) return '';
    if (hay.startsWith(c + ' ')) {
      return hay.slice(c.length).trim();
    }
  }
  return null;
}

export function classifyClosingReply(text: string): ClosingReplyClass {
  const hay = normalize(text);
  if (!hay) return 'AMBIGUOUS';

  // Direct request after soft yes: "yeah tell me about aiml"
  const residual = stripLeadingContinue(text);
  if (residual !== null && residual.length > 0) {
    return 'CONTINUE';
  }

  let closeHit = false;
  let continueHit = false;
  for (const cue of CLOSE_CUES) {
    if (cueMatches(hay, cue)) {
      closeHit = true;
      break;
    }
  }
  for (const cue of CONTINUE_CUES) {
    if (cueMatches(hay, cue)) {
      continueHit = true;
      break;
    }
  }

  if (closeHit && !continueHit) return 'CLOSE';
  if (continueHit && !closeHit) return 'CONTINUE';
  if (closeHit && continueHit) return 'AMBIGUOUS';

  // Longer non-cue text after closing prompt is treated as a new request.
  if (hay.split(' ').length >= 3 || hay.length >= 12) {
    return 'CONTINUE';
  }
  return 'AMBIGUOUS';
}
