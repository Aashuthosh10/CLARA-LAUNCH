import type { Language } from '../context/LanguageContext';
import type { CollegeDepartmentRecord, CollegeLocaleData } from '../types/collegeData';
import type { CardDataItem } from './cardData';

/** Stable iteration order for kiosk menus and card decks. */
export const DEPARTMENT_JSON_KEY_ORDER = [
  'cse',
  'ise',
  'cse_aiml',
  'cse_ds',
  'cse_cysec',
  'cse_bs',
  'ece',
  'civil',
  'mechanical',
  'mba',
  'basic_sciences',
] as const;

export type DepartmentJsonKey = (typeof DEPARTMENT_JSON_KEY_ORDER)[number];

const ALIAS_TO_JSON_KEY: Record<string, DepartmentJsonKey | undefined> = {
  cse: 'cse',
  'computer science': 'cse',
  ise: 'ise',
  'information science': 'ise',
  ece: 'ece',
  electronics: 'ece',
  civil: 'civil',
  mechanical: 'mechanical',
  mech: 'mechanical',
  mba: 'mba',
  management: 'mba',
  'basic sciences': 'basic_sciences',
  'basic science': 'basic_sciences',
  sciences: 'basic_sciences',
};

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const k = line.toLowerCase();
    if (!line || seen.has(k)) continue;
    seen.add(k);
    out.push(line);
  }
  return out;
}

function formatFeeObject(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${clean(v)}`)
    .join('\n');
}

const ADMISSION_LABELS: Record<
  Language,
  { eligibility: string; entrance: string; ugFees: string; pgFees: string; scholarships: string }
> = {
  English: {
    eligibility: 'Eligibility',
    entrance: 'Entrance exams',
    ugFees: 'UG fees (reference)',
    pgFees: 'MBA / PG fees',
    scholarships: 'Scholarships',
  },
  Kannada: {
    eligibility: 'ಅರ್ಹತೆ',
    entrance: 'ಪ್ರವೇಶ ಪರೀಕ್ಷೆಗಳು',
    ugFees: 'ಯುಜಿ ಶುಲ್ಕ (ಉಲ್ಲೇಖ)',
    pgFees: 'MBA / ಪಿಜಿ ಶುಲ್ಕ',
    scholarships: 'ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು',
  },
  Hindi: {
    eligibility: 'पात्रता',
    entrance: 'प्रवेश परीक्षाएँ',
    ugFees: 'यूजी शुल्क (संदर्भ)',
    pgFees: 'MBA / पीजी शुल्क',
    scholarships: 'छात्रवृत्तियाँ',
  },
  Tamil: {
    eligibility: 'தகுதி',
    entrance: 'நுழைவுத் தேர்வுகள்',
    ugFees: 'முதுநிலை முன் கட்டணம் (குறிப்பு)',
    pgFees: 'MBA / முதுநிலை கட்டணம்',
    scholarships: 'உதவித்தொகைகள்',
  },
  Telugu: {
    eligibility: 'అర్హత',
    entrance: 'ప్రవేశ పరీక్షలు',
    ugFees: 'యుజి ఫీజు (సూచన)',
    pgFees: 'MBA / పిజి ఫీజు',
    scholarships: 'విద్యార్థి వేతనాలు',
  },
  Malayalam: {
    eligibility: 'അർഹത',
    entrance: 'പ്രവേശന പരീക്ഷകൾ',
    ugFees: 'യുജി ഫീസ് (അവലംബം)',
    pgFees: 'MBA / പിജി ഫീസ്',
    scholarships: 'സ്കോളർഷിപ്പുകൾ',
  },
};

const PLACEMENT_LABELS: Record<Language, { objectives: string; training: string; summary: string }> = {
  English: {
    objectives: 'Training & placement objectives',
    training: 'Training programs',
    summary: 'Support at a glance',
  },
  Kannada: {
    objectives: 'ತರಬೇತಿ ಮತ್ತು ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಉದ್ದೇಶಗಳು',
    training: 'ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳು',
    summary: 'ಸಂಕ್ಷಿಪ್ತ ನೋಟ',
  },
  Hindi: {
    objectives: 'प्रशिक्षण और प्लेसमेंट उद्देश्य',
    training: 'प्रशिक्षण कार्यक्रम',
    summary: 'संक्षिप्त अवलोकन',
  },
  Tamil: {
    objectives: 'பயிற்சி மற்றும் பிளேஸ்மென்ட் நோக்கங்கள்',
    training: 'பயிற்சித் திட்டங்கள்',
    summary: 'சுருக்கப் பார்வை',
  },
  Telugu: {
    objectives: 'శిక్షణ మరియు ప్లేస్‌మెంట్ లక్ష్యాలు',
    training: 'శిక్షణ కార్యక్రమాలు',
    summary: 'సంక్షిప్త దృష్టి',
  },
  Malayalam: {
    objectives: 'പരിശീലനവും പ്ലേസ്മെന്റ് ലക്ഷ്യങ്ങളും',
    training: 'പരിശീലന പരിപാടികൾ',
    summary: 'ചുരുക്കക്കാഴ്ച',
  },
};

export function menuLabelToJsonKey(departmentId: string | null | undefined): DepartmentJsonKey | null {
  if (!departmentId || typeof departmentId !== 'string') return null;
  const raw = departmentId.trim().toLowerCase();
  if (!raw) return null;
  if (raw in ALIAS_TO_JSON_KEY) return ALIAS_TO_JSON_KEY[raw] ?? null;

  if (raw.includes('basic')) return 'basic_sciences';
  if (raw.includes('mba') || raw.includes('management')) return 'mba';
  if (raw.includes('mechanical') || raw === 'mech') return 'mechanical';
  if (raw.includes('civil')) return 'civil';
  if (raw.includes('ece') || raw.includes('electronics')) return 'ece';

  if (raw.includes('ise') || raw.includes('information science')) return 'ise';
  if (
    raw.includes('ai & ml') ||
    raw.includes('ai and ml') ||
    raw.includes('aiml') ||
    (raw.includes('artificial intelligence') && raw.includes('machine learning')) ||
    (raw.includes('cse') && raw.includes('ai') && raw.includes('ml'))
  ) {
    return 'cse_aiml';
  }
  if (raw.includes('data science') || (raw.includes('cse') && raw.includes('data'))) return 'cse_ds';
  if (raw.includes('cyber security') || raw.includes('cybersecurity') || (raw.includes('cse') && raw.includes('cyber'))) {
    return 'cse_cysec';
  }
  if (raw.includes('business system') || (raw.includes('cse') && raw.includes('business'))) return 'cse_bs';

  if (raw.includes('cse') || raw.includes('computer')) return 'cse';
  return null;
}

export function getDepartmentRecord(
  data: CollegeLocaleData,
  key: DepartmentJsonKey | string
): CollegeDepartmentRecord | null {
  const deps = data.departments;
  if (!deps || typeof deps !== 'object') return null;
  const k = String(key).toLowerCase();
  const rec = deps[k];
  return rec && typeof rec === 'object' ? rec : null;
}

const DEPT_LABELS: Record<Language, {
  department: string;
  leadAndVision: string;
  hodAndVision: string;
  achievements: string;
  placements: string;
  fees: string;
  notAvail: string;
  unlisted: string;
}> = {
  English: {
    department: 'Department',
    leadAndVision: 'Leadership & Vision',
    hodAndVision: 'HOD & Vision',
    achievements: 'Achievements',
    placements: 'Placements',
    fees: 'Fee Structure',
    notAvail: 'Information not available',
    unlisted: 'This department is not listed in the campus knowledge file yet.',
  },
  Kannada: {
    department: 'ವಿಭಾಗ',
    leadAndVision: 'ನಾಯಕತ್ವ ಮತ್ತು ದೃಷ್ಟಿಕೋನ',
    hodAndVision: 'HOD ಮತ್ತು ದೃಷ್ಟಿಕೋನ',
    achievements: 'ಸಾಧನೆಗಳು',
    placements: 'ಉದ್ಯೋಗಾವಕಾಶಗಳು',
    fees: 'ಶುಲ್ಕದ ವಿವರಗಳು',
    notAvail: 'ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ',
    unlisted: 'ಈ ವಿಭಾಗವು ಕ್ಯಾಂಪಸ್ ಜ್ಞಾನದಲ್ಲಿ ಇನ್ನೂ ಪಟ್ಟಿ ಮಾಡಲಾಗಿಲ್ಲ.',
  },
  Hindi: {
    department: 'विभाग',
    leadAndVision: 'नेतृत्व और दृष्टिकोण',
    hodAndVision: 'HOD और दृष्टिकोण',
    achievements: 'उपलब्धियां',
    placements: 'प्लेसमेंट',
    fees: 'शुल्क संरचना',
    notAvail: 'जानकारी उपलब्ध नहीं है',
    unlisted: 'यह विभाग अभी कैंपस नॉलेज में सूचीबद्ध नहीं है।',
  },
  Tamil: {
    department: 'துறை',
    leadAndVision: 'தலைமை மற்றும் பார்வை',
    hodAndVision: 'HOD மற்றும் பார்வை',
    achievements: 'சாதனைகள்',
    placements: 'வேலைவாய்ப்பு',
    fees: 'கட்டண விவரம்',
    notAvail: 'தகவல் கிடைக்கவில்லை',
    unlisted: 'இந்தத் துறை இன்னும் கேம்பஸ் அறிவில் பட்டியலிடப்படவில்லை.',
  },
  Telugu: {
    department: 'విభాగం',
    leadAndVision: 'నాయకత్వం మరియు దృక్పథం',
    hodAndVision: 'HOD మరియు దృక్పథం',
    achievements: 'సాధనలు',
    placements: 'ప్లేస్‌మెంట్‌లు',
    fees: 'ఫీజు నిర్మాణం',
    notAvail: 'సమాచారం అందుబాటులో లేదు',
    unlisted: 'ఈ విభాగం ఇంకా క్యాంపస్ నాలెడ్జ్‌లో జాబితా చేయబడలేదు.',
  },
  Malayalam: {
    department: 'വിഭാഗം',
    leadAndVision: 'നേതൃത്വവും വീക്ഷണവും',
    hodAndVision: 'HOD ഉം വീക്ഷണവും',
    achievements: 'നേട്ടങ്ങൾ',
    placements: 'പ്ലേസ്‌മെന്റുകൾ',
    fees: 'ഫീസ് രൂപരേഖ',
    notAvail: 'വിവരം ലഭ്യമല്ല',
    unlisted: 'ഈ വിഭാഗം ഇതുവരെ ക്യാമ്പസ് അറിവിൽ ലിസ്റ്റ് ചെയ്തിട്ടില്ല.',
  },
};


function clean(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

export function buildAllHodCardsFromLocale(data: CollegeLocaleData, language: Language): CardDataItem[] {
  const L = DEPT_LABELS[language] ?? DEPT_LABELS.English;
  const deps = data.departments;
  if (!deps || typeof deps !== 'object') return [];
  const cards: CardDataItem[] = [];
  for (const key of DEPARTMENT_JSON_KEY_ORDER) {
    const d = deps[key];
    if (!d || typeof d !== 'object') continue;
    const name = clean(d.name) || key.toUpperCase();
    const hod_voice = clean(d.hod_voice) || L.notAvail;
    cards.push({
      title: name,
      content: `${L.department}: ${name}\n${L.leadAndVision}: ${hod_voice}`,
      type: 'hod',
    });
  }
  return cards;
}

export function buildAllDepartmentSummaryCardsFromLocale(data: CollegeLocaleData, language: Language): CardDataItem[] {
  const L = DEPT_LABELS[language] ?? DEPT_LABELS.English;
  const deps = data.departments;
  if (!deps || typeof deps !== 'object') return [];
  const cards: CardDataItem[] = [];
  for (const key of DEPARTMENT_JSON_KEY_ORDER) {
    const d = deps[key];
    if (!d || typeof d !== 'object') continue;
    const name = clean(d.name) || key.toUpperCase();
    const intro = clean(d.intro);
    cards.push({
      title: name,
      content: intro || L.notAvail,
      type: 'dept',
    });
  }
  return cards;
}

export interface DepartmentStageSlide {
  title: string;
  content: string;
}

export function buildDepartmentSlidesFromRecord(
  dept: CollegeDepartmentRecord | null,
  jsonKey: string,
  language: Language
): DepartmentStageSlide[] {
  const L = DEPT_LABELS[language] ?? DEPT_LABELS.English;
  if (!dept) {
    return [
      {
        title: L.department,
        content: L.unlisted,
      },
    ];
  }
  const name = clean(dept.name) || jsonKey.toUpperCase();
  const intro = clean(dept.intro) || L.notAvail;
  const hod_voice = clean(dept.hod_voice) || L.notAvail;
  const achievements = clean(dept.achievements) || L.notAvail;
  const placement = clean(dept.placement) || L.notAvail;
  const fees = clean(dept.fees) || L.notAvail;

  return [
    { title: name, content: intro },
    { title: L.hodAndVision, content: hod_voice },
    { title: L.achievements, content: achievements },
    { title: L.placements, content: placement },
    { title: L.fees, content: fees },
  ];
}

/**
 * Maps `admissions_and_fees` from locale JSON into slides for the kiosk deck.
 */
export function buildAdmissionsCardsFromLocale(data: CollegeLocaleData, language: Language): DepartmentStageSlide[] {
  const L = ADMISSION_LABELS[language] ?? ADMISSION_LABELS.English;
  const a = data.admissions_and_fees;
  if (!a || typeof a !== 'object') {
    return [{ title: L.eligibility, content: 'Please visit the Admission Block for the latest details.' }];
  }
  const rec = a as Record<string, unknown>;
  const extra = rec.additional_details as Record<string, unknown> | undefined;
  const admissionElig = extra?.admission_and_eligibility as Record<string, unknown> | undefined;
  const be = admissionElig?.be_programs as Record<string, unknown> | undefined;
  const mbaProg = admissionElig?.mba_programs as Record<string, unknown> | undefined;
  const feesStruct = extra?.fees_structure as Record<string, unknown> | undefined;

  const eligParts = dedupeLines(
    [
      clean(rec.eligibility),
      ...(be
        ? [
            clean(be.qualification),
            clean(be.compulsory_subjects) ? `Compulsory: ${clean(be.compulsory_subjects)}` : '',
            clean(be.optional_subjects) ? `Optional: ${clean(be.optional_subjects)}` : '',
            clean(be.requirements_general),
            clean(be.requirements_reserved),
          ].filter(Boolean)
        : []),
      ...(mbaProg
        ? [`MBA: ${clean(mbaProg.qualification)}`, clean(mbaProg.expected_cutoff)].filter(Boolean)
        : []),
    ].map((x) => clean(x))
  );
  const eligibilityBody =
    eligParts.join('\n') ||
    clean(rec.eligibility) ||
    'Please visit the Admission Block for eligibility and document requirements.';

  const examLines: string[] = [];
  if (Array.isArray(rec.entrance_exams)) {
    for (const x of rec.entrance_exams) examLines.push(clean(x));
  }
  if (be && Array.isArray(be.entrance_exams)) {
    for (const x of be.entrance_exams) examLines.push(clean(x));
  }
  if (mbaProg && Array.isArray(mbaProg.entrance_exams)) {
    examLines.push('MBA: ' + (mbaProg.entrance_exams as unknown[]).map((x) => clean(x)).join(', '));
  }
  const entranceBody = dedupeLines(examLines).join('\n') || 'KCET, COMEDK, and Management Quota — see Admission Block.';

  const feeRec = rec.fee_structures as Record<string, unknown> | undefined;
  let ugBody = clean(feeRec?.ug_kcet);
  const mgObj = feesStruct?.management_quota_engineering_annual;
  const mgFormatted = formatFeeObject(mgObj);
  if (mgFormatted) {
    ugBody = [ugBody, 'Management quota (annual, indicative):', mgFormatted].filter(Boolean).join('\n');
  } else if (feeRec?.ug_management) {
    ugBody = [ugBody, clean(feeRec.ug_management)].filter(Boolean).join('\n');
  }
  if (!ugBody.trim()) ugBody = 'See Admission Block for current KCET and management-quota fee schedules.';

  let pgBody = clean(feeRec?.pg_mba);
  const mbaFees = feesStruct?.mba_fees_annual;
  const mbaFormatted = formatFeeObject(mbaFees);
  if (mbaFormatted) {
    pgBody = [pgBody, mbaFormatted].filter(Boolean).join('\n');
  }
  if (!pgBody.trim()) pgBody = 'See Admission Block for MBA fee details and payment plans.';

  const scholLines: string[] = [];
  const s = clean(rec.scholarships);
  if (s) scholLines.push(s);
  if (feesStruct && Array.isArray(feesStruct.scholarships)) {
    for (const x of feesStruct.scholarships as unknown[]) scholLines.push(clean(x));
  }
  const scholBody = dedupeLines(scholLines).join('\n');
  const additional = clean(feeRec?.additional_fees);

  const slides: DepartmentStageSlide[] = [
    { title: L.eligibility, content: eligibilityBody },
    { title: L.entrance, content: entranceBody },
    { title: L.ugFees, content: [ugBody, additional ? `\n${additional}` : ''].join('').trim() },
    { title: L.pgFees, content: pgBody },
  ];
  if (scholBody) {
    slides.push({ title: L.scholarships, content: scholBody });
  }
  return slides;
}

/**
 * Maps `placements_and_training` from locale JSON into slides for the kiosk deck.
 */
export function buildPlacementCardsFromLocale(data: CollegeLocaleData, language: Language): DepartmentStageSlide[] {
  const L = PLACEMENT_LABELS[language] ?? PLACEMENT_LABELS.English;
  const p = data.placements_and_training;
  if (!p || typeof p !== 'object') {
    return [
      { title: L.objectives, content: 'Please visit the Training & Placement cell for the latest information.' },
    ];
  }
  const rec = p as Record<string, unknown>;
  const extra = rec.additional_details as Record<string, unknown> | undefined;

  let objBody = clean(rec.objectives);
  if (extra && Array.isArray(extra.objectives)) {
    objBody = (extra.objectives as unknown[]).map((x) => clean(x)).join('\n') || objBody;
  }

  let trainBody = clean(rec.training_programs);
  if (extra && Array.isArray(extra.training_programs)) {
    trainBody = (extra.training_programs as unknown[]).map((x) => clean(x)).join('\n') || trainBody;
  }

  const summaryParts = dedupeLines(
    [objBody && objBody.slice(0, 280) + (objBody.length > 280 ? '…' : ''), trainBody && trainBody.slice(0, 280) + (trainBody.length > 280 ? '…' : '')].filter(
      Boolean
    ) as string[]
  );

  return [
    { title: L.objectives, content: objBody || 'Placement support and career guidance are central to SVIT.' },
    { title: L.training, content: trainBody || 'Aptitude, technical, soft skills, and mock interviews — see T&P cell.' },
    { title: L.summary, content: summaryParts.join('\n\n') || 'For company visits, drives, and statistics, meet the T&P team.' },
  ];
}
