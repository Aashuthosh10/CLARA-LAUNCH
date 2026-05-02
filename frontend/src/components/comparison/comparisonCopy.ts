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
    swipeHint: 'Insight cards scroll if needed.',
    highlighted: 'Recommended focus',
  },
  Kannada: {
    close: 'ಮುಚ್ಚು',
    addDept: 'ಕಾರ್ಯಕ್ರಮ ಸೇರು',
    removeDept: 'ತೆಗೆ',
    compareHeading: 'ಕಾರ್ಯಕ್ರಮ ಹೋಲಿಕೆ',
    pickDept: 'ಕಾರ್ಯಕ್ರಮ ಆರಿಸಿ',
    swipeHint: 'ಅಗತ್ಯವಿದ್ದಲ್ಲಿ ಇನ್‍ಸೈಟ್ ಕಾರ್ಡ್‍ಗಳನ್ನು ಸ್ಕ್ರೋಲ್ ಮಾಡಿ.',
    highlighted: 'ಶಿಫಾರಸು',
  },
  Hindi: {
    close: 'बंद करें',
    addDept: 'कार्यक्रम जोड़ें',
    removeDept: 'हटाएँ',
    compareHeading: 'कार्यक्रम तुलना',
    pickDept: 'कार्यक्रम चुनें',
    swipeHint: 'ज़रूरत हो तो कार्ड्स स्क्रॉल करें।',
    highlighted: 'सिफारिश',
  },
  Tamil: {
    close: 'மூடு',
    addDept: 'திட்டத்தை சேர்',
    removeDept: 'அகற்று',
    compareHeading: 'திட்ட ஒப்பீடு',
    pickDept: 'திட்டத்தைத் தேர்வு செய்',
    swipeHint: 'தேவைப்பட்டால் அட்டைகளை உருளவும்.',
    highlighted: 'பரிந்துரை',
  },
  Telugu: {
    close: 'మూసివేయి',
    addDept: 'ప్రొగ్రాం జోడించు',
    removeDept: 'తొలగించు',
    compareHeading: 'ప్రొగ్రాం పోలిక',
    pickDept: 'ప్రొగ్రాం ఎంచుకోండి',
    swipeHint: 'అవసరమైతే కార్డులను స్క్రోల్ చేయండి.',
    highlighted: 'సిఫార్సు',
  },
  Malayalam: {
    close: 'അടയ്ക്കുക',
    addDept: 'പ്രോഗ്രാം ചേർക്കുക',
    removeDept: 'നീക്കം ചെയ്യുക',
    compareHeading: 'പ്രോഗ്രാം താരതമ്യം',
    pickDept: 'പ്രോഗ്രാം തിരഞ്ഞെടുക്കുക',
    swipeHint: 'ആവശ്യമുണ്ടെങ്കിൽ കാർഡുകൾ സ്ക്രോൾ ചെയ്യുക.',
    highlighted: 'നിർദ്ദേശം',
  },
};
