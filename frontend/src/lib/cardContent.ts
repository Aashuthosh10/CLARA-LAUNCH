/**
 * Single source of truth for all card content displayed in the app.
 * All content is defined for all 6 languages (English, Kannada, Hindi, Tamil, Telugu, Malayalam).
 * Edit this file to change labels, menu items, and static copy for:
 * college overview, course/department menu, department overview cards, and future card flows.
 *
 * When adding a new card flow: add the new field to CardContentLang and to every language
 * in CARD_CONTENT (all 6 entries) so the UI stays localized.
 */

import type { Language } from '../context/LanguageContext';

export type { Language };

/** Per-language card content. Add new fields here and in CARD_CONTENT below for new flows. */
export interface CardContentLang {
  INSTITUTION_NAME: string;
  COURSE_MENU_GROUPS: { title: string; items: string[] }[];
  DEPARTMENT_CARD_TITLES: { card2: string; card3: string; card4: string; card5: string };
  COURSE_MENU_COPY: { subtitle: string; heading: string; itemSuffix: string };
  DEPARTMENT_PREPARING_COPY: { label: string; fallbackTitle: string };
  COLLEGE_OVERVIEW: { coverSubtitle: string };
}

/** Card content for all six languages. Edit values to change what appears in the UI. */
export const CARD_CONTENT: Record<Language, CardContentLang> = {
  English: {
    INSTITUTION_NAME: 'Sai Vidya Institute of Technology',
    COURSE_MENU_GROUPS: [
      { title: 'Engineering', items: ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'ISE', 'ECE', 'Civil', 'Mechanical'] },
      { title: 'Postgraduate', items: ['MBA'] },
      { title: 'Basic Sciences', items: ['Mathematics', 'Physics', 'Chemistry'] },
    ],
    DEPARTMENT_CARD_TITLES: {
      card2: 'Department Overview',
      card3: 'Academic & Leadership',
      card4: 'Research & Infrastructure',
      card5: 'Career Support & Vision',
    },
    COURSE_MENU_COPY: {
      subtitle: 'Select a department',
      heading: 'Programs & Departments',
      itemSuffix: 'Overview',
    },
    DEPARTMENT_PREPARING_COPY: {
      label: 'Preparing',
      fallbackTitle: 'Department Overview',
    },
    COLLEGE_OVERVIEW: { coverSubtitle: 'Established 2008' },
  },
  Kannada: {
    INSTITUTION_NAME: 'ಸಾಯಿ ವಿದ್ಯಾ ಇನ್ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿ',
    COURSE_MENU_GROUPS: [
      { title: 'ಎಂಜಿನಿಯರಿಂಗ್', items: ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'ISE', 'ECE', 'Civil', 'Mechanical'] },
      { title: 'ಸ್ನಾತಕೋತ್ತರ', items: ['MBA'] },
      { title: 'ಮೂಲ ವಿಜ್ಞಾನಗಳು', items: ['Mathematics', 'Physics', 'Chemistry'] },
    ],
    DEPARTMENT_CARD_TITLES: {
      card2: 'ವಿಭಾಗ ಅವಲೋಕನ',
      card3: 'ಅಕಾಡೆಮಿಕ್ ಮತ್ತು ನಾಯಕತ್ವ',
      card4: 'ಸಂಶೋಧನೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ',
      card5: 'ಕೆರಿಯರ್ ಬೆಂಬಲ ಮತ್ತು ದೃಷ್ಟಿ',
    },
    COURSE_MENU_COPY: {
      subtitle: 'ವಿಭಾಗವನ್ನು ಆರಿಸಿ',
      heading: 'ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ವಿಭಾಗಗಳು',
      itemSuffix: 'ಅವಲೋಕನ',
    },
    DEPARTMENT_PREPARING_COPY: {
      label: 'ತಯಾರಿ',
      fallbackTitle: 'ವಿಭಾಗ ಅವಲೋಕನ',
    },
    COLLEGE_OVERVIEW: { coverSubtitle: '೨೦೦೮ರಲ್ಲಿ ಸ್ಥಾಪಿಸಲಾಯಿತು' },
  },
  Hindi: {
    INSTITUTION_NAME: 'साई विद्या इंस्टीट्यूट ऑफ टेक्नोलॉजी',
    COURSE_MENU_GROUPS: [
      { title: 'इंजीनियरिंग', items: ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'ISE', 'ECE', 'Civil', 'Mechanical'] },
      { title: 'स्नातकोत्तर', items: ['MBA'] },
      { title: 'बुनियादी विज्ञान', items: ['Mathematics', 'Physics', 'Chemistry'] },
    ],
    DEPARTMENT_CARD_TITLES: {
      card2: 'विभाग अवलोकन',
      card3: 'अकादमिक और नेतृत्व',
      card4: 'अनुसंधान और अवसंरचना',
      card5: 'करियर सहायता और विजन',
    },
    COURSE_MENU_COPY: {
      subtitle: 'विभाग चुनें',
      heading: 'कार्यक्रम और विभाग',
      itemSuffix: 'अवलोकन',
    },
    DEPARTMENT_PREPARING_COPY: {
      label: 'तैयारी',
      fallbackTitle: 'विभाग अवलोकन',
    },
    COLLEGE_OVERVIEW: { coverSubtitle: '2008 में स्थापित' },
  },
  Tamil: {
    INSTITUTION_NAME: 'சாய் வித்யா இன்ஸ்டிடியூட் ஆஃப் டெக்னாலஜி',
    COURSE_MENU_GROUPS: [
      { title: 'பொறியியல்', items: ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'ISE', 'ECE', 'Civil', 'Mechanical'] },
      { title: 'பட்டமேற்படிப்பு', items: ['MBA'] },
      { title: 'அடிப்படை அறிவியல்', items: ['Mathematics', 'Physics', 'Chemistry'] },
    ],
    DEPARTMENT_CARD_TITLES: {
      card2: 'துறை கண்ணோட்டம்',
      card3: 'கல்வி மற்றும் தலைமை',
      card4: 'ஆராய்ச்சி மற்றும் உள்கட்டமைப்பு',
      card5: 'தொழில் ஆதரவு மற்றும் பார்வை',
    },
    COURSE_MENU_COPY: {
      subtitle: 'துறையைத் தேர்ந்தெடுக்கவும்',
      heading: 'நிரல்கள் மற்றும் துறைகள்',
      itemSuffix: 'கண்ணோட்டம்',
    },
    DEPARTMENT_PREPARING_COPY: {
      label: 'தயாரிப்பு',
      fallbackTitle: 'துறை கண்ணோட்டம்',
    },
    COLLEGE_OVERVIEW: { coverSubtitle: '2008 இல் நிறுவப்பட்டது' },
  },
  Telugu: {
    INSTITUTION_NAME: 'సాయి విద్యా ఇన్స్టిట్యూట్ ఆఫ్ టెక్నాలజీ',
    COURSE_MENU_GROUPS: [
      { title: 'ఇంజనీరింగ్', items: ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'ISE', 'ECE', 'Civil', 'Mechanical'] },
      { title: 'పోస్ట్ గ్రాడ్యుయేట్', items: ['MBA'] },
      { title: 'బేసిక్ సైన్సెస్', items: ['Mathematics', 'Physics', 'Chemistry'] },
    ],
    DEPARTMENT_CARD_TITLES: {
      card2: 'విభాగ అవలోకనం',
      card3: 'అకడమిక్ మరియు నాయకత్వం',
      card4: 'రీసెర్చ్ మరియు ఇన్ఫ్రాస్ట్రక్చర్',
      card5: 'కెరీర్ సపోర్ట్ మరియు విజన్',
    },
    COURSE_MENU_COPY: {
      subtitle: 'విభాగాన్ని ఎంచుకోండి',
      heading: 'ప్రోగ్రామ్లు మరియు విభాగాలు',
      itemSuffix: 'అవలోకనం',
    },
    DEPARTMENT_PREPARING_COPY: {
      label: 'సిద్ధం చేస్తోంది',
      fallbackTitle: 'విభాగ అవలోకనం',
    },
    COLLEGE_OVERVIEW: { coverSubtitle: '2008లో స్థాపించబడింది' },
  },
  Malayalam: {
    INSTITUTION_NAME: 'സായി വിദ്യ ഇൻസ്റ്റിറ്റ്യൂട്ട് ഓഫ് ടെക്നോളജി',
    COURSE_MENU_GROUPS: [
      { title: 'എഞ്ചിനീയറിംഗ്', items: ['CSE', 'CSE (AI & ML)', 'CSE (Data Science)', 'ISE', 'ECE', 'Civil', 'Mechanical'] },
      { title: 'പോസ്റ്റ് ഗ്രാജുവേറ്റ്', items: ['MBA'] },
      { title: 'അടിസ്ഥാന ശാസ്ത്രങ്ങൾ', items: ['Mathematics', 'Physics', 'Chemistry'] },
    ],
    DEPARTMENT_CARD_TITLES: {
      card2: 'ഡിപ്പാർട്ട്മെന്റ് അവലോകനം',
      card3: 'അക്കാദമിക് ആൻഡ് ലീഡർഷിപ്പ്',
      card4: 'ഗവേഷണവും ഇൻഫ്രാസ്ട്രക്ചറും',
      card5: 'കരിയർ സപ്പോർട്ടും വിഷനും',
    },
    COURSE_MENU_COPY: {
      subtitle: 'ഒരു ഡിപ്പാർട്ട്മെന്റ് തിരഞ്ഞെടുക്കുക',
      heading: 'പ്രോഗ്രാമുകളും ഡിപ്പാർട്ട്മെന്റുകളും',
      itemSuffix: 'അവലോകനം',
    },
    DEPARTMENT_PREPARING_COPY: {
      label: 'തയ്യാറാക്കുന്നു',
      fallbackTitle: 'ഡിപ്പാർട്ട്മെന്റ് അവലോകനം',
    },
    COLLEGE_OVERVIEW: { coverSubtitle: '2008-ൽ സ്ഥാപിതമായി' },
  },
};

/** Returns card content for the given language. Falls back to English if missing. */
export function getCardContent(language: Language): CardContentLang {
  return CARD_CONTENT[language] ?? CARD_CONTENT.English;
}
