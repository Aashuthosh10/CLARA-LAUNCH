import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'English' | 'Kannada' | 'Hindi' | 'Tamil' | 'Telugu' | 'Malayalam';

interface Translations {
  [key: string]: {
    [L in Language]: string;
  };
}

export const translations: Translations = {
  welcome: {
    English: 'Welcome to the Campus',
    Kannada: 'ಕ್ಯಾಂಪಸ್‌ಗೆ ಸುಸ್ವಾಗತ',
    Hindi: 'कैंपस में आपका स्वागत है',
    Tamil: 'வளாகத்திற்கு வரவேற்கிறோம்',
    Telugu: 'క్యాంపస్‌కు స్వాగతం',
    Malayalam: 'ക്യാമ്പസിലേക്ക് സ്വാഗതം',
  },
  tapToWake: {
    English: 'Tap to Wake',
    Kannada: 'ಎಚ್ಚರಗೊಳಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    Hindi: 'जगाने के लिए टैप करें',
    Tamil: 'விழித்தெழுவதற்கு தட்டவும்',
    Telugu: 'మేల్కొలపడానికి నొక్కండి',
    Malayalam: 'ഉണർത്താൻ ടാപ്പ് ചെയ്യുക',
  },
  selectLanguage: {
    English: 'Select Language',
    Kannada: 'ಭಾಷೆಯನ್ನು ಆರಿಸಿ',
    Hindi: 'भाषा चुनें',
    Tamil: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    Telugu: 'భాషను ఎంచుకోండి',
    Malayalam: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
  },
  mainMenu: {
    English: 'How can I assist you today?',
    Kannada: 'ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    Hindi: 'आज मैं आपकी कैसे सहायता कर सकता हूँ?',
    Tamil: 'இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    Telugu: 'ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?',
    Malayalam: 'ഇന്ന് എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാനാകും?',
  },
  admissions: {
    English: 'Admissions',
    Kannada: 'ಪ್ರವೇಶಾತಿಗಳು',
    Hindi: 'प्रवेश',
    Tamil: 'சேர்க்கை',
    Telugu: 'ప్రవేశాలు',
    Malayalam: 'അഡ്മിഷൻ',
  },
  fees: {
    English: 'Fees',
    Kannada: 'ಶುಲ್ಕಗಳು',
    Hindi: 'शुल्क',
    Tamil: 'கட்டணம்',
    Telugu: 'ఫీజులు',
    Malayalam: 'ഫീസ്',
  },
  departments: {
    English: 'Departments',
    Kannada: 'ವಿಭಾಗಗಳು',
    Hindi: 'विभाग',
    Tamil: 'துறைகள்',
    Telugu: 'విభాగాలు',
    Malayalam: 'വകുപ്പുകൾ',
  },
  placements: {
    English: 'Placements',
    Kannada: 'ಉದ್ಯೋಗಾವಕಾಶಗಳು',
    Hindi: 'प्लेसमेंट',
    Tamil: 'வேலைவாய்ப்பு',
    Telugu: 'ప్లేస్‌మెంట్లు',
    Malayalam: 'പ്ലേസ്‌മെന്റ്',
  },
  campus: {
    English: 'Campus',
    Kannada: 'ಕ್ಯಾಂಪಸ್',
    Hindi: 'कैंपस',
    Tamil: 'வளாகம்',
    Telugu: 'క్యాంపస్',
    Malayalam: 'ക്യാമ്പസ്',
  },
  contact: {
    English: 'Contact',
    Kannada: 'ಸಂಪರ್ಕಿಸಿ',
    Hindi: 'संपर्क',
    Tamil: 'தொடர்பு',
    Telugu: 'సంప్రదించండి',
    Malayalam: 'ബന്ധപ്പെടുക',
  },
  listening: {
    English: 'Listening...',
    Kannada: 'ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
    Hindi: 'सुन रहा हूँ...',
    Tamil: 'கேட்கிறது...',
    Telugu: 'వింటున్నాను...',
    Malayalam: 'ശ്രദ്ധിക്കുന്നു...',
  },
  claraIsThinking: {
    English: 'CLARA is thinking...',
    Kannada: 'ಕ್ಲಾರಾ ಯೋಚಿಸುತ್ತಿದ್ದಾಳೆ...',
    Hindi: 'क्लारा सोच रही है...',
    Tamil: 'கிளாரா யோசிக்கிறாள்...',
    Telugu: 'క్లారా ఆలోచిస్తోంది...',
    Malayalam: 'ക്ലാര ചിന്തിക്കുന്നു...',
  },
  ttsInstructionMenu: {
    English: 'Please select one of the following options to continue.',
    Kannada: 'ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ಈ ಕೆಳಗಿನ ಆಯ್ಕೆಗಳಲ್ಲಿ ಒಂದನ್ನು ಆರಿಸಿ.',
    Hindi: 'जारी रखने के लिए कृपया निम्नलिखित विकल्पों में से एक चुनें।',
    Tamil: 'தொடர பின்வரும் விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்.',
    Telugu: 'కొనసాగించడానికి దయచేసి కింది ఎంపికలలో ఒకదాన్ని ఎంచుకోండి.',
    Malayalam: 'തുടരുന്നതിന് ദയവായി താഴെ പറയുന്ന ഓപ്ഷനുകളിൽ ഒന്ന് തിരഞ്ഞെടുക്കുക.',
  },
  // Chat greeting: single source is backend/greetings.py (sent via WebSocket payload.messages).
  tapToSpeak: {
    English: 'Tap to speak',
    Kannada: 'ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    Hindi: 'बोलने के लिए टैप करें',
    Tamil: 'பேச தட்டவும்',
    Telugu: 'మాట్లాడడానికి నొక్కండి',
    Malayalam: 'സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക',
  },
  chatBack: {
    English: 'Back',
    Kannada: 'ಹಿಂದೆ',
    Hindi: 'वापस',
    Tamil: 'பின்செல்',
    Telugu: 'వెనుక',
    Malayalam: 'പിന്നിൽ',
  },
  cardOpen: {
    English: 'Open',
    Kannada: 'ತೆರೆಯಿರಿ',
    Hindi: 'खोलें',
    Tamil: 'திற',
    Telugu: 'తెరిచి',
    Malayalam: 'തുറക്കുക',
  },
  cardAsset: {
    English: 'Asset',
    Kannada: 'ಆಸ್ತಿ',
    Hindi: 'संसाधन',
    Tamil: 'சொத்து',
    Telugu: 'ఆస్తి',
    Malayalam: 'ആസ്തി',
  },

  // Digital Book — Page 2: About the Institution (title + content for display and TTS)
  bookPage1Title: {
    English: 'About the Institution',
    Kannada: 'ಸಂಸ್ಥೆಯ ಬಗ್ಗೆ',
    Hindi: 'संस्थान के बारे में',
    Tamil: 'நிறுவனம் பற்றி',
    Telugu: 'సంస్థ గురించి',
    Malayalam: 'ഇൻസ്റ്റിറ്റ്യൂഷൻ എന്നിവയെക്കുറിച്ച്',
  },

  // Digital Book — Page 3: Academic Programs
  bookPage2Title: {
    English: 'Academic Programs',
    Kannada: 'ಶೈಕ್ಷಣಿಕ ಕಾರ್ಯಕ್ರಮಗಳು',
    Hindi: 'शैक्षणिक कार्यक्रम',
    Tamil: 'கல்வி நிரல்கள்',
    Telugu: 'అకడమిక్ ప్రోగ్రామ్లు',
    Malayalam: 'അക്കാദമിക് പ്രോഗ്രാമുകൾ',
  },

  // Digital Book — Page 4: Quality & Infrastructure
  bookPage3Title: {
    English: 'Quality & Infrastructure',
    Kannada: 'ಗುಣಮಟ್ಟ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ',
    Hindi: 'गुणवत्ता और अवसंरचना',
    Tamil: 'தரம் மற்றும் உள்கட்டமைப்பு',
    Telugu: 'నాణ్యత మరియు మౌలిక సదుపాయాలు',
    Malayalam: 'ഗുണനിലവാരവും ഇൻഫ്രാസ്ട്രക്ചറും',
  },

  // Digital Book — Page 5: Achievements & Recognition
  bookPage4Title: {
    English: 'Achievements & Recognition',
    Kannada: 'ಸಾಧನೆಗಳು ಮತ್ತು ಮಾನ್ಯತೆ',
    Hindi: 'उपलब्धियां और मान्यता',
    Tamil: 'சாதனைகள் மற்றும் அங்கீகாரம்',
    Telugu: 'సాధనలు మరియు గుర్తింపు',
    Malayalam: 'സാധനകളും അംഗീകാരവും',
  },

  // Digital Book — Page 6: Placement & Career Support
  bookPage5Title: {
    English: 'Placement & Career Support',
    Kannada: 'ಉದ್ಯೋಗ ನಿಯೋಜನೆ ಮತ್ತು ವೃತ್ತಿ ಬೆಂಬಲ',
    Hindi: 'प्लेसमेंट और करियर सहायता',
    Tamil: 'வேலைவாய்ப்பு மற்றும் தொழில் ஆதரவு',
    Telugu: 'ప్లేస్‌మెంట్ మరియు కెరీర్ సపోర్ట్',
    Malayalam: 'പ്ലേസ്മെന്റും കരിയർ സപ്പോർട്ടും',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('English');

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
