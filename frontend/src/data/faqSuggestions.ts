import type { Language } from '../context/LanguageContext';

export type FaqSuggestionCategory =
  | 'college'
  | 'departments'
  | 'admissions'
  | 'fees'
  | 'placements'
  | 'academic'
  | 'campus';

export type FaqSuggestion = {
  id: string;
  categories: FaqSuggestionCategory[];
  questions: Record<Language, string>;
};

const FAQ_SUGGESTIONS: FaqSuggestion[] = [
  {
    id: 'college-private',
    categories: ['college'],
    questions: {
      English: 'Is SVIT a private college or government college?',
      Kannada: 'SVIT ಖಾಸಗಿ ಕಾಲೇಜೇ ಅಥವಾ ಸರ್ಕಾರಿ ಕಾಲೇಜೇ?',
      Hindi: 'SVIT निजी कॉलेज है या सरकारी कॉलेज?',
      Tamil: 'SVIT தனியார் கல்லூரியா அல்லது அரசு கல்லூரியா?',
      Telugu: 'SVIT ప్రైవేట్ కాలేజీనా లేక ప్రభుత్వ కాలేజీనా?',
      Malayalam: 'SVIT ഒരു സ്വകാര്യ കോളേജാണോ സർക്കാർ കോളേജാണോ?',
    },
  },
  {
    id: 'college-special',
    categories: ['college', 'academic'],
    questions: {
      English: 'What is special about SVIT compared to other colleges?',
      Kannada: 'ಇತರೆ ಕಾಲೇಜುಗಳಿಗಿಂತ SVIT ನಲ್ಲಿ ವಿಶೇಷವೇನು?',
      Hindi: 'दूसरे कॉलेजों की तुलना में SVIT में क्या खास है?',
      Tamil: 'மற்ற கல்லூரிகளுடன் ஒப்பிடும்போது SVIT-இல் என்ன சிறப்பு?',
      Telugu: 'ఇతర కాలేజీలతో పోలిస్తే SVIT లో ప్రత్యేకత ఏమిటి?',
      Malayalam: 'മറ്റു കോളേജുകളുമായി താരതമ്യം ചെയ്യുമ്പോൾ SVIT-ന്റെ പ്രത്യേകത എന്താണ്?',
    },
  },
  {
    id: 'best-department',
    categories: ['college', 'departments'],
    questions: {
      English: 'Which is the best department in SVIT?',
      Kannada: 'SVIT ನಲ್ಲಿ ಅತ್ಯುತ್ತಮ ವಿಭಾಗ ಯಾವುದು?',
      Hindi: 'SVIT में सबसे अच्छा विभाग कौन सा है?',
      Tamil: 'SVIT-இல் சிறந்த துறை எது?',
      Telugu: 'SVIT లో ఉత్తమ విభాగం ఏది?',
      Malayalam: 'SVIT-ൽ ഏറ്റവും മികച്ച വകുപ്പ് ഏതാണ്?',
    },
  },
  {
    id: 'software-jobs',
    categories: ['college', 'departments', 'placements'],
    questions: {
      English: 'Which department is best for software jobs?',
      Kannada: 'ಸಾಫ್ಟ್‌ವೇರ್ ಉದ್ಯೋಗಗಳಿಗೆ ಯಾವ ವಿಭಾಗ ಉತ್ತಮ?',
      Hindi: 'सॉफ्टवेयर नौकरियों के लिए कौन सा विभाग सबसे अच्छा है?',
      Tamil: 'மென்பொருள் வேலைகளுக்கு எந்த துறை சிறந்தது?',
      Telugu: 'సాఫ్ట్‌వేర్ ఉద్యోగాలకు ఏ విభాగం ఉత్తమం?',
      Malayalam: 'സോഫ്റ്റ്‌വെയർ ജോലികൾക്ക് ഏത് വകുപ്പ് മികച്ചതാണ്?',
    },
  },
  {
    id: 'core-jobs',
    categories: ['college', 'departments', 'placements'],
    questions: {
      English: 'Which department is best for core jobs?',
      Kannada: 'ಕೋರ್ ಉದ್ಯೋಗಗಳಿಗೆ ಯಾವ ವಿಭಾಗ ಉತ್ತಮ?',
      Hindi: 'कोर नौकरियों के लिए कौन सा विभाग सबसे अच्छा है?',
      Tamil: 'கோர் வேலைகளுக்கு எந்த துறை சிறந்தது?',
      Telugu: 'కోర్ ఉద్యోగాలకు ఏ విభాగం ఉత్తమం?',
      Malayalam: 'കോർ ജോലികൾക്ക് ഏത് വകുപ്പ് മികച്ചതാണ്?',
    },
  },
  {
    id: 'vtu-syllabus',
    categories: ['college', 'academic'],
    questions: {
      English: 'Does the college follow VTU syllabus?',
      Kannada: 'ಕಾಲೇಜು VTU ಪಠ್ಯಕ್ರಮವನ್ನು ಅನುಸರಿಸುತ್ತದೆಯೇ?',
      Hindi: 'क्या कॉलेज VTU पाठ्यक्रम का पालन करता है?',
      Tamil: 'கல்லூரி VTU பாடத்திட்டத்தை பின்பற்றுகிறதா?',
      Telugu: 'కళాశాల VTU సిలబస్‌ను అనుసరిస్తుందా?',
      Malayalam: 'കോളേജ് VTU സിലബസ് പിന്തുടരുന്നുണ്ടോ?',
    },
  },
  {
    id: 'faculty-experience',
    categories: ['departments', 'academic'],
    questions: {
      English: 'How experienced are the faculty members?',
      Kannada: 'ಫ್ಯಾಕಲ್ಟಿ ಸದಸ್ಯರಿಗೆ ಎಷ್ಟು ಅನುಭವವಿದೆ?',
      Hindi: 'फैकल्टी सदस्य कितने अनुभवी हैं?',
      Tamil: 'ஆசிரியர்கள் எவ்வளவு அனுபவம் வாய்ந்தவர்கள்?',
      Telugu: 'ఫ్యాకల్టీ సభ్యులు ఎంత అనుభవం ఉన్నవారు?',
      Malayalam: 'അധ്യാപകർക്ക് എത്രത്തോളം പരിചയമുണ്ട്?',
    },
  },
  {
    id: 'phd-faculty',
    categories: ['departments', 'academic'],
    questions: {
      English: 'Does the department have PhD faculty?',
      Kannada: 'ವಿಭಾಗದಲ್ಲಿ PhD ಫ್ಯಾಕಲ್ಟಿ ಇದೆಯೇ?',
      Hindi: 'क्या विभाग में PhD फैकल्टी है?',
      Tamil: 'துறையில் PhD ஆசிரியர்கள் உள்ளனரா?',
      Telugu: 'విభాగంలో PhD ఫ్యాకల్టీ ఉందా?',
      Malayalam: 'വകുപ്പിൽ PhD അധ്യാപകർ ഉണ്ടോ?',
    },
  },
  {
    id: 'original-documents',
    categories: ['admissions'],
    questions: {
      English: 'Do I need original documents during admission?',
      Kannada: 'ಪ್ರವೇಶ ಸಮಯದಲ್ಲಿ ಮೂಲ ದಾಖಲೆಗಳು ಬೇಕೇ?',
      Hindi: 'क्या प्रवेश के समय मूल दस्तावेज चाहिए?',
      Tamil: 'சேர்க்கையின் போது அசல் ஆவணங்கள் தேவைப்படுமா?',
      Telugu: 'అడ్మిషన్ సమయంలో ఒరిజినల్ డాక్యుమెంట్లు అవసరమా?',
      Malayalam: 'അഡ്മിഷൻ സമയത്ത് ഒറിജിനൽ രേഖകൾ ആവശ്യമാണോ?',
    },
  },
  {
    id: 'lateral-entry',
    categories: ['admissions', 'academic'],
    questions: {
      English: 'Can diploma students join through lateral entry?',
      Kannada: 'ಡಿಪ್ಲೊಮಾ ವಿದ್ಯಾರ್ಥಿಗಳು ಲ್ಯಾಟರಲ್ ಎಂಟ್ರಿ ಮೂಲಕ ಸೇರುವುದೇ?',
      Hindi: 'क्या डिप्लोमा छात्र lateral entry से प्रवेश ले सकते हैं?',
      Tamil: 'டிப்ளமோ மாணவர்கள் lateral entry மூலம் சேர முடியுமா?',
      Telugu: 'డిప్లొమా విద్యార్థులు lateral entry ద్వారా చేరగలరా?',
      Malayalam: 'ഡിപ്ലോമ വിദ്യാർത്ഥികൾക്ക് lateral entry വഴി ചേരാനാകുമോ?',
    },
  },
  {
    id: 'outside-karnataka',
    categories: ['admissions'],
    questions: {
      English: 'Can students from outside Karnataka apply?',
      Kannada: 'ಕರ್ನಾಟಕದ ಹೊರಗಿನ ವಿದ್ಯಾರ್ಥಿಗಳು ಅರ್ಜಿ ಹಾಕಬಹುದೇ?',
      Hindi: 'क्या कर्नाटक के बाहर के छात्र आवेदन कर सकते हैं?',
      Tamil: 'கர்நாடகத்திற்கு வெளியே உள்ள மாணவர்கள் விண்ணப்பிக்க முடியுமா?',
      Telugu: 'కర్ణాటక వెలుపలి విద్యార్థులు దరఖాస్తు చేసుకోవచ్చా?',
      Malayalam: 'കർണാടകയ്ക്ക് പുറത്തുള്ള വിദ്യാർത്ഥികൾക്ക് അപേക്ഷിക്കാമോ?',
    },
  },
  {
    id: 'submit-documents',
    categories: ['admissions'],
    questions: {
      English: 'Where can I submit documents?',
      Kannada: 'ದಾಖಲೆಗಳನ್ನು ಎಲ್ಲಿ ಸಲ್ಲಿಸಬಹುದು?',
      Hindi: 'मैं दस्तावेज कहाँ जमा कर सकता हूँ?',
      Tamil: 'ஆவணங்களை எங்கு சமர்ப்பிக்கலாம்?',
      Telugu: 'నేను డాక్యుమెంట్లను ఎక్కడ సమర్పించాలి?',
      Malayalam: 'രേഖകൾ എവിടെ സമർപ്പിക്കാം?',
    },
  },
  {
    id: 'admission-office',
    categories: ['admissions', 'campus'],
    questions: {
      English: 'Where is the admission office?',
      Kannada: 'ಅಡ್ಮಿಷನ್ ಕಚೇರಿ ಎಲ್ಲಿದೆ?',
      Hindi: 'एडमिशन ऑफिस कहाँ है?',
      Tamil: 'சேர்க்கை அலுவலகம் எங்கே உள்ளது?',
      Telugu: 'అడ్మిషన్ ఆఫీస్ ఎక్కడ ఉంది?',
      Malayalam: 'അഡ്മിഷൻ ഓഫീസ് എവിടെയാണ്?',
    },
  },
  {
    id: 'merit-concession',
    categories: ['fees'],
    questions: {
      English: 'Is there a fee concession for merit students?',
      Kannada: 'ಮೆರಿಟ್ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಶುಲ್ಕ ರಿಯಾಯಿತಿ ಇದೆಯೇ?',
      Hindi: 'क्या मेरिट छात्रों के लिए फीस में रियायत है?',
      Tamil: 'மெரிட் மாணவர்களுக்கு கட்டண சலுகை உள்ளதா?',
      Telugu: 'మెరిట్ విద్యార్థులకు ఫీజు రాయితీ ఉందా?',
      Malayalam: 'മെറിറ്റ് വിദ്യാർത്ഥികൾക്ക് ഫീസ് ഇളവ് ഉണ്ടോ?',
    },
  },
  {
    id: 'bank-loan-letters',
    categories: ['fees', 'admissions'],
    questions: {
      English: 'Are there bank loan support letters from the college?',
      Kannada: 'ಕಾಲೇಜಿನಿಂದ ಬ್ಯಾಂಕ್ ಸಾಲ ಬೆಂಬಲ ಪತ್ರಗಳು ಸಿಗುತ್ತವೆಯೇ?',
      Hindi: 'क्या कॉलेज से बैंक लोन सपोर्ट लेटर मिलते हैं?',
      Tamil: 'கல்லூரியில் இருந்து வங்கி கடன் ஆதரவு கடிதங்கள் கிடைக்குமா?',
      Telugu: 'కాలేజీ నుంచి బ్యాంక్ లోన్ సపోర్ట్ లెటర్లు ఉంటాయా?',
      Malayalam: 'കോളേജിൽ നിന്ന് ബാങ്ക് ലോൺ പിന്തുണാ കത്തുകൾ ലഭിക്കുമോ?',
    },
  },
  {
    id: 'fee-clarification-contact',
    categories: ['fees'],
    questions: {
      English: 'Whom should I contact for fee clarification?',
      Kannada: 'ಶುಲ್ಕ ಸ್ಪಷ್ಟೀಕರಣಕ್ಕೆ ಯಾರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕು?',
      Hindi: 'फीस की जानकारी के लिए किससे संपर्क करना चाहिए?',
      Tamil: 'கட்டண விளக்கத்திற்கு யாரை தொடர்பு கொள்ள வேண்டும்?',
      Telugu: 'ఫీజు స్పష్టత కోసం ఎవరిని సంప్రదించాలి?',
      Malayalam: 'ഫീസ് വിശദീകരണത്തിന് ആരെ ബന്ധപ്പെടണം?',
    },
  },
  {
    id: 'placement-training-fee',
    categories: ['fees', 'placements'],
    questions: {
      English: 'Is there any separate fee for placement training?',
      Kannada: 'ಪ್ಲೇಸ್‌ಮೆಂಟ್ ತರಬೇತಿಗೆ ಪ್ರತ್ಯೇಕ ಶುಲ್ಕವಿದೆಯೇ?',
      Hindi: 'क्या प्लेसमेंट ट्रेनिंग के लिए अलग फीस है?',
      Tamil: 'பிளேஸ்மென்ட் பயிற்சிக்கு தனி கட்டணம் உள்ளதா?',
      Telugu: 'ప్లేస్‌మెంట్ ట్రైనింగ్‌కు ప్రత్యేక ఫీజు ఉందా?',
      Malayalam: 'പ്ലേസ്മെന്റ് ട്രെയിനിംഗിന് വേറെ ഫീസ് ഉണ്ടോ?',
    },
  },
  {
    id: 'hostel-mess-fee',
    categories: ['fees', 'campus'],
    questions: {
      English: 'Are hostel mess charges included in hostel fees?',
      Kannada: 'ಹಾಸ್ಟೆಲ್ ಶುಲ್ಕದಲ್ಲಿ ಮೆಸ್ ಶುಲ್ಕ ಸೇರಿಕೊಂಡಿದೆಯೇ?',
      Hindi: 'क्या हॉस्टल फीस में मेस शुल्क शामिल है?',
      Tamil: 'ஹாஸ்டல் கட்டணத்தில் மெஸ் கட்டணம் சேர்க்கப்பட்டுள்ளதா?',
      Telugu: 'హాస్టల్ ఫీజులో మెస్ ఛార్జీలు చేర్చబడుతాయా?',
      Malayalam: 'ഹോസ്റ്റൽ ഫീസിൽ മെസ് ചാർജുകൾ ഉൾപ്പെടുന്നുണ്ടോ?',
    },
  },
  {
    id: 'admission-refund',
    categories: ['fees', 'admissions'],
    questions: {
      English: 'Is there a refund policy if I cancel admission?',
      Kannada: 'ಪ್ರವೇಶ ರದ್ದು ಮಾಡಿದರೆ ರಿಫಂಡ್ ನೀತಿ ಇದೆಯೇ?',
      Hindi: 'अगर मैं एडमिशन रद्द करूँ तो क्या refund policy है?',
      Tamil: 'சேர்க்கையை ரத்து செய்தால் refund policy உள்ளதா?',
      Telugu: 'అడ్మిషన్ రద్దు చేస్తే రిఫండ్ పాలసీ ఉందా?',
      Malayalam: 'അഡ്മിഷൻ റദ്ദാക്കിയാൽ refund policy ഉണ്ടോ?',
    },
  },
  {
    id: 'core-companies',
    categories: ['placements', 'departments'],
    questions: {
      English: 'Do core companies visit for ECE, Civil, and Mechanical?',
      Kannada: 'ECE, Civil ಮತ್ತು Mechanical ಗೆ ಕೋರ್ ಕಂಪನಿಗಳು ಬರುತ್ತವೆಯೇ?',
      Hindi: 'क्या ECE, Civil और Mechanical के लिए core companies आती हैं?',
      Tamil: 'ECE, Civil, Mechanical துறைகளுக்கு core companies வருகிறதா?',
      Telugu: 'ECE, Civil, Mechanical కోసం core companies వస్తాయా?',
      Malayalam: 'ECE, Civil, Mechanical വിഭാഗങ്ങൾക്ക് core companies വരാറുണ്ടോ?',
    },
  },
  {
    id: 'placed-before-graduation',
    categories: ['placements'],
    questions: {
      English: 'Are students placed before graduation?',
      Kannada: 'ವಿದ್ಯಾರ್ಥಿಗಳು ಪದವಿ ಮುಗಿಸುವ ಮೊದಲು ಪ್ಲೇಸ್ ಆಗುತ್ತಾರೆಯೇ?',
      Hindi: 'क्या छात्र graduation से पहले placed हो जाते हैं?',
      Tamil: 'மாணவர்கள் பட்டம் பெறுவதற்கு முன் placed ஆகிறார்களா?',
      Telugu: 'విద్యార్థులు గ్రాడ్యుయేషన్‌కు ముందు placed అవుతారా?',
      Malayalam: 'വിദ്യാർത്ഥികൾ graduation-ന് മുമ്പ് placed ആകുമോ?',
    },
  },
  {
    id: 'parents-placement-officer',
    categories: ['placements', 'campus'],
    questions: {
      English: 'Can parents meet the placement officer?',
      Kannada: 'ಪೋಷಕರು ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಅಧಿಕಾರಿಯನ್ನು ಭೇಟಿ ಮಾಡಬಹುದೇ?',
      Hindi: 'क्या माता-पिता placement officer से मिल सकते हैं?',
      Tamil: 'பெற்றோர் placement officer-ஐ சந்திக்க முடியுமா?',
      Telugu: 'తల్లిదండ్రులు placement officer ని కలవవచ్చా?',
      Malayalam: 'മാതാപിതാക്കൾക്ക് placement officer-നെ കാണാനാകുമോ?',
    },
  },
  {
    id: 'course-syllabus',
    categories: ['academic', 'departments'],
    questions: {
      English: 'Can I get the syllabus for my course?',
      Kannada: 'ನನ್ನ ಕೋರ್ಸ್ ಪಠ್ಯಕ್ರಮ ಸಿಗುತ್ತದೆಯೇ?',
      Hindi: 'क्या मुझे अपने कोर्स का syllabus मिल सकता है?',
      Tamil: 'என் course-க்கு syllabus கிடைக்குமா?',
      Telugu: 'నా కోర్స్ syllabus దొరుకుతుందా?',
      Malayalam: 'എന്റെ course-ന്റെ syllabus ലഭിക്കുമോ?',
    },
  },
  {
    id: 'bridge-courses',
    categories: ['academic', 'admissions'],
    questions: {
      English: 'Are there bridge courses for first-year students?',
      Kannada: 'ಮೊದಲ ವರ್ಷದ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಬ್ರಿಡ್ಜ್ ಕೋರ್ಸ್‌ಗಳಿವೆಯೇ?',
      Hindi: 'क्या first-year students के लिए bridge courses हैं?',
      Tamil: 'முதல் ஆண்டு மாணவர்களுக்கு bridge courses உள்ளனவா?',
      Telugu: 'మొదటి సంవత్సరం విద్యార్థులకు bridge courses ఉన్నాయా?',
      Malayalam: 'ഒന്നാം വർഷ വിദ്യാർത്ഥികൾക്ക് bridge courses ഉണ്ടോ?',
    },
  },
  {
    id: 'project-support',
    categories: ['academic', 'departments'],
    questions: {
      English: 'Does the college offer project support?',
      Kannada: 'ಕಾಲೇಜು ಪ್ರಾಜೆಕ್ಟ್ ಬೆಂಬಲ ನೀಡುತ್ತದೆಯೇ?',
      Hindi: 'क्या कॉलेज project support देता है?',
      Tamil: 'கல்லூரி project support வழங்குகிறதா?',
      Telugu: 'కళాశాల project support అందిస్తుందా?',
      Malayalam: 'കോളേജ് project support നൽകുന്നുണ്ടോ?',
    },
  },
  {
    id: 'clubs-events',
    categories: ['academic', 'campus'],
    questions: {
      English: 'Are there clubs and technical events?',
      Kannada: 'ಕ್ಲಬ್‌ಗಳು ಮತ್ತು ತಾಂತ್ರಿಕ ಕಾರ್ಯಕ್ರಮಗಳಿವೆಯೇ?',
      Hindi: 'क्या clubs और technical events हैं?',
      Tamil: 'clubs மற்றும் technical events உள்ளனவா?',
      Telugu: 'clubs మరియు technical events ఉన్నాయా?',
      Malayalam: 'clubs ഉം technical events ഉം ഉണ്ടോ?',
    },
  },
  {
    id: 'industrial-visits',
    categories: ['academic'],
    questions: {
      English: 'Are there industrial visits?',
      Kannada: 'Industrial visits ಇದೆಯೇ?',
      Hindi: 'क्या industrial visits होती हैं?',
      Tamil: 'industrial visits உள்ளனவா?',
      Telugu: 'industrial visits ఉంటాయా?',
      Malayalam: 'industrial visits ഉണ്ടോ?',
    },
  },
  {
    id: 'workshops-seminars',
    categories: ['academic'],
    questions: {
      English: 'Are there workshops and seminars?',
      Kannada: 'ವರ್ಕ್‌ಶಾಪ್‌ಗಳು ಮತ್ತು ಸೆಮಿನಾರ್‌ಗಳಿವೆಯೇ?',
      Hindi: 'क्या workshops और seminars होते हैं?',
      Tamil: 'workshops மற்றும் seminars உள்ளனவா?',
      Telugu: 'workshops మరియు seminars ఉంటాయా?',
      Malayalam: 'workshops ഉം seminars ഉം ഉണ്ടോ?',
    },
  },
  {
    id: 'research-innovation',
    categories: ['academic', 'college'],
    questions: {
      English: 'Does the college support research and innovation?',
      Kannada: 'ಕಾಲೇಜು ಸಂಶೋಧನೆ ಮತ್ತು ನವೀನತೆಯನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆಯೇ?',
      Hindi: 'क्या कॉलेज research और innovation को support करता है?',
      Tamil: 'கல்லூரி research மற்றும் innovation-ஐ support செய்கிறதா?',
      Telugu: 'కళాశాల research మరియు innovation కు support చేస్తుందా?',
      Malayalam: 'കോളേജ് research ഉം innovation ഉം support ചെയ്യുന്നുണ്ടോ?',
    },
  },
  {
    id: 'co-curricular',
    categories: ['academic', 'campus'],
    questions: {
      English: 'Are there co-curricular and extracurricular activities?',
      Kannada: 'ಸಹಪಠ್ಯ ಮತ್ತು ಪಠ್ಯೇತರ ಚಟುವಟಿಕೆಗಳಿವೆಯೇ?',
      Hindi: 'क्या co-curricular और extracurricular activities हैं?',
      Tamil: 'co-curricular மற்றும் extracurricular activities உள்ளனவா?',
      Telugu: 'co-curricular మరియు extracurricular activities ఉన్నాయా?',
      Malayalam: 'co-curricular ഉം extracurricular activities ഉം ഉണ്ടോ?',
    },
  },
  {
    id: 'mess-food',
    categories: ['campus', 'fees'],
    questions: {
      English: 'How is the mess food?',
      Kannada: 'ಮೆಸ್ ಆಹಾರ ಹೇಗಿದೆ?',
      Hindi: 'मेस का खाना कैसा है?',
      Tamil: 'மெஸ் உணவு எப்படி உள்ளது?',
      Telugu: 'మెస్ ఆహారం ఎలా ఉంటుంది?',
      Malayalam: 'മെസ് ഭക്ഷണം എങ്ങനെയാണ്?',
    },
  },
  {
    id: 'parking',
    categories: ['campus'],
    questions: {
      English: 'Is parking available on campus?',
      Kannada: 'ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ಪಾರ್ಕಿಂಗ್ ಲಭ್ಯವಿದೆಯೇ?',
      Hindi: 'क्या campus में parking उपलब्ध है?',
      Tamil: 'campus-இல் parking வசதி உள்ளதா?',
      Telugu: 'క్యాంపస్‌లో parking అందుబాటులో ఉందా?',
      Malayalam: 'campus-ൽ parking ലഭ്യമാണോ?',
    },
  },
  {
    id: 'campus-facilities',
    categories: ['campus', 'college'],
    questions: {
      English: 'What facilities are available on campus?',
      Kannada: 'ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ಯಾವ ಸೌಲಭ್ಯಗಳಿವೆ?',
      Hindi: 'campus में कौन-कौन सी facilities हैं?',
      Tamil: 'campus-இல் என்ன facilities உள்ளன?',
      Telugu: 'క్యాంపస్‌లో ఏ facilities ఉన్నాయి?',
      Malayalam: 'campus-ൽ എന്തെല്ലാം facilities ഉണ്ട്?',
    },
  },
  {
    id: 'girls-safety',
    categories: ['campus'],
    questions: {
      English: 'Is the campus safe for girls?',
      Kannada: 'ಕ್ಯಾಂಪಸ್ ಹುಡುಗಿಯರಿಗೆ ಸುರಕ್ಷಿತವೇ?',
      Hindi: 'क्या campus लड़कियों के लिए सुरक्षित है?',
      Tamil: 'campus பெண்களுக்கு பாதுகாப்பானதா?',
      Telugu: 'క్యాంపస్ అమ్మాయిలకు సురక్షితమా?',
      Malayalam: 'campus പെൺകുട്ടികൾക്ക് സുരക്ഷിതമാണോ?',
    },
  },
  {
    id: 'sports',
    categories: ['campus'],
    questions: {
      English: 'Are sports facilities available?',
      Kannada: 'ಕ್ರೀಡಾ ಸೌಲಭ್ಯಗಳು ಲಭ್ಯವಿದೆಯೇ?',
      Hindi: 'क्या sports facilities उपलब्ध हैं?',
      Tamil: 'sports facilities உள்ளனவா?',
      Telugu: 'sports facilities అందుబాటులో ఉన్నాయా?',
      Malayalam: 'sports facilities ലഭ്യമാണോ?',
    },
  },
  {
    id: 'library',
    categories: ['campus', 'academic'],
    questions: {
      English: 'Is there a library?',
      Kannada: 'ಲೈಬ್ರರಿ ಇದೆಯೇ?',
      Hindi: 'क्या library है?',
      Tamil: 'library உள்ளதா?',
      Telugu: 'library ఉందా?',
      Malayalam: 'library ഉണ്ടോ?',
    },
  },
  {
    id: 'computer-labs',
    categories: ['campus', 'academic', 'departments'],
    questions: {
      English: 'Are there computer labs?',
      Kannada: 'ಕಂಪ್ಯೂಟರ್ ಲ್ಯಾಬ್‌ಗಳಿವೆಯೇ?',
      Hindi: 'क्या computer labs हैं?',
      Tamil: 'computer labs உள்ளனவா?',
      Telugu: 'computer labs ఉన్నాయా?',
      Malayalam: 'computer labs ഉണ്ടോ?',
    },
  },
  {
    id: 'canteen',
    categories: ['campus'],
    questions: {
      English: 'Is there a canteen?',
      Kannada: 'ಕ್ಯಾಂಟೀನ್ ಇದೆಯೇ?',
      Hindi: 'क्या canteen है?',
      Tamil: 'canteen உள்ளதா?',
      Telugu: 'canteen ఉందా?',
      Malayalam: 'canteen ഉണ്ടോ?',
    },
  },
  {
    id: 'medical-support',
    categories: ['campus'],
    questions: {
      English: 'Is medical support available on campus?',
      Kannada: 'ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ವೈದ್ಯಕೀಯ ಬೆಂಬಲ ಲಭ್ಯವಿದೆಯೇ?',
      Hindi: 'क्या campus में medical support उपलब्ध है?',
      Tamil: 'campus-இல் medical support உள்ளதா?',
      Telugu: 'క్యాంపస్‌లో medical support అందుబాటులో ఉందా?',
      Malayalam: 'campus-ൽ medical support ലഭ്യമാണോ?',
    },
  },
];

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[?.!,;:"'()[\]{}]+/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function inferFaqCategories(payload: any, lastAssistantText: string): FaqSuggestionCategory[] {
  const showCard = normalize(payload?.showCard);
  const intent = normalize(payload?.intent);
  const combined = `${showCard} ${intent} ${normalize(lastAssistantText)}`;

  if (combined.includes('fee')) return ['fees'];
  if (combined.includes('document') || combined.includes('admission') || combined.includes('eligibility')) {
    return ['admissions'];
  }
  if (combined.includes('placement') || combined.includes('job')) return ['placements'];
  if (
    combined.includes('department') ||
    combined.includes('course menu') ||
    combined.includes('course') ||
    combined.includes('hod')
  ) {
    return ['departments', 'academic'];
  }
  if (combined.includes('college') || combined.includes('trustee') || combined.includes('overview')) {
    return ['college', 'campus'];
  }
  return ['college', 'campus'];
}

export function selectFaqSuggestions(
  language: Language,
  categories: FaqSuggestionCategory[],
  recentIds: string[],
): { id: string; text: string }[] {
  const categorySet = new Set(categories);
  const matching = FAQ_SUGGESTIONS.filter((item) =>
    item.categories.some((category) => categorySet.has(category)),
  );
  const fallback = FAQ_SUGGESTIONS.filter((item) =>
    item.categories.some((category) => category === 'college' || category === 'campus'),
  );
  const pool = matching.length ? matching : fallback;
  const recent = new Set(recentIds);
  const preferred = pool.filter((item) => !recent.has(item.id));
  const selected = (preferred.length >= 5 ? preferred : [...preferred, ...pool.filter((item) => recent.has(item.id))])
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
    .slice(0, 5);

  return selected.map((item) => ({
    id: item.id,
    text: item.questions[language] ?? item.questions.English,
  }));
}
