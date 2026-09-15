import type { Language } from '../context/LanguageContext';
import type { ExecutiveLeadershipCopy } from './executiveLeadershipLocale';
import deanAcademicsPortrait from '../assets/deans/DeanAcademics.jpg';
import deanAdministrationPortrait from '../assets/deans/DeanAdministration.jpg';
import deanStudentAffairsPortrait from '../assets/deans/DeanStudentAffairs.jpg';
import associateDeanRndPortrait from '../assets/deans/AssociateDeanR&D.jpg';
import deanInnovationPortrait from '../assets/deans/Professor&Dean(Innovation, Consultancy & Entrepreneurship).jpg';

export type DeanProfileId =
  | 'dean_academics'
  | 'dean_administration'
  | 'dean_student_affairs'
  | 'associate_dean_rnd'
  | 'dean_innovation';

export const DEAN_PROFILE_IDS: readonly DeanProfileId[] = [
  'dean_academics',
  'dean_administration',
  'dean_student_affairs',
  'associate_dean_rnd',
  'dean_innovation',
] as const;

export const DEAN_UNIT_IDS: Record<DeanProfileId, string> = {
  dean_academics: 'leadership.dean_academics',
  dean_administration: 'leadership.dean_administration',
  dean_student_affairs: 'leadership.dean_student_affairs',
  associate_dean_rnd: 'leadership.associate_dean_rnd',
  dean_innovation: 'leadership.dean_innovation',
};

export const DEAN_PORTRAITS: Record<DeanProfileId, string> = {
  dean_academics: deanAcademicsPortrait,
  dean_administration: deanAdministrationPortrait,
  dean_student_affairs: deanStudentAffairsPortrait,
  associate_dean_rnd: associateDeanRndPortrait,
  dean_innovation: deanInnovationPortrait,
};

const LABEL: Record<Language, string> = {
  English: 'Executive Profile',
  Kannada: 'ನಾಯಕತ್ವ ಪ್ರೊಫೈಲ್',
  Hindi: 'प्रोफ़ाइल',
  Tamil: 'தலைமை அறிமுகம்',
  Telugu: 'నాయకత్వ ప్రొఫైల్',
  Malayalam: 'നേതൃ പ്രൊഫൈൽ',
};

function pack(
  name: string,
  titleByLang: Record<Language, string>,
  bioByLang: Record<Language, string>,
): Record<Language, ExecutiveLeadershipCopy> {
  const out = {} as Record<Language, ExecutiveLeadershipCopy>;
  (Object.keys(LABEL) as Language[]).forEach((lang) => {
    out[lang] = {
      label: LABEL[lang],
      name,
      title: titleByLang[lang] || titleByLang.English,
      bio: bioByLang[lang] || bioByLang.English,
    };
  });
  return out;
}

/** Dr. Vrinda Shetty — Dean Academics */
export const DEAN_ACADEMICS_COPY = pack(
  'Dr. Vrinda Shetty',
  {
    English: 'Dean Academics',
    Kannada: 'ಶೈಕ್ಷಣಿಕ ಡೀನ್',
    Hindi: 'शैक्षणिक डीन',
    Tamil: 'கல்வி டீன்',
    Telugu: 'డీన్ అకడెమిక్స్',
    Malayalam: 'അക്കാദമിക് ഡീൻ',
  },
  {
    English:
      'Manages academic policies, curriculum delivery, timetables, internal assessment schedules, and overall educational standards across all departments.',
    Kannada:
      'ಎಲ್ಲಾ ವಿಭಾಗಗಳಲ್ಲಿ ಶೈಕ್ಷಣಿಕ ನೀತಿಗಳು, ಪಠ್ಯಕ್ರಮ ವಿತರಣೆ, ವೇಳಾಪಟ್ಟಿಗಳು, ಆಂತರಿಕ ಮೌಲ್ಯಮಾಪನ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಒಟ್ಟಾರೆ ಶೈಕ್ಷಣಿಕ ಮಾನದಂಡಗಳನ್ನು ನಿರ್ವಹಿಸುತ್ತಾರೆ.',
    Hindi:
      'सभी विभागों में शैक्षणिक नीतियाँ, पाठ्यक्रम वितरण, समय-सारणी, आंतरिक मूल्यांकन अनुसूची और समग्र शैक्षिक मानकों का प्रबंधन करती हैं।',
    Tamil:
      'அனைத்துத் துறைகளிலும் கல்விக் கொள்கைகள், பாடத்திட்ட வழங்கல், கால அட்டவணைகள், உள் மதிப்பீட்டு அட்டவணைகள் மற்றும் ஒட்டுமொத்த கல்வித் தரங்களை நிர்வகிக்கிறார்.',
    Telugu:
      'అన్ని విభాగాల్లో అకడెమిక్ విధానాలు, పాఠ్యప్రణాళిక అందించడం, టైమ్‌టేబుల్స్, అంతర్గత అసెస్‌మెంట్ షెడ్యూల్స్ మరియు మొత్తం విద్యా ప్రమాణాలను నిర్వహిస్తారు.',
    Malayalam:
      'എല്ലാ വകുപ്പുകളിലും അക്കാദമിക് നയങ്ങൾ, പാഠ്യപദ്ധതി നടത്തിപ്പ്, സമയക്രമങ്ങൾ, ആന്തരിക വിലയിരുത്തൽ ഷെഡ്യൂളുകൾ, മൊത്തത്തിലുള്ള വിദ്യാഭ്യാസ മാനദണ്ഡങ്ങൾ എന്നിവ നിയന്ത്രിക്കുന്നു.',
  },
);

/** Prof. R C Shanmukhaswamy — Dean Administration */
export const DEAN_ADMINISTRATION_COPY = pack(
  'Prof. R C Shanmukhaswamy',
  {
    English: 'Dean Administration',
    Kannada: 'ಆಡಳಿತ ಡೀನ್',
    Hindi: 'प्रशासन डीन',
    Tamil: 'நிர்வாக டீன்',
    Telugu: 'డీన్ అడ్మినిస్ట్రేషన్',
    Malayalam: 'ഭരണ ഡീൻ',
  },
  {
    English:
      'Handles campus administrative policies, regulatory compliance, infrastructure coordination, and operational management of institutional resources.',
    Kannada:
      'ಕ್ಯಾಂಪಸ್ ಆಡಳಿತ ನೀತಿಗಳು, ನಿಯಂತ್ರಕ ಅನುಸರಣೆ, ಮೂಲಸೌಕರ್ಯ ಸಮನ್ವಯ ಮತ್ತು ಸಂಸ್ಥೆಯ ಸಂಪನ್ಮೂಲಗಳ ಕಾರ್ಯಾಚರಣಾ ನಿರ್ವಹಣೆಯನ್ನು ನಿರ್ವಹಿಸುತ್ತಾರೆ.',
    Hindi:
      'परिसर प्रशासनिक नीतियाँ, नियामक अनुपालन, अवसंरचना समन्वय और संस्थागत संसाधनों के परिचालन प्रबंधन का ध्यान रखते हैं।',
    Tamil:
      'வளாகம் நிர்வாகக் கொள்கைகள், ஒழுங்குமுறை இணக்கம், உள்கட்டமைப்பு ஒருங்கிணைப்பு மற்றும் நிறுவன வளங்களின் செயல்பாட்டு நிர்வாகத்தை கையாள்கிறார்.',
    Telugu:
      'క్యాంపస్ పరిపాలనా విధానాలు, నియంత్రణ సమ్మతి, మౌలిక సదుపాయాల సమన్వయం మరియు సంస్థ వనరుల కార్యాచరణ నిర్వహణను చూసుకుంటారు.',
    Malayalam:
      'ക്യാമ്പസ് ഭരണനയങ്ങൾ, നിയന്ത്രണ അനുസരണം, അടിസ്ഥാനസൗകര്യ ഏകോപനം, സ്ഥാപന വിഭവങ്ങളുടെ പ്രവർത്തന മാനേജ്‌മെന്റ് എന്നിവ കൈകാര്യം ചെയ്യുന്നു.',
  },
);

/** Dr. T G Manjunatha — Dean Student Affairs */
export const DEAN_STUDENT_AFFAIRS_COPY = pack(
  'Dr. T G Manjunatha',
  {
    English: 'Dean Student Affairs',
    Kannada: 'ವಿದ್ಯಾರ್ಥಿ ವ್ಯವಹಾರಗಳ ಡೀನ್',
    Hindi: 'छात्र मामलों के डीन',
    Tamil: 'மாணவர் விவகார டீன்',
    Telugu: 'డీన్ స్టూడెంట్ అఫైర్స్',
    Malayalam: 'വിദ്യാർത്ഥി കാര്യ ഡീൻ',
  },
  {
    English:
      'Directs student welfare programs, discipline, extracurricular activities, student clubs, and campus events to ensure holistic student development.',
    Kannada:
      'ವಿದ್ಯಾರ್ಥಿಗಳ ಸಮಗ್ರ ಅಭಿವೃದ್ಧಿಗಾಗಿ ಕಲ್ಯಾಣ ಕಾರ್ಯಕ್ರಮಗಳು, ಶಿಸ್ತು, ಪಠ್ಯೇತರ ಚಟುವಟಿಕೆಗಳು, ವಿದ್ಯಾರ್ಥಿ ಕ್ಲಬ್‌ಗಳು ಮತ್ತು ಕ್ಯಾಂಪಸ್ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ನಿರ್ದೇಶಿಸುತ್ತಾರೆ.',
    Hindi:
      'समग्र छात्र विकास सुनिश्चित करने हेतु छात्र कल्याण कार्यक्रमों, अनुशासन, पाठ्येतर गतिविधियों, छात्र क्लबों और परिसर आयोजनों का निर्देशन करते हैं।',
    Tamil:
      'மாணவர் நலத்திட்டங்கள், ஒழுக்கம், பாடநெறிக்கு அப்பாற்பட்ட செயல்பாடுகள், மாணவர் மன்றங்கள் மற்றும் வளாக நிகழ்வுகளை வழிநடத்தி முழுமையான மாணவர் வளர்ச்சியை உறுதி செய்கிறார்.',
    Telugu:
      'విద్యార్థుల సమగ్ర అభివృద్ధికి విద్యార్థి సంక్షేమ కార్యక్రమాలు, క్రమశిక్షణ, పాఠ్యేతర కార్యకలాపాలు, విద్యార్థి క్లబ్‌లు మరియు క్యాంపస్ ఈవెంట్‌లను నిర్దేశిస్తారు.',
    Malayalam:
      'വിദ്യാർത്ഥികളുടെ സമഗ്ര വികസനത്തിനായി ക്ഷേമ പദ്ധതികൾ, അച്ചടക്കം, പാഠ്യേതര പ്രവർത്തനങ്ങൾ, ക്ലബ്ബുകൾ, ക്യാമ്പസ് പരിപാടികൾ എന്നിവയെ നയിക്കുന്നു.',
  },
);

/** Dr. Shantha Kumar B Patil — Associate Dean R&D */
export const ASSOCIATE_DEAN_RND_COPY = pack(
  'Dr. Shantha Kumar B Patil',
  {
    English: 'Associate Dean R&D',
    Kannada: 'ಸಹಾಯಕ ಡೀನ್ (ಸಂಶೋಧನೆ ಮತ್ತು ಅಭಿವೃದ್ಧಿ)',
    Hindi: 'एसोसिएट डीन (अनुसंधान एवं विकास)',
    Tamil: 'இணை டீன் (ஆராய்ச்சி மற்றும் மேம்பாடு)',
    Telugu: 'అసోసియేట్ డీన్ (R&D)',
    Malayalam: 'അസോസിയേറ്റ് ഡീൻ (ഗവേഷണം & വികസനം)',
  },
  {
    English:
      'Supports institutional research ecosystem initiatives, interdisciplinary project development, research grant applications, and scholarly publications.',
    Kannada:
      'ಸಂಸ್ಥೆಯ ಸಂಶೋಧನಾ ಪರಿಸರ ವ್ಯವಸ್ಥೆ, ಅಂತರಶಿಸ್ತೀಯ ಯೋಜನೆಗಳು, ಸಂಶೋಧನಾ ಅನುದಾನ ಅರ್ಜಿಗಳು ಮತ್ತು ವೈಜ್ಞಾನಿಕ ಪ್ರಕಟಣೆಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತಾರೆ.',
    Hindi:
      'संस्थागत अनुसंधान पारिस्थितिकी तंत्र पहलों, अंतर-विषयक परियोजना विकास, अनुसंधान अनुदान आवेदनों और विद्वत्तापूर्ण प्रकाशनों का समर्थन करते हैं।',
    Tamil:
      'நிறுவன ஆராய்ச்சி சூழல் முயற்சிகள், பலதுறை திட்ட மேம்பாடு, ஆராய்ச்சி மானிய விண்ணப்பங்கள் மற்றும் அறிவியல் வெளியீடுகளை ஆதரிக்கிறார்.',
    Telugu:
      'సంస్థాగత పరిశోధన పర్యావరణ వ్యవస్థ కార్యక్రమాలు, అంతర్‌విభాగ ప్రాజెక్ట్ అభివృద్ధి, పరిశోధన గ్రాంట్ దరఖాస్తులు మరియు విద్వత్పూర్వక ప్రచురణలకు మద్దతు ఇస్తారు.',
    Malayalam:
      'സ്ഥാപന ഗവേഷണ പരിസ്ഥിതി സംരംഭങ്ങൾ, അന്തർവിഭാഗ പദ്ധതി വികസനം, ഗവേഷണ ഗ്രാന്റ് അപേക്ഷകൾ, വിദ്വത്ത് പ്രസിദ്ധീകരണങ്ങൾ എന്നിവയെ പിന്തുണയ്ക്കുന്നു.',
  },
);

/** Dr. Venkatesha M — Dean Innovation / Consultancy / Entrepreneurship */
export const DEAN_INNOVATION_COPY = pack(
  'Dr. Venkatesha M',
  {
    English: 'Professor & Dean (Innovation, Consultancy & Entrepreneurship)',
    Kannada: 'ಪ್ರಾಧ್ಯಾಪಕರು ಮತ್ತು ಡೀನ್ (ನಾವೀನ್ಯತೆ, ಸಲಹಾ ಸೇವೆ ಮತ್ತು ಉದ್ಯಮಶೀಲತೆ)',
    Hindi: 'प्रोफेसर एवं डीन (नवाचार, परामर्श एवं उद्यमिता)',
    Tamil: 'பேராசிரியர் மற்றும் டீன் (புத்தாக்கம், ஆலோசனை மற்றும் தொழில்முனைவு)',
    Telugu: 'ప్రొఫెసర్ & డీన్ (ఇన్నోవేషన్, కన్సల్టెన్సీ & ఎంటర్‌ప్రెన్యూర్‌షిప్)',
    Malayalam: 'പ്രൊഫസർ & ഡീൻ (ഇന്നവേഷൻ, കൺസൾട്ടൻസി & സംരംഭകത്വം)',
  },
  {
    English:
      'Drives innovation culture, industry consultancy initiatives, start-up incubation, and institutional entrepreneurship cells to bridge academia with industry.',
    Kannada:
      'ಶೈಕ್ಷಣಿಕತೆಯನ್ನು ಉದ್ಯಮದೊಂದಿಗೆ ಸೇರಿಸಲು ನಾವೀನ್ಯತೆ ಸಂಸ್ಕೃತಿ, ಉದ್ಯಮ ಸಲಹಾ ಉಪಕ್ರಮಗಳು, ಸ್ಟಾರ್ಟ್-ಅಪ್ ಇನ್ಕ್ಯುಬೇಷನ್ ಮತ್ತು ಸಂಸ್ಥೆಯ ಉದ್ಯಮಶೀಲತಾ ಕೋಶಗಳನ್ನು ಮುನ್ನಡೆಸುತ್ತಾರೆ.',
    Hindi:
      'शिक्षा और उद्योग के बीच सेतु बनाने हेतु नवाचार संस्कृति, उद्योग परामर्श पहलों, स्टार्ट-अप इनक्यूबेशन और संस्थागत उद्यमिता प्रकोष्ठों का नेतृत्व करते हैं।',
    Tamil:
      'கல்வியையும் தொழில்துறையையும் இணைக்க புத்தாக்கப் பண்பாடு, தொழில்துறை ஆலோசனை முயற்சிகள், தொடக்க நிறுவன வளர்ப்பு மற்றும் நிறுவன தொழில்முனைவு அறைகளை முன்னெடுக்கிறார்.',
    Telugu:
      'విద్యా-పరిశ్రమ వారధికి ఇన్నోవేషన్ సంస్కృతి, పరిశ్రమ కన్సల్టెన్సీ కార్యక్రమాలు, స్టార్ట్-అప్ ఇన్క్యుబేషన్ మరియు సంస్థాగత ఎంటర్‌ప్రెన్యూర్‌షిప్ సెల్స్‌ను నడిపిస్తారు.',
    Malayalam:
      'അക്കാദമിയെയും വ്യവസായത്തെയും ബന്ധിപ്പിക്കാൻ ഇന്നവേഷൻ സംസ്കാരം, വ്യവസായ കൺസൾട്ടൻസി സംരംഭങ്ങൾ, സ്റ്റാർട്ടപ്പ് ഇൻക്യുബേഷൻ, സ്ഥാപന സംരംഭകത്വ സെല്ലുകൾ എന്നിവയെ നയിക്കുന്നു.',
  },
);

export const DEAN_COPY_BY_ID: Record<DeanProfileId, Record<Language, ExecutiveLeadershipCopy>> = {
  dean_academics: DEAN_ACADEMICS_COPY,
  dean_administration: DEAN_ADMINISTRATION_COPY,
  dean_student_affairs: DEAN_STUDENT_AFFAIRS_COPY,
  associate_dean_rnd: ASSOCIATE_DEAN_RND_COPY,
  dean_innovation: DEAN_INNOVATION_COPY,
};

export function deanIdFromUnitId(unitId: string | null | undefined): DeanProfileId | null {
  const uid = (unitId || '').trim().toLowerCase();
  for (const id of DEAN_PROFILE_IDS) {
    if (DEAN_UNIT_IDS[id] === uid) return id;
  }
  return null;
}

export function deanIdFromCardTrigger(trigger: string | null | undefined): DeanProfileId | null {
  const n = (trigger || '').trim().toLowerCase();
  if (!n) return null;
  if (
    n === 'dean_academics' ||
    n === 'dean_academic' ||
    n === 'dean_of_academics' ||
    n === 'academic_dean'
  ) {
    return 'dean_academics';
  }
  if (n === 'dean_administration' || n === 'dean_admin' || n === 'administration_dean') {
    return 'dean_administration';
  }
  if (
    n === 'dean_student_affairs' ||
    n === 'dean_students' ||
    n === 'student_affairs_dean' ||
    n === 'dean_of_student_affairs'
  ) {
    return 'dean_student_affairs';
  }
  if (
    n === 'associate_dean_rnd' ||
    n === 'associate_dean_rd' ||
    n === 'dean_rnd' ||
    n === 'dean_r_and_d' ||
    n === 'associate_dean'
  ) {
    return 'associate_dean_rnd';
  }
  if (
    n === 'dean_innovation' ||
    n === 'dean_entrepreneurship' ||
    n === 'dean_consultancy' ||
    n === 'innovation_dean'
  ) {
    return 'dean_innovation';
  }
  return null;
}
