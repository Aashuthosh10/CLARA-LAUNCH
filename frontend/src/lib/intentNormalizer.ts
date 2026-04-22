export type NormalizedIntent = {
  trigger: 'course_menu' | 'department_overview' | 'hod' | 'admissions' | 'placements' | 'department_fees' | 'documents' | null;
  type?: 'department_click';
  departmentLabel?: string;
};

// Multilingual mapping for intent-carrying keywords to English canonical terms.
// This acts as a normalization layer before intent detection.
const MULTILINGUAL_TOKEN_MAP: Record<string, string> = {
  // Kannada
  'ಕೋರ್ಸ್': 'course', 'ಪಠ್ಯಕ್ರಮ': 'courses', 'ವಿಭಾಗ': 'department', 'ಬಗ್ಗೆ': 'about', 'ಯಾರು': 'who',
  'ಮಾಹಿತಿ': 'information', 'ಪ್ರವೇಶ': 'admission', 'ಶುಲ್ಕ': 'fee', 'ಉದ್ಯೋಗ': 'placement',
  // Hindi
  'कोर्स': 'course', 'पाठ्यक्रम': 'courses', 'विभाग': 'department', 'बारे में': 'about', 'कौन': 'who',
  'जानकारी': 'information', 'प्रवेश': 'admission', 'फीस': 'fee', 'नौकरी': 'placement',
  // Tamil
  'பாடநெறி': 'course', 'துறை': 'department', 'பற்றி': 'about', 'யார்': 'who',
  'தகவல்': 'information', 'சேர்க்கை': 'admission', 'கட்டணம்': 'fee', 'வேலைவாய்ப்பு': 'placement',
  // Telugu
  'కోర్సు': 'course', 'విభాగం': 'department', 'గురించి': 'about', 'ఎవరు': 'who',
  'ప్రవేశం': 'admission', 'ఫీజు': 'fee', 'ఉద్యోగ': 'placement',
  // Malayalam
  'കോഴ്സ്': 'course', 'വിഭാഗം': 'department', 'കുറിച്ച്': 'about', 'ആരാണ്': 'who',
  'വിവരങ്ങൾ': 'information', 'പ്രവേശനം': 'admission', 'ഫീസ്': 'fee', 'ജോലി': 'placement'
  ,
  // Common transliterated Kannada/Hinglish tokens
  'yaav': 'which',
  'yaava': 'which',
  'yav': 'which',
  'alli': 'in',
  'ali': 'in',
  'aithe': 'available',
  'ide': 'available',
  'ideya': 'available',
  'estu': 'how much',
  'eshtu': 'how much',
  'du': ''
};

/**
 * Normalizes multilingual input by replacing local keywords with English equivalents.
 */
function normalizeToEnglish(input: string): string {
  let normalized = input.toLowerCase();
  for (const [local, english] of Object.entries(MULTILINGUAL_TOKEN_MAP)) {
    // Global replacement for simple token mapping
    normalized = normalized.split(local).join(english);
  }
  return normalized;
}

// Map of intents to an array of multilingual keywords that signify them.
const INTENT_MAP = {
  documents: [
    'document', 'documents', 'documents required', 'admission documents',
    'document bagge', 'documents beku', 'dakhalegalu',
    'document kya chahiye', 'documents kaunse', 'admission ke documents',
    'documents enna venum', 'documents enti', 'documents entha', 'documents kurich'
  ],
  course_menu: [
    // English
    'courses', 'programs', 'degrees', 'what do you offer', 'academic options',
    // Kannada
    'ಕೋರ್ಸ್', 'ಪಠ್ಯಕ್ರಮ', 'ಕಾಲೇಜು ಕೋರ್ಸುಗಳು', 'ಯಾವ ಕೋರ್ಸ್',
    // Hindi
    'कोर्स', 'पाठ्यक्रम', 'कोर्सेस', 'विषय', 'शिक्षा', 'डिग्री',
    // Tamil
    'பாடநெறி', 'படிப்புகள்', 'கல்வி',
    // Telugu
    'కోర్సు', 'కోర్సులు', 'చదువు',
    // Malayalam
    'കോഴ്സുകൾ', 'കോഴ്സ്', 'പഠനം',
    // Transliteration phrases
    'college ali yaav courses ide',
    'college ali yaav yaav departments aithe',
    'what departments are there',
    'which departments are available',
    'departments in college',
    'department list'
  ],
  fees: [
    // English
    'fee', 'fees', 'tuition', 'management quota',
    // Kannada
    'ಶುಲ್ಕ', 'ಶುಲ್ಕಗಳು',
    // Hindi
    'फीस', 'शुल्क',
    // Tamil
    'கட்டணம்', 'கட்டணங்கள்',
    // Telugu
    'ఫీజు', 'ఫీజులు',
    // Malayalam
    'ഫീസ്'
  ],
  hod: [
    // English
    'hod', 'head', 'department head', 'who is leading',
    // Kannada
    'ಮುಖ್ಯಸ್ಥ', 'ಹೆಚ್ಒಡಿ', 'ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥ',
    // Hindi
    'विभागाध्यक्ष', 'एचओडी', 'प्रमुख', 'अध्यक्ष', 'कौन है', 'कौन हैं', 'बारे में', 'जानकारी', 'हेड',
    // Tamil
    'தலைவர்', 'துறைத் தலைவர்', 'ஹெச்ஓடி', 'தலைமை',
    // Telugu
    'అధ్యాపకులు', 'హెచ్ఓడి', 'ప్రధానాచార్యులు', 'ముఖ్యాధికారి',
    // Malayalam
    'വിഭാഗം മേധാവി', 'എച്ച്ഒഡി', 'തലവൻ'
  ],
  admissions: [
    // English
    'admission', 'fee', 'how to join', 'joining', 'enrollment', 'how much is the fee',
    // Kannada
    'ಪ್ರವೇಶ', 'ಶುಲ್ಕ', 'ಸೇರುವುದು ಹೇಗೆ', 'ಅಡ್ಮಿಷನ್',
    // Hindi
    'प्रवेश', 'फीस', 'नामांकन', 'दाखिला', 'जानकारी',
    // Tamil
    'சேர்க்கை', 'கட்டணம்', 'தகவல்',
    // Telugu
    'ప్రవేశం', 'ఫీజులు', 'వివరాలు',
    // Malayalam
    'പ്രവേശനം', 'ഫീസ്', 'വിവരങ്ങൾ'
  ],
  placements: [
    // English
    'placement', 'job', 'salary', 'recruitment', 'training', 'companies',
    // Kannada
    'ಪ್ಲೇಸ್‌ಮೆಂಟ್', 'ಕೆಲಸ', 'ಉದ್ಯೋಗ', 'ಕಂಪನಿಗಳು',
    // Hindi
    'प्लेसमेंट', 'नौकरी', 'वेतन', 'कोर्स पूरा होने के बाद',
    // Tamil
    'வேலைவாய்ப்பு', 'பணி',
    // Telugu
    'ప్లేస్‌మెంట్', 'ఉద్యోగ',
    // Malayalam
    'പ്ലേസ്‌മെന്റ്', 'ജോലി'
  ]
};

// Map of departments to their standard internal labels, indexed by multilingual keyword triggers.
const DEPT_MAP: Record<string, string[]> = {
  'CSE (Data Science)': [
    'data science', 'datascience', 'cse data science', 'cse datascience', 'ಡೇಟಾ ಸೈನ್ಸ್', 'ಡೇಟಾ', 'डेटा साइंस', 'डेटा', 'डाटा साइंस', 'डाटा', 'डेटा विज्ञान', 'डेटासाइंस', 'डाटासाइंस', 'डिएस', 'डीएस', 'डिजिटल साइंस', 'डिजिटल'
  ],
  'CSE': [
    'computer science', 'cse', 'ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್', 'ಸಿಎಸ್ಇ', 'कंप्यूटर साइंस', 'कम्प्यूटर विज्ञान', 'सीएसई', 'सीएस इ', 'कम्प्यूटर साइंस', 'सीएसई', 'कंप्यूटर इंजीनियरिंग', 'कंप्यूटरसाइंस', 'कम्प्यूटरसाइंस', 'कंप्यूटर सायंस', 'कंप्यूटर विज्ञान', 'कम्प्यूटर सायंस'
  ],
  'ECE': [
    'electronics', 'ece', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್', 'ಇಸಿಇ', 'इलेक्ट्रॉनिक्स', 'ईसीई', 'ई सी ई', 'इलेक्ट्रॉनिक', 'ईसीई', 'इलेक्ट्रॉनिक्सइंजीनियरिंग', 'எலெக்ட்ரானிக்ஸ்', 'ஈசிஇ', 'ఎలక్ట్రానిక్స్', 'ఇసిఇ', 'ഇലക്ട്രോണിക്സ്', 'ഇസിഇ', 'communication'
  ],
  'ISE': [
    'information science', 'ise', 'ಮಾಹಿತಿ ವಿಜ್ಞಾನ', 'ಐಎಸ್ಇ', 'इन्फॉर्मेशन साइंस', 'आईएएसई', 'आई एस ई', 'इन्फोर्मेशन साइंस', 'आईटी', 'तगவல் அறிவியல்', 'ஐஎஸ்இ', 'ఇన్ఫర్మేషన్ సైన్స్', 'ఐఎస్ఈ', 'ഇൻഫർമേഷൻ സയൻസ്', 'ഐഎസ്ഇ'
  ],
  'Mechanical': [
    'mechanical', 'ಮೆಕ್ಯಾನಿಕಲ್', 'ಯಾಂತ್ರಿಕ', 'मैकेनिकल', 'मैकेनिकल इंजीनियरिंग', 'यांत्रिक', 'मैकेनिकल विभाग', 'मैकेनिकलइंजीनियरिंग', 'मैकेनिकल इंजिनियरिंग', 'यंत्र विज्ञान', 'मैक', 'मेक', 'மெக்கானிக்கல்', 'மெக்கானிக்கல் இன்ஜினியரிங்', 'இயந்திரவியல்', 'మెకానికల్', 'మెకానికల్ ఇంజనీరింగ్', 'యంత్రశాస్త్రం', 'മെക്കാനിക്കൽ', 'മെക്കാനിക്കൽ എഞ്ചിനീയറിംഗ്', 'യന്ത്രവിദ്യ', 'mech'
  ],
  'Civil': [
    'civil', 'ಸಿವಿಲ್', 'सिविल', 'सिविल इंजीनियरिंग', 'सिविल विभाग', 'सिविलइंजीनियरिंग', 'சிவில்', 'சிவில் இன்ஜினியரிங்', 'సివిల్', 'సివిల్ ఇంజనీరింగ్', 'സിവിൽ', 'സിവിൽ എഞ്ചിനീയറിംഗ്'
  ],
  'CSE (AI & ML)': [
    'aiml', 'artificial intelligence', 'ai and ml', 'ai ml', 'ಎಐ ಎಂಎಲ್', 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ', 'एआई एमएल', 'आर्टिफिशियल इंटेलिजेंस', 'एआई और एमएल', 'एआईएमएल', 'कृत्रिम बुद्धिमत्ता', 'आर्टिफिशियल', 'एआई'
  ],
  'CSE (Cyber Security)': [
    'cyber security', 'cyber', 'ಸೈಬರ್ ಭದ್ರತೆ', 'ಸೈಬರ್', 'साइबर सिक्योरिटी', 'साइबर सुरक्षा', 'साइबर', 'साइबरसिक्योरिटी', 'साइबरसुरक्षा', 'சைபர் செக்யூரிட்டி', 'சைபர் பாதுகாப்பு', 'సైబర్ సెక్యూరిటీ', 'సైబర్ భద్రత', 'సైబర్ സുരക്ഷ', 'സൈബർ'
  ],
  'MBA': [
    'mba', 'business', 'management', 'masters in business', 'ಎಂಬಿಎ', 'ವ್ಯಾಪಾರ', 'एमबीए', 'व्यापार', 'एमबीए विभाग', 'एबीए', 'എബീഎ', 'ബിസിനസ്', 'எம்.பி.ஏ', 'வணிகம்', 'ఎంబీఏ', 'వ్యాపారం'
  ]
};

/**
 * Priority override rules.
 * If a SPECIFIC department is matched, these GENERIC departments are removed.
 * This prevents "aiml" from also triggering "cse" via substring overlap.
 */
const PRIORITY_OVERRIDES: Record<string, string[]> = {
  // If AIML is matched, CSE must NOT also match (AIML is a CSE specialization)
  'CSE (AI & ML)': ['CSE'],
  // If Data Science is matched, CSE must NOT also match
  'CSE (Data Science)': ['CSE'],
  // If Cyber Security is matched, CSE must NOT also match
  'CSE (Cyber Security)': ['CSE'],
  // If ISE is matched, CSE must NOT also match
  'ISE': ['CSE'],
};

export type InternalIntent = 'COURSE_LIST' | 'DEPARTMENT_INFO' | 'DEPARTMENT_COMPARE' | 'HOD_INFO' | 'ADMISSIONS_GOTO' | 'PLACEMENTS_GOTO' | 'UNKNOWN';

/**
 * Detects abstract user intents (deterministic UI triggers)
 */
function detectIntent(normalized: string, entityCount: number): InternalIntent {
  let isDocumentsTriggered = false;
  for (const phrase of INTENT_MAP.documents) {
    if (normalized.includes(phrase.toLowerCase())) {
      isDocumentsTriggered = true;
      break;
    }
  }
  let isFeesTriggered = false;
  for (const phrase of INTENT_MAP.fees) {
    if (normalized.includes(phrase.toLowerCase())) {
      isFeesTriggered = true;
      break;
    }
  }

  let isCourseListTriggered = false;
  for (const phrase of INTENT_MAP.course_menu) {
    if (normalized.includes(phrase.toLowerCase())) {
      isCourseListTriggered = true;
      break;
    }
  }
  const hasDepartmentListCue =
    (normalized.includes('department') || normalized.includes('departments')) &&
    (
      normalized.includes('which') ||
      normalized.includes('what') ||
      normalized.includes('list') ||
      normalized.includes('available') ||
      normalized.includes('in college')
    );
  if (hasDepartmentListCue) {
    isCourseListTriggered = true;
  }

  let isHodTriggered = false;
  for (const phrase of INTENT_MAP.hod) {
    if (normalized.includes(phrase.toLowerCase())) {
      isHodTriggered = true;
      break;
    }
  }

  let isAdmissionsTriggered = false;
  for (const phrase of INTENT_MAP.admissions) {
    if (normalized.includes(phrase.toLowerCase())) {
        isAdmissionsTriggered = true;
      break;
    }
  }

  let isPlacementsTriggered = false;
  for (const phrase of INTENT_MAP.placements) {
    if (normalized.includes(phrase.toLowerCase())) {
        isPlacementsTriggered = true;
      break;
    }
  }

  // RULE 4 - Comparison detected -> Transition to TEXT-ONLY
  if (entityCount > 1 || normalized.includes('compare') || normalized.includes('difference') || normalized.includes(' vs ')) {
    return 'DEPARTMENT_COMPARE';
  }

  // HOD Intent decided by entity presence and core keyword
  if (isHodTriggered && entityCount === 1) {
    return 'HOD_INFO';
  }

  // Specific high-priority routing intents
  if (isDocumentsTriggered) return 'UNKNOWN';
  if (isFeesTriggered && entityCount >= 1) return 'DEPARTMENT_INFO';
  if (isAdmissionsTriggered) return 'ADMISSIONS_GOTO';
  if (isPlacementsTriggered) return 'PLACEMENTS_GOTO';

  // Intent decided by entity presence or core keyword
  if (entityCount === 1) return 'DEPARTMENT_INFO';
  if (isCourseListTriggered) return 'COURSE_LIST';

  return 'UNKNOWN';
}

/**
 * Detects specific department entities across multiple languages.
 * Applies priority overrides so specialized departments beat generic ones.
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

  // Apply priority overrides: remove generic departments if specific ones are present.
  // E.g., if both AIML and CSE matched, remove CSE because AIML is the correct target.
  const toRemove = new Set<string>();
  for (const [specific, generics] of Object.entries(PRIORITY_OVERRIDES)) {
    if (matched.includes(specific)) {
      for (const generic of generics) {
        toRemove.add(generic);
      }
    }
  }

  return matched.filter(d => !toRemove.has(d));
}

/**
 * Sweeps a raw string transcript against the multilingual dictionary using Intent + Entity architecture.
 */
export function normalizeIntent(input: string): NormalizedIntent {
  if (INTENT_MAP.documents.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
    return { trigger: 'documents' };
  }
  // 0. Language Normalization Layer
  const normalized = normalizeToEnglish(input);
  const hasFeeKeyword = INTENT_MAP.fees.some((phrase) => normalized.includes(phrase.toLowerCase()));

  // 1. Entity Extraction
  const entities = detectEntities(normalized);

  // 2. Intent Classification
  const intent = detectIntent(normalized, entities.length);

  // 3. Response Decision Matrix

  // CASE 4 — COMPARE -> No card
  if (intent === 'DEPARTMENT_COMPARE') {
    return { trigger: null };
  }

  // CASE 2.5 — HOD INFO -> Entity-locked Card
  if (intent === 'HOD_INFO' && entities.length === 1) {
    return {
      trigger: 'hod',
      departmentLabel: entities[0]
    };
  }

  // CASE 2.7 — DEPARTMENT OVERVIEW -> Carousel
  if (intent === 'DEPARTMENT_INFO' && entities.length === 1) {
    if (hasFeeKeyword) {
      return {
        trigger: 'department_fees',
        departmentLabel: entities[0]
      };
    }
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

  // CASE 5 — ADMISSIONS/PLACEMENTS
  if (intent === 'ADMISSIONS_GOTO') return { trigger: 'admissions' };
  if (intent === 'PLACEMENTS_GOTO') return { trigger: 'placements' };

  return { trigger: null };
}
