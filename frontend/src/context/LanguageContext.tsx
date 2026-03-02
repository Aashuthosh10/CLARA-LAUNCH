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
  bookPage1Content: {
    English: 'Sai Vidya Institute of Technology, established in 2008, is affiliated to VTU and approved by AICTE. Located in Bengaluru, the institution provides a secure and academically focused environment.',
    Kannada: '೨೦೦೮ರಲ್ಲಿ ಸ್ಥಾಪಿತವಾದ ಸಾಯಿ ವಿದ್ಯಾ ಇನ್ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿ VTU ಸಂಯೋಜಿತ ಮತ್ತು AICTE ಅನುಮೋದಿತ. ಬೆಂಗಳೂರಿನಲ್ಲಿರುವ ಈ ಸಂಸ್ಥೆ ಸುರಕ್ಷಿತ ಮತ್ತು ಶೈಕ್ಷಣಿಕವಾಗಿ ಕೇಂದ್ರೀಕೃತ ವಾತಾವರಣವನ್ನು ಒದಗಿಸುತ್ತದೆ.',
    Hindi: 'साई विद्या इंस्टीट्यूट ऑफ टेक्नोलॉजी, 2008 में स्थापित, VTU से संबद्ध और AICTE से अनुमोदित है। बेंगलुरु में स्थित, संस्थान एक सुरक्षित और शैक्षणिक रूप से केंद्रित वातावरण प्रदान करता है।',
    Tamil: '2008 இல் நிறுவப்பட்ட சாய் வித்யா இன்ஸ்டிடியூட் ஆஃப் டெக்னாலஜி VTU இணைக்கப்பட்டு AICTE அங்கீகாரம் பெற்றது. பெங்களூரில் அமைந்துள்ள இந்த நிறுவனம் பாதுகாப்பான மற்றும் கல்வி சார்ந்த சூழலை வழங்குகிறது.',
    Telugu: '2008లో స్థాపించబడిన సాయి విద్యా ఇన్స్టిట్యూట్ ఆఫ్ టెక్నాలజీ VTU అనుబంధంతో మరియు AICTE ఆమోదంతో ఉంది. బెంగళూరులో ఉన్న ఈ సంస్థ సురక్షితమైన మరియు విద్యావంతమైన వాతావరణాన్ని అందిస్తుంది.',
    Malayalam: '2008-ൽ സ്ഥാപിതമായ സായി വിദ്യ ഇൻസ്റ്റിറ്റ്യൂട്ട് ഓഫ് ടെക്നോളജി VTU അഫിലിയേറ്റഡും AICTE അംഗീകൃതവുമാണ്. ബെംഗളൂരുവിൽ സ്ഥിതിചെയ്യുന്ന ഈ സ്ഥാപനം സുരക്ഷിതവും അക്കാദമിക് ഫോക്കസ് ഉള്ള പരിതസ്ഥിതിയും നൽകുന്നു.',
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
  bookPage2Content: {
    English: 'The college offers programs in CSE, AI & ML, Data Science, ECE, and MBA. The curriculum emphasizes practical skills, innovation, and industry alignment.',
    Kannada: 'ಕಾಲೇಜು CSE, AI & ML, ಡೇಟಾ ಸೈನ್ಸ್, ECE ಮತ್ತು MBA ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಒದಗಿಸುತ್ತದೆ. ಪಾಠ್ಯಕ್ರಮ ಪ್ರಾಯೋಗಿಕ ಕೌಶಲ್ಯ, ನಾವೀನ್ಯತೆ ಮತ್ತು ಉದ್ಯೋಗ ಸಂरेಖಣೆಯನ್ನು ಒತ್ತಿಹೇಳುತ್ತದೆ.',
    Hindi: 'कॉलेज CSE, AI और ML, डेटा साइंस, ECE और MBA में कार्यक्रम प्रदान करता है। पाठ्यक्रम व्यावहारिक कौशल, नवाचार और उद्योग संरेखण पर जोर देता है।',
    Tamil: 'கல்லூரி CSE, AI & ML, டேட்டா சயின்ஸ், ECE மற்றும் MBA நிரல்களை வழங்குகிறது. பாடத்திட்டம் நடைமுறை திறன்கள், புதுமை மற்றும் தொழில் சீரமைப்பை வலியுறுத்துகிறது.',
    Telugu: 'కళాశాల CSE, AI & ML, డేటా సైన్స్, ECE మరియు MBA ప్రోగ్రామ్లను అందిస్తుంది. పాఠ్యాంశం ప్రాక్టికల్ స్కిల్స్, ఇన్నోవేషన్ మరియు ఇండస్ట్రీ అలైన్మెంట్ పై దృష్టి పెడుతుంది.',
    Malayalam: 'കോളേജ് CSE, AI & ML, ഡാറ്റ സയൻസ്, ECE, MBA പ്രോഗ്രാമുകൾ വഴിവയ്ക്കുന്നു. പാഠ്യപദ്ധതി പ്രായോഗിക കഴിവുകൾ, നൂതന ചിന്ത, ഇൻഡസ്ട്രി അലൈൻമെന്റ് എന്നിവയിൽ ഊന്നൽ നൽകുന്നു.',
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
  bookPage3Content: {
    English: 'Modern laboratories and advanced computing facilities support hands-on learning. Innovation spaces and research centers encourage real-world project experience.',
    Kannada: 'ಆಧುನಿಕ ಪ್ರಯೋಗಾಲಯಗಳು ಮತ್ತು ಅತ್ಯಾಧುನಿಕ ಕಂಪ್ಯೂಟಿಂಗ್ ಸೌಕರ್ಯಗಳು ಹ್ಯಾಂಡ್ಸ್-ಆನ್ ಕಲಿಕೆಯನ್ನು ಬೆಂಬಲಿಸುತ್ತವೆ. ನಾವೀನ್ಯತೆ ಜಾಗಗಳು ಮತ್ತು ಸಂಶೋಧನಾ ಕೇಂದ್ರಗಳು ನೈಜ ಯೋಜನಾ ಅನುಭವವನ್ನು ಉತ್ತೇಜಿಸುತ್ತವೆ.',
    Hindi: 'आधुनिक प्रयोगशालाएं और उन्नत कंप्यूटिंग सुविधाएं हाथों-हाथ सीखने को समर्थन देती हैं। नवाचार स्थान और अनुसंधान केंद्र वास्तविक परियोजना अनुभव को प्रोत्साहित करते हैं।',
    Tamil: 'நவீன ஆய்வகங்கள் மற்றும் மேம்பட்ட கணினி வசதிகள் hands-on கற்றலை ஆதரிக்கின்றன. புதுமை இடங்கள் மற்றும் ஆராய்ச்சி மையங்கள் நிஜ உலக திட்ட அனுபவத்தை ஊக்குவிக்கின்றன.',
    Telugu: 'ఆధునిక ల్యాబొరేటరీలు మరియు అధునాతన కంప్యూటింగ్ సౌకర్యాలు హ్యాండ్స్-ఆన్ లెర్నింగ్‌కు మద్దతు ఇస్తాయి. ఇన్నోవేషన్ స్పేసెస్ మరియు రీసెర్చ్ సెంటర్లు రియల్-వరల్డ్ ప్రాజెక్ట్ అనుభవాన్ని ప్రోత్సహిస్తాయి.',
    Malayalam: 'ആധുനിക ലാബുകളും അധ്വാനിക കമ്പ്യൂട്ടിംഗ് സൗകര്യങ്ങളും പ്രായോഗിക അഭ്യാസത്തെ പിന്തുണയ്ക്കുന്നു. ഇന്നോവേഷൻ സ്പേസുകളും ഗവേഷണ കേന്ദ്രങ്ങളും യഥാർത്ഥ പ്രോജക്റ്റ് അനുഭവത്തെ പ്രോത്സാഹിപ്പിക്കുന്നു.',
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
  bookPage4Content: {
    English: 'The institution has secured university ranks and academic recognition. Departments maintain accredited standards and consistent performance.',
    Kannada: 'ಸಂಸ್ಥೆಯು ವಿಶ್ವವಿದ್ಯಾಲಯ ಶ್ರೇಣಿಗಳು ಮತ್ತು ಶೈಕ್ಷಣಿಕ ಮಾನ್ಯತೆಯನ್ನು ಪಡೆದಿದೆ. ವಿಭಾಗಗಳು ಅಂಗೀಕೃತ ಮಾನದಂಡಗಳನ್ನು ಮತ್ತು ಸ್ಥಿರ ಕಾರ್ಯಕ್ಷಮತೆಯನ್ನು ನಿರ್ವಹಿಸುತ್ತವೆ.',
    Hindi: 'संस्थान ने विश्वविद्यालय रैंक और शैक्षणिक मान्यता प्राप्त की है। विभाग मान्यता प्राप्त मानकों और लगातार प्रदर्शन बनाए रखते हैं।',
    Tamil: 'நிறுவனம் பல்கலைக்கழக தரவரிசைகள் மற்றும் கல்வி அங்கீகாரத்தைப் பெற்றுள்ளது. துறைகள் அங்கீகரிக்கப்பட்ட தரங்கள் மற்றும் நிலையான செயல்திறனை பராமரிக்கின்றன.',
    Telugu: 'సంస్థ విశ్వవిద్యాలయ ర్యాంకులు మరియు అకడమిక్ గుర్తింపు సాధించింది. విభాగాలు అక్రెడిటెడ్ స్టాండర్డ్స్ మరియు స్థిరమైన పనితీరును నిర్వహిస్తాయి.',
    Malayalam: 'സ്ഥാപനം യൂണിവേഴ്സിറ്റി റാങ്കുകളും അക്കാദമിക് അംഗീകാരവും നേടിയിട്ടുണ്ട്. ഡിപ്പാർട്ട്മെന്റുകൾ അംഗീകൃത മാനദണ്ഡങ്ങളും സ്ഥിരമായ പ്രകടനവും നിലനിർത്തുന്നു.',
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
  bookPage5Content: {
    English: 'Structured training programs prepare students for campus recruitment. Strong industry partnerships support internships and career growth.',
    Kannada: 'ರಚನಾತ್ಮಕ ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳು ವಿದ್ಯಾರ್ಥಿಗಳನ್ನು ಕ್ಯಾಂಪಸ್ ಭರ್ತಿಗಾಗಿ ತಯಾರಿ ಮಾಡುತ್ತವೆ. ಬಲವಾದ ಉದ್ಯೋಗ ಪಾಲುದಾರಿಕೆಗಳು ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು ಮತ್ತು ವೃತ್ತಿ ಬೆಳವಣಿಗೆಯನ್ನು ಬೆಂಬಲಿಸುತ್ತವೆ.',
    Hindi: 'संरचित प्रशिक्षण कार्यक्रम छात्रों को कैंपस प्लेसमेंट के लिए तैयार करते हैं। मजबूत उद्योग साझेदारी इंटर्नशिप और करियर विकास का समर्थन करती है।',
    Tamil: 'கட்டமைக்கப்பட்ட பயிற்சி நிரல்கள் மாணவர்களை வளாக தேர்வுக்கு தயார்படுத்துகின்றன. வலுவான தொழில் கூட்டாண்மைகள் பயிற்சி மற்றும் தொழில் வளர்ச்சிக்கு ஆதரவளிக்கின்றன.',
    Telugu: 'నిర్మాణాత్మక శిక్షణా కార్యక్రమాలు విద్యార్థులను క్యాంపస్ రిక్రూట్‌మెంట్ కోసం సిద్ధం చేస్తాయి. బలమైన ఇండస్ట్రీ పార్టనర్‌షిప్‌లు ఇంటర్న్‌షిప్‌లు మరియు కెరీర్ గ్రోత్‌కు మద్దతు ఇస్తాయి.',
    Malayalam: 'ഘടനാപരമായ പരിശീലന പ്രോഗ്രാമുകൾ വിദ്യാർത്ഥികളെ കാമ്പസ് റിക്രൂട്ട്മെന്റിനായി തയ്യാറാക്കുന്നു. ശക്തമായ ഇൻഡസ്ട്രി പാർട്നർഷിപ്പുകൾ ഇന്റേൺഷിപ്പുകളെയും കരിയർ വളർച്ചയെയും പിന്തുണയ്ക്കുന്നു.',
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
