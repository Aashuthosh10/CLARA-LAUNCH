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
    swipeHint: 'Swipe horizontally on smaller screens.',
    highlighted: 'Recommended focus',
  },
  Kannada: {
    close: 'ಮುಚ್ಚು',
    addDept: 'ಕಾರ್ಯಕ್ರಮ ಸೇರು',
    removeDept: 'ತೆಗೆ',
    compareHeading: 'ಕಾರ್ಯಕ್ರಮ ಹೋಲಿಕೆ',
    pickDept: 'ಕಾರ್ಯಕ್ರಮ ಆರಿಸಿ',
    swipeHint: 'ಲಂಬವಾದ ಪರದೆಯಲ್ಲಿ ಅಡ್ಡಸಾಲಿಗೆ ಸ్వೈಪ್ ಮಾಡಿ.',
    highlighted: 'ಶಿಫಾರಸು',
  },
  Hindi: {
    close: 'बंद करें',
    addDept: 'कार्यक्रम जोड़ें',
    removeDept: 'हटाएँ',
    compareHeading: 'कार्यक्रम तुलना',
    pickDept: 'कार्यक्रम चुनें',
    swipeHint: 'छोटी स्क्रीन पर क्षैतिज स्वाइप करें।',
    highlighted: 'सिफारिश',
  },
  Tamil: {
    close: 'மூடு',
    addDept: 'திட்டத்தை சேர்',
    removeDept: 'அகற்று',
    compareHeading: 'திட்ட ஒப்பீடு',
    pickDept: 'திட்டத்தைத் தேர்வு செய்',
    swipeHint: 'சிறிய திரையில் கிடைமட்டமாக ஸ்வைப் செய்யவும்.',
    highlighted: 'பரிந்துரை',
  },
  Telugu: {
    close: 'మూసివేయి',
    addDept: 'ప్రొగ్రాం జోడించు',
    removeDept: 'తొలగించు',
    compareHeading: 'ప్రొగ్రాం పోలిక',
    pickDept: 'ప్రొగ్రాం ఎంచుకోండి',
    swipeHint: 'చిన్న స్క్రీన్‌లో అడ్డంగా స్వైప్ చేయండి.',
    highlighted: 'సిఫార్సు',
  },
  Malayalam: {
    close: 'അടയ്ക്കുക',
    addDept: 'പ്രോഗ്രാം ചേർക്കുക',
    removeDept: 'നീക്കം ചെയ്യുക',
    compareHeading: 'പ്രോഗ്രാം താരതമ്യം',
    pickDept: 'പ്രോഗ്രാം തിരഞ്ഞെടുക്കുക',
    swipeHint: 'ചെറിയ സ്ക്രീനിൽ തിരശ്ചീനമായി സ്വൈപ്പ് ചെയ്യുക.',
    highlighted: 'നിർദ്ദേശം',
  },
};
