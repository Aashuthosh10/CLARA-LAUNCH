import type { Language } from '../../context/LanguageContext';

export type ComparisonChrome = {
  close: string;
  addDept: string;
  removeDept: string;
  compareHeading: string;
  pickDept: string;
  swipeHint: string;
  highlighted: string;
};

export const comparisonChrome: Record<Language, ComparisonChrome> = {
  English: {
    close: 'Close',
    addDept: 'Add program',
    removeDept: 'Remove',
    compareHeading: 'Program comparison',
    pickDept: 'Select program',
    swipeHint: 'Insights advance automatically — one beat per program, in sync.',
    highlighted: 'Recommended focus',
  },
  Kannada: {
    close: 'ಮುಚ್ಚು',
    addDept: 'ಕಾರ್ಯಕ್ರಮ ಸೇರು',
    removeDept: 'ತೆಗೆ',
    compareHeading: 'ಕಾರ್ಯಕ್ರಮ ಹೋಲಿಕೆ',
    pickDept: 'ಕಾರ್ಯಕ್ರಮ ಆರಿಸಿ',
    swipeHint: 'ಒಳನೋಟಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮುಂದುವರಿಯುತ್ತವೆ — ಪ್ರತಿ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಒಂದೇ ತಾಳ.',
    highlighted: 'ಶಿಫಾರಸು',
  },
  Hindi: {
    close: 'बंद करें',
    addDept: 'कार्यक्रम जोड़ें',
    removeDept: 'हटाएँ',
    compareHeading: 'कार्यक्रम तुलना',
    pickDept: 'कार्यक्रम चुनें',
    swipeHint: 'इनसाइट्स अपने आप आगे बढ़ती हैं — सभी कार्यक्रम एक साथ।',
    highlighted: 'सिफारिश',
  },
  Tamil: {
    close: 'மூடு',
    addDept: 'திட்டத்தை சேர்',
    removeDept: 'அகற்று',
    compareHeading: 'திட்ட ஒப்பீடு',
    pickDept: 'திட்டத்தைத் தேர்வு செய்',
    swipeHint: 'உள்ளடக்கங்கள் தானாக முன்னேறும் — அனைத்து திட்டங்களும் ஒரே நேரத்தில்.',
    highlighted: 'பரிந்துரை',
  },
  Telugu: {
    close: 'మూసివేయి',
    addDept: 'ప్రొగ్రాం జోడించు',
    removeDept: 'తొలగించు',
    compareHeading: 'ప్రొగ్రాం పోలిక',
    pickDept: 'ప్రొగ్రాం ఎంచుకోండి',
    swipeHint: 'ఇన్‌సైట్‌లు స్వయంచాలకంగా మారతాయి — అన్ని ప్రొగ్రామ్‌లు ఒకే లయలో.',
    highlighted: 'సిఫార్సు',
  },
  Malayalam: {
    close: 'അടയ്ക്കുക',
    addDept: 'പ്രോഗ്രാം ചേർക്കുക',
    removeDept: 'നീക്കം ചെയ്യുക',
    compareHeading: 'പ്രോഗ്രാം താരതമ്യം',
    pickDept: 'പ്രോഗ്രാം തിരഞ്ഞെടുക്കുക',
    swipeHint: 'ഇൻസൈറ്റുകൾ സ്വയം മുന്നോട്ട് — എല്ലാ പ്രോഗ്രാമുകളും ഒരേ താളത്തിൽ.',
    highlighted: 'നിർദ്ദേശം',
  },
};
