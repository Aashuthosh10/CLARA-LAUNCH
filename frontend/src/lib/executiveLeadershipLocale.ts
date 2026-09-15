import type { Language } from '../context/LanguageContext';
import kannadaLocale from '@college-locales/kn.json';
import { uiText } from '../localization/uiCopy';

export type ExecutiveLeadershipCopy = {
  label: string;
  name: string;
  title: string;
  bio: string;
};

type KannadaExecutiveRoleHolders = {
  principal: { name: string; title: string; profile: string };
  vice_principal: { name: string; title: string; profile: string };
};

const kannadaExecutives = kannadaLocale.role_holders as KannadaExecutiveRoleHolders;

/** Dr. Manjunath T N — multilingual UI copy aligned with kiosk language. */
export const PRINCIPAL_COPY: Record<Language, ExecutiveLeadershipCopy> = {
  English: {
    label: 'Executive Profile',
    name: 'Dr. Manjunath T N',
    title: 'Principal',
    bio: 'Dr. Manjunath T N, Principal of Sai Vidya Institute of Technology, is an experienced academic and administrator with strong contributions to engineering education, research promotion, and institutional development, focusing on quality teaching, discipline, and holistic student growth while leading key initiatives that strengthen the college’s academic standards and industry relevance.',
  },
  Kannada: {
    label: uiText('Kannada', 'cards.leadership_profile'),
    name: kannadaExecutives.principal.name,
    title: kannadaExecutives.principal.title,
    bio: kannadaExecutives.principal.profile,
  },
  Hindi: {
    label: 'प्रोफ़ाइल',
    name: 'डॉ. मंजुनाथ टी एन',
    title: 'प्राचार्य',
    bio: 'डॉ. मंजुनाथ टी एन साई विद्या इंस्टीट्यूट ऑफ टेक्नोलॉजी के प्राचार्य हैं। वे एक अनुभवी शैक्षणिक व प्रशासक हैं, जिन्होंने इंजीनियरिंग शिक्षा, अनुसंधान और संस्थागत विकास में महत्वपूर्ण योगदान दिया है। वे गुणवत्तापूर्ण शिक्षण, अनुशासन और समग्र छात्र विकास पर केंद्रित रहकर ऐसी पहलों का नेतृत्व करते हैं जो कॉलेज की शैक्षणिक मानकों और उद्योग-सापेक्षता को मजबूत करती हैं।',
  },
  Tamil: {
    label: 'தலைமை அறிமுகம்',
    name: 'டாக்டர் மஞ்சுநாத் டி என்',
    title: 'முதல்வர்',
    bio: 'டாக்டர் மஞ்சுநாத் டி என் அவர்கள் சாயி வித்யா இன்ஸ்ட்டிட்யூட் ஆப் டெக்னாலஜியின் முதல்வர். பொறியியல் கல்வி, ஆய்வு உறுதுணை மற்றும் நிறுவன முன்னேற்றத்தில் அனுபவம் வாய்த்த தலைமை அதிகாரி. சிறந்த கற்பித்தல், ஒழுக்கம் மற்றும் மாணவர் முழுமையான வளர்ச்சி ஆகியவற்றில் கவனத்துடன், கல்லூரியின் கல்வித்தரத்தையும் தொழில்துறை முக்கியத்தையும் வலுப்படுத்தும் முக்கிய முனைப்புகளுக்குத் தலைமை தாங்குகிறார்.',
  },
  Telugu: {
    label: 'నాయకత్వ ప్రొఫైల్',
    name: 'డాక్టర్ మంజునాథ్ టి ఎన్',
    title: 'ప్రిన్సిపాల్',
    bio: 'డాక్టర్ మంజునాథ్ టి ఎన్ సాయి విద్యా ఇన్‌స్టిట్యూట్ ఆఫ్ టెక్నాలజీ ప్రిన్సిపాల్ గా ఉన్నారు. ఇంజినీరింగ్ విద్యా, పరిశోధన ప్రోత్సాహం మరియు సంస్థాగత అభివృద్ధిలో గణనీయ అనుభవం కలిగిన విద్యావేత్త మరియు నిర్వాహకులు. నాణ్యమైన బోధనా, అనుశాసనం మరియు విద్యార్థుల సమగ్రాభివృద్ధిపై దృష్టిపెట్టి పరిశ్రమకు దగ్గరగా ఉండే శైక్షణిక ప్రమాణాలను బలోపేతం చేయడంలో ప్రధాన కార్యక్రమాలకు నాయకత్వం వహిస్తారు.',
  },
  Malayalam: {
    label: 'നേതൃ പ്രൊഫൈൽ',
    name: 'ഡോ. മഞ്ജുനാഥ് ടി എൻ',
    title: 'പ്രിൻസിപ്പൽ',
    bio: 'ഡോ. മഞ്ജുനാഥ് ടി എൻ സായി വിദ്യാ ഇൻസ്റ്റിറ്റ്യൂറ്റ് ഒഫ് ടെക്നോളജിയുടെ പ്രിൻസിപ്പലാണ്. എഞ്ചിനീയറിംഗ് വിദ്യാഭ്യാസം, ഗവേഷണ പ്രോത്സാഹനം, സ്ഥാപന വികസനം എന്നിവയിൽ വിശാലമായ അനുഭവമുള്ള അദ്ധ്യാപക-ഭരണ വിദഗ്ധൻ. ഗുണമേമ്പമുള്ള ബോധനം, അച്ചടക്ക്, വിദ്യാർഥികളുടെ സമഗ്രമായ വളർച്ച എന്നിവ ലക്ഷ്യമാക്കി അക്കാദമിക് മാനദണ്ഡങ്ങളെയും ഗവേഷണ-വ്യാവസായിക ബന്ധം ഉറപ്പാക്കുന്ന ശ്രദ്ധേയമായ പരിപാടികൾക്ക് നേതൃത്വം നൽകുന്നു.',
  },
};

/** Dr. Lakshminarayanachari K */
/** Dr. Lakshminarayanachari K — Vice Principal */
export const VICE_PRINCIPAL_COPY: Record<Language, ExecutiveLeadershipCopy> = {
  English: {
    label: 'Executive Profile',
    name: 'Dr. Lakshminarayanachari K',
    title: 'Vice Principal',
    bio: 'Oversees the daily academic operations, institutional governance, and departmental coordination across all engineering branches to ensure alignment with university regulations.',
  },
  Kannada: {
    label: uiText('Kannada', 'cards.leadership_profile'),
    name: kannadaExecutives.vice_principal.name,
    title: 'ಉಪ ಪ್ರಾಂಶುಪಾಲರು',
    bio: 'ವಿಶ್ವವಿದ್ಯಾಲಯದ ನಿಯಮಗಳೊಂದಿಗೆ ಹೊಂದಾಣಿಕೆ ಖಚಿತಪಡಿಸಲು ಎಲ್ಲಾ ಎಂಜಿನಿಯರಿಂಗ್ ಶಾಖೆಗಳಲ್ಲಿ ದೈನಂದಿನ ಶೈಕ್ಷಣಿಕ ಕಾರ್ಯಾಚರಣೆಗಳು, ಸಂಸ್ಥೆಯ ಆಡಳಿತ ಮತ್ತು ವಿಭಾಗೀಯ ಸಮನ್ವಯವನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತಾರೆ.',
  },
  Hindi: {
    label: 'प्रोफ़ाइल',
    name: 'डॉ. लक्ष्मीनारायणाचारी के',
    title: 'उप प्राचार्य',
    bio: 'विश्वविद्यालय नियमों के साथ संरेखण सुनिश्चित करने हेतु सभी इंजीनियरिंग शाखाओं में दैनिक शैक्षणिक संचालन, संस्थागत शासन और विभागीय समन्वय की देखरेख करते हैं।',
  },
  Tamil: {
    label: 'தலைமை அறிமுகம்',
    name: 'டாக்டர் லக்ஷ்மிநாராயணச்சாரி கே',
    title: 'துணை முதல்வர்',
    bio: 'பல்கலைக்கழக விதிமுறைகளுடன் இணக்கம் உறுதிசெய்ய அனைத்து பொறியியல் பிரிவுகளிலும் அன்றாட கல்விச் செயல்பாடுகள், நிறுவன ஆளுமை மற்றும் துறை ஒருங்கிணைப்பை மேற்பார்வையிடுகிறார்.',
  },
  Telugu: {
    label: 'నాయకత్వ ప్రొఫైల్',
    name: 'డాక్టర్ లక్ష్మీనారాయణాచారి కె',
    title: 'ఉప ప్రిన్సిపాల్',
    bio: 'విశ్వవిద్యాలయ నిబంధనలతో అనుగుణ్యత నిర్ధారించడానికి అన్ని ఇంజినీరింగ్ శాఖల్లో రోజువారీ అకడెమిక్ కార్యకలాపాలు, సంస్థాగత పాలన మరియు విభాగీయ సమన్వయాన్ని పర్యవేక్షిస్తారు.',
  },
  Malayalam: {
    label: 'നേതൃ പ്രൊഫൈൽ',
    name: 'ഡോ. ലക്ഷ്മീനാരായണാചാരി കെ',
    title: 'ഉപ പ്രിൻസിപ്പൽ',
    bio: 'സർവകലാശാല നിയമങ്ങളുമായി യോജിപ്പ് ഉറപ്പാക്കാൻ എല്ലാ എഞ്ചിനീയറിംഗ് ശാഖകളിലും ദൈനംദിന അക്കാദമിക് പ്രവർത്തനങ്ങൾ, സ്ഥാപന ഭരണം, വകുപ്പ് ഏകോപനം എന്നിവയെ മേൽനോട്ടം ചെയ്യുന്നു.',
  },
};
