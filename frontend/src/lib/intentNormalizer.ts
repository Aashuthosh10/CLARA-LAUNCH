export type NormalizedIntent = {
  trigger: 'course_menu' | 'department_overview' | null;
  departmentLabel?: string;
};

// Map of intents to an array of multilingual keywords that signify them.
const INTENT_MAP = {
  course_menu: [
    // English
    'courses', 'programs', 'degrees', 'what do you offer', 'academic options',
    // Kannada
    'ಕೋರ್ಸ್', 'ಪಠ್ಯಕ್ರಮ', 'ಕಾಲೇಜು ಕೋರ್ಸುಗಳು', 'ಯಾವ ಕೋರ್ಸ್',
    // Hindi
    'कोर्स', 'पाठ्यक्रम', 'कोर्सेस',
    // Tamil
    'பாடநெறி', 'படிப்புகள்',
    // Telugu
    'కోర్సు', 'కోర్సులు',
    // Malayalam
    'കോഴ്സുകൾ', 'കോഴ്സ്'
  ],
};

// Map of departments to their standard internal labels, indexed by multilingual keyword triggers.
const DEPT_MAP: Record<string, string[]> = {
  'Data Science': [
    'data science', 'ಡೇಟಾ ಸೈನ್ಸ್', 'ಡೇಟಾ', 'डेटा साइंस', 'डेटा', 'டேட்டா சயின்ஸ்', 'டேட்டா', 'డేటా సైన్స్', 'ഡാറ്റ സയൻസ്'
  ],
  'CSE': [
    'computer science', 'cse', 'ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್', 'ಸಿಎಸ್ಇ', 'कंप्यूटर साइंस', 'கணினி அறிவியல்', 'కంప్యూటర్ సైన్స్', 'കമ്പ്യൂട്ടർ സയൻസ്', 'cs'
  ],
  'ECE': [
    'electronics', 'ece', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್', 'ಇಸಿಇ', 'इलेक्ट्रॉनिक्स', 'எலெக்ட்ரானிக்ஸ்', 'ఎలక్ట్రానిక్స్', 'ഇലക്ട്രോണിക്സ്', 'communication'
  ],
  'ISE': [
    'information science', 'ise', 'ಮಾಹಿತಿ ವಿಜ್ಞಾನ', 'ಐಎಸ್ಇ', 'ಇನ್ಫರ್ಮೇಷನ್ ಸೈನ್ಸ್', 'इन्फॉर्मेशन साइंस', 'தகவல் அறிவியல்', 'ఇన్ఫర్మేషన్ సైన్స్', 'ഇൻഫർമേഷൻ സയൻസ്'
  ],
  'Mechanical': [
    'mechanical', 'ಮೆಕ್ಯಾನಿಕಲ್', 'मैकेनिकल', 'மெக்கானிக்கல்', 'మెకానికల్', 'മെക്കാനിക്കൽ', 'mech'
  ],
  'Civil': [
    'civil', 'ಸಿವಿಲ್', 'सिविल', 'சிவில்', 'సివిల్', 'സിവിൽ'
  ],
  'AIML': [
    'aiml', 'artificial intelligence', 'ai and ml', 'ai ml', 'ಎಐ ಎಂಎಲ್', 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ', 'एआई एमएल', 'कृत्रिम बुद्धिमत्ता', 'செயற்கை நுண்ணறிவு', 'ఆర్టిఫిషియల్ ఇంటెలిజెన్స్', 'ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ്'
  ],
  'Cyber Security': [
    'cyber security', 'cyber', 'ಸೈಬರ್ ಭದ್ರತೆ', 'ಸೈಬರ್', 'साइबर नेटवर्किंग', 'साइबर सिक्योरिटी', 'சைபர் செக்யூரிட்டி', 'సైబర్ సెక్యూరిటీ', 'സൈബർ സുരക്ഷ'
  ],
  'MBA': [
    'mba', 'business', 'management', 'masters in business', 'ಎಂಬಿಎ', 'ವ್ಯಾಪಾರ', 'എം.ബി.എ', 'எம்.பி.ஏ', 'ఎంబీఏ', 'एमबीए'
  ]
};

export type InternalIntent = 'COURSE_LIST' | 'DEPARTMENT_INFO' | 'DEPARTMENT_COMPARE' | 'UNKNOWN';

/**
 * Detects abstract user intents (deterministic UI triggers)
 */
function detectIntent(normalized: string, entityCount: number): InternalIntent {
  let isCourseListTriggered = false;
  for (const phrase of INTENT_MAP.course_menu) {
    if (normalized.includes(phrase.toLowerCase())) {
      isCourseListTriggered = true;
      break;
    }
  }

  // RULE 4 - Comparison detected -> Transition to TEXT-ONLY
  if (entityCount > 1 || normalized.includes('compare') || normalized.includes('difference') || normalized.includes(' vs ')) {
    return 'DEPARTMENT_COMPARE';
  }

  // Intent decided by entity presence or core keyword
  if (entityCount === 1) return 'DEPARTMENT_INFO';
  if (isCourseListTriggered) return 'COURSE_LIST';

  return 'UNKNOWN';
}

/**
 * Detects specific department entities across multiple languages
 */
function detectEntities(normalized: string): string[] {
  const matched: string[] = [];
  for (const [deptLabel, keywords] of Object.entries(DEPT_MAP)) {
    for (const phrase of keywords) {
      if (normalized.includes(phrase.toLowerCase())) {
        matched.push(deptLabel);
        break; 
      }
    }
  }
  return matched;
}

/**
 * Sweeps a raw string transcript against the multilingual dictionary using Intent + Entity architecture.
 */
export function normalizeIntent(input: string): NormalizedIntent {
  const normalized = input.toLowerCase();

  // 1. Entity Extraction
  const entities = detectEntities(normalized);

  // 2. Intent Classification
  const intent = detectIntent(normalized, entities.length);

  // 3. Response Decision Matrix

  // CASE 4 — COMPARE -> No card
  if (intent === 'DEPARTMENT_COMPARE') {
    return { trigger: null };
  }

  // CASE 2 — DEPARTMENT INFO -> Entity-locked Card
  if (intent === 'DEPARTMENT_INFO' && entities.length === 1) {
    return {
      trigger: 'department_overview',
      departmentLabel: entities[0]
    };
  }

  // CASE 3 — COURSE LIST -> Course Grid
  if (intent === 'COURSE_LIST') {
    return {
      trigger: 'course_menu'
    };
  }

  return { trigger: null };
}
