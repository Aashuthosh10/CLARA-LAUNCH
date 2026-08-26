import type { Language } from '../context/LanguageContext';

export type CardType = 'college' | 'dept' | 'hod' | 'trustees';
export interface CardDataItem {
  title: string;
  content: string;
  type: CardType;
}

interface LocalizedCardData {
  college: CardDataItem[];
  dept: Record<string, CardDataItem[]>;
  hod: CardDataItem[];
  trustees: CardDataItem[];
}

const LOCALIZED_CARD_DATA: Partial<Record<Language, LocalizedCardData>> = {
  English: {
    college: [
      { title: 'SVIT Presence', content: 'Established in 2008 by a group of eminent academicians and professionals, SVIT is a premier institution in Bengaluru.', type: 'college' },
      { title: 'NAAC A Grade', content: "SVIT is proud to be accredited with NAAC 'A' Grade, ensuring excellence in academics and research.", type: 'college' },
      { title: 'Infrastructure', content: 'Our campus spans 12 acres of lush greenery with state-of-the-art labs and high-speed Wi-Fi.', type: 'college' },
      { title: 'Core Values', content: 'Ethics, Quality, Research, and Innovation are the pillars that support our vision for the future.', type: 'college' },
      { title: 'Campus Life', content: 'With over 1500 students and active student clubs, SVIT offers a vibrant ecosystem for holistic growth.', type: 'college' },
    ],
    dept: {
      CSE: [
        { title: 'CSE Department', content: 'The CSE department focuses on the core principles and cutting-edge innovations of software and systems.', type: 'dept' },
        { title: 'Specializations', content: 'Specializing in AI-ML, Data Science, and Cybersecurity to prepare students for the demands of the modern world.', type: 'dept' },
        { title: 'Faculty Excellence', content: 'Led by Dr. Shashikumar D R, our faculty brings decades of industry and academic expertise.', type: 'dept' },
        { title: 'Global Placements', content: 'Robust industry ties ensure strong placement assistance and career development support.', type: 'dept' },
        { title: 'Innovation Labs', content: 'Access to advanced software labs and makers spaces for prototyping and creative solutions.', type: 'dept' },
      ],
    },
    hod: [
      { title: 'Dr. Shashikumar D R', content: 'Head of the Department of Computer Science and Engineering, an eminent educator and researcher.', type: 'hod' },
      { title: 'Vision for CSE', content: 'To produce competent engineers who can architect a strong India and a globally progressive world.', type: 'hod' },
      { title: 'Academic Leadership', content: 'Expertise in distributed systems, AI, and deep learning with over 20 years of experience.', type: 'hod' },
      { title: 'Student Centricity', content: 'Focus on mentoring, ethical engineering, and practical skill-based training.', type: 'hod' },
    ],
    trustees: [
      { title: 'Prof. M. R. Holla', content: 'Founder Trustee & President. A distinguished academician with 50+ years of experience in technical education.', type: 'trustees' },
      { title: 'Dr. Manjunath T N', content: 'Principal & Professor. Leads academic direction and institutional excellence at SVIT.', type: 'trustees' },
      { title: 'Dr. Lakshminarayanachari K', content: 'Vice-Principal. Supports academic operations, governance, and student success.', type: 'trustees' },
      { title: 'Dr. Y. Jayasimha', content: 'Eminent Electronics Professor, Dean (Academics) and a visionary Founder Trustee of SVIT.', type: 'trustees' },
      { title: 'Prof. R C Shanmukhaswamy', content: 'Eminent Electrical Professor and Founder Trustee dedicated to administrative excellence.', type: 'trustees' },
      { title: 'Dr. A. M. Padma Reddy', content: 'A renowned Computer Science Professor and Founder Trustee fostering student welfare and affairs.', type: 'trustees' },
      { title: 'Sri R. Srinivas Raju', content: 'Trustee. Practicing Civil Engineer contributing governance and infrastructure perspective.', type: 'trustees' },
      { title: 'Sri M. K. Manohar', content: 'Trustee. Chartered Accountant bringing financial stewardship and transparency.', type: 'trustees' },
      { title: 'The SVIT Mission', content: 'Building a foundation for quality education through selfless service by visionary academicians.', type: 'trustees' },
    ],
  },
  Hindi: {
    college: [
      { title: 'SVIT परिचय', content: '2008 में प्रतिष्ठित शिक्षाविदों और पेशेवरों द्वारा स्थापित SVIT, बेंगलुरु की प्रमुख संस्थाओं में से एक है।', type: 'college' },
      { title: 'NAAC A ग्रेड', content: "SVIT को NAAC 'A' ग्रेड मान्यता प्राप्त है, जो शैक्षणिक और शोध उत्कृष्टता को दर्शाती है।", type: 'college' },
      { title: 'इन्फ्रास्ट्रक्चर', content: '12 एकड़ हरित परिसर में आधुनिक लैब्स और हाई-स्पीड वाई-फाई जैसी सुविधाएँ उपलब्ध हैं।', type: 'college' },
      { title: 'मुख्य मूल्य', content: 'नैतिकता, गुणवत्ता, शोध और नवाचार SVIT की प्रगति के प्रमुख स्तंभ हैं।', type: 'college' },
      { title: 'कैंपस जीवन', content: '1500+ छात्रों और सक्रिय क्लबों के साथ SVIT समग्र विकास के लिए जीवंत वातावरण प्रदान करता है।', type: 'college' },
    ],
    dept: {
      CSE: [
        { title: 'CSE विभाग', content: 'CSE विभाग सॉफ्टवेयर और सिस्टम्स के मूल सिद्धांतों तथा उन्नत नवाचारों पर केंद्रित है।', type: 'dept' },
        { title: 'विशेषज्ञताएँ', content: 'AI-ML, डेटा साइंस और साइबर सिक्योरिटी में विशेषज्ञता के माध्यम से छात्रों को आधुनिक उद्योग के लिए तैयार किया जाता है।', type: 'dept' },
        { title: 'फैकल्टी उत्कृष्टता', content: 'डॉ. शशिकुमार डी आर के नेतृत्व में अनुभवी और उद्योग-संबद्ध फैकल्टी टीम कार्यरत है।', type: 'dept' },
        { title: 'वैश्विक प्लेसमेंट', content: 'मजबूत इंडस्ट्री कनेक्ट के साथ प्रभावी प्लेसमेंट और करियर विकास सहयोग उपलब्ध है।', type: 'dept' },
        { title: 'इनोवेशन लैब्स', content: 'प्रोटोटाइपिंग और रचनात्मक समाधान के लिए उन्नत सॉफ्टवेयर लैब्स तथा मेकर स्पेसेस उपलब्ध हैं।', type: 'dept' },
      ],
    },
    hod: [
      { title: 'डॉ. शशिकुमार डी आर', content: 'कंप्यूटर साइंस एवं इंजीनियरिंग विभागाध्यक्ष; प्रतिष्ठित शिक्षक और शोधकर्ता।', type: 'hod' },
      { title: 'CSE दृष्टि', content: 'ऐसे सक्षम इंजीनियर तैयार करना जो मजबूत भारत और वैश्विक प्रगति में योगदान दें।', type: 'hod' },
      { title: 'शैक्षणिक नेतृत्व', content: 'डिस्ट्रिब्यूटेड सिस्टम्स, AI और डीप लर्निंग में 20+ वर्षों का अनुभव।', type: 'hod' },
      { title: 'छात्र केंद्रितता', content: 'मेंटोरिंग, नैतिक इंजीनियरिंग और कौशल-आधारित प्रशिक्षण पर विशेष ध्यान।', type: 'hod' },
    ],
    trustees: [
      { title: 'प्रो. एम. आर. होल्ला', content: 'संस्थापक ट्रस्टी एवं अध्यक्ष; तकनीकी शिक्षा में 50+ वर्षों के अनुभव वाले विशिष्ट शिक्षाविद।', type: 'trustees' },
      { title: 'डॉ. मंजुनाथ टी एन', content: 'प्राचार्य एवं प्रोफेसर। शैक्षणिक दिशा और संस्थागत उत्कृष्टता का नेतृत्व।', type: 'trustees' },
      { title: 'डॉ. लक्ष्मीनारायणाचारी के', content: 'उप-प्राचार्य। शैक्षणिक संचालन, प्रशासन और छात्र सफलता में सहयोग।', type: 'trustees' },
      { title: 'डॉ. वाई. जयसिम्हा', content: 'प्रख्यात इलेक्ट्रॉनिक्स प्रोफेसर, डीन (अकादमिक्स), और SVIT के दूरदर्शी संस्थापक ट्रस्टी।', type: 'trustees' },
      { title: 'प्रो. आर. सी. शण्मुखस्वामी', content: 'प्रख्यात इलेक्ट्रिकल प्रोफेसर और प्रशासनिक उत्कृष्टता के लिए समर्पित संस्थापक ट्रस्टी।', type: 'trustees' },
      { title: 'डॉ. ए. एम. पद्मा रेड्डी', content: 'प्रख्यात कंप्यूटर साइंस प्रोफेसर और छात्र कल्याण पर केंद्रित संस्थापक ट्रस्टी।', type: 'trustees' },
      { title: 'श्री आर. श्रीनिवास राजू', content: 'ट्रस्टी। अभ्यासरत सिविल इंजीनियर; शासन और अवसंरचण दृष्टिकोण।', type: 'trustees' },
      { title: 'श्री एम. के. मनोहर', content: 'ट्रस्टी। चार्टर्ड अकाउंटेंट; वित्तीय प्रबंधन और पारदर्शिता।', type: 'trustees' },
      { title: 'SVIT मिशन', content: 'दूरदर्शी शिक्षाविदों की निस्वार्थ सेवा से गुणवत्तापूर्ण शिक्षा की मजबूत नींव बनाना।', type: 'trustees' },
    ],
  },
  Tamil: {
    college: [
      { title: 'SVIT அறிமுகம்', content: '2008 ஆம் ஆண்டு சிறந்த கல்வியாளர்கள் மற்றும் தொழில்முறை நிபுணர்களால் தொடங்கப்பட்ட SVIT, பெங்களூருவின் முன்னணி கல்வி நிறுவனங்களில் ஒன்றாகும்.', type: 'college' },
      { title: 'NAAC A தரம்', content: "SVITக்கு NAAC 'A' தர அங்கீகாரம் கிடைத்துள்ளது; இது கல்வி மற்றும் ஆராய்ச்சி தரத்தை வெளிப்படுத்துகிறது.", type: 'college' },
      { title: 'கட்டமைப்பு', content: '12 ஏக்கர் பசுமை வளாகத்தில் நவீன ஆய்வகங்கள் மற்றும் அதிவேக Wi-Fi வசதிகள் உள்ளன.', type: 'college' },
      { title: 'மூல மதிப்புகள்', content: 'நெறிமுறை, தரம், ஆராய்ச்சி மற்றும் புதுமை ஆகியவை SVIT வளர்ச்சியின் தளங்களாகும்.', type: 'college' },
      { title: 'வளாக வாழ்க்கை', content: '1500+ மாணவர்களும் செயலில் உள்ள கழகங்களும் கொண்ட SVIT முழுமையான வளர்ச்சிக்கு உற்சாகமான சூழலை வழங்குகிறது.', type: 'college' },
    ],
    dept: {
      CSE: [
        { title: 'CSE துறை', content: 'CSE துறை மென்பொருள் மற்றும் கணினி அமைப்புகளின் அடிப்படை மற்றும் முன்னணி புதுமைகளில் கவனம் செலுத்துகிறது.', type: 'dept' },
        { title: 'சிறப்பு துறைகள்', content: 'AI-ML, Data Science மற்றும் Cybersecurity சிறப்புகளின் மூலம் நவீன துறைக்கு மாணவர்கள் தயார் செய்யப்படுகிறார்கள்.', type: 'dept' },
        { title: 'ஆசிரியர் சிறப்பு', content: 'டாக்டர் சஷிகுமார் டி ஆர் தலைமையில் அனுபவமிக்க மற்றும் திறமையான ஆசிரியர்கள் குழு செயல்படுகிறது.', type: 'dept' },
        { title: 'உலகளாவிய வேலைவாய்ப்பு', content: 'வலுவான தொழில் இணைப்புகள் மூலம் வேலைவாய்ப்பு மற்றும் தொழில் முன்னேற்ற ஆதரவு வழங்கப்படுகிறது.', type: 'dept' },
        { title: 'புதுமை ஆய்வகங்கள்', content: 'மாதிரிநிர்மாணம் மற்றும் படைப்பூக்க தீர்வுகளுக்காக நவீன மென்பொருள் ஆய்வகங்கள் மற்றும் மேக்கர் ஸ்பேஸ்கள் உள்ளன.', type: 'dept' },
      ],
    },
    hod: [
      { title: 'டாக்டர் சஷிகுமார் டி ஆர்', content: 'கணினி அறிவியல் மற்றும் பொறியியல் துறைத் தலைவர்; புகழ்பெற்ற கல்வியாளர் மற்றும் ஆராய்ச்சியாளர்.', type: 'hod' },
      { title: 'CSE நோக்கு', content: 'வலுவான இந்தியாவையும் உலக முன்னேற்றத்தையும் உருவாக்கக் கூடிய திறமையான பொறியாளர்களை உருவாக்குவது.', type: 'hod' },
      { title: 'கல்வி தலைமைத்துவம்', content: 'Distributed Systems, AI மற்றும் Deep Learning துறைகளில் 20+ ஆண்டுகள் அனுபவம்.', type: 'hod' },
      { title: 'மாணவர் மைய அணுகுமுறை', content: 'மென்டரிங், நெறிமுறை பொறியியல் மற்றும் நடைமுறை திறன் பயிற்சிக்கு முக்கியத்துவம் வழங்கப்படுகிறது.', type: 'hod' },
    ],
    trustees: [
      { title: 'ப்ரொஃ. எம். ஆர். ஹொள்ளா', content: 'நிறுவனர் அறங்காவலர் மற்றும் தலைவர்; தொழில்நுட்பக் கல்வியில் 50+ ஆண்டுகள் அனுபவமுள்ள சிறந்த கல்வியாளர்.', type: 'trustees' },
      { title: 'டாக்டர் மஞ்சுநாத் டி என்', content: 'முதல்வர் மற்றும் பேராசிரியர். கல்வித் திசையும் நிறுவனச் சிறப்பும்.', type: 'trustees' },
      { title: 'டாக்டர் லக்ஷ்மீநாராயணாச்சாரி கே', content: 'துணை முதல்வர். கல்வி நிர்வாகம், ஆட்சி மற்றும் மாணவர் வெற்றிக்கு ஆதரவு.', type: 'trustees' },
      { title: 'டாக்டர் வை. ஜெயசிம்ஹா', content: 'புகழ்பெற்ற Electronics பேராசிரியர், Dean (Academics), மற்றும் SVIT இன் தொலைநோக்கு நிறுவனர் அறங்காவலர்.', type: 'trustees' },
      { title: 'ப்ரொஃ. ஆர். சி. சண்முகசுவாமி', content: 'புகழ்பெற்ற Electrical பேராசிரியர் மற்றும் நிர்வாக சிறப்பிற்காக அர்ப்பணித்த நிறுவனர் அறங்காவலர்.', type: 'trustees' },
      { title: 'டாக்டர் ஏ. எம். பத்மா ரெட்டி', content: 'புகழ்பெற்ற Computer Science பேராசிரியர் மற்றும் மாணவர் நலனில் ஈடுபட்ட நிறுவனர் அறங்காவலர்.', type: 'trustees' },
      { title: 'ஸ்ரீ ஆர். ஸ்ரீனிவாஸ் ராஜு', content: 'அறங்காவலர். பயிற்சி பெற்ற சிவில் பொறியாளர்; நிர்வாகமும் உள்கட்டமைப்பும்.', type: 'trustees' },
      { title: 'ஸ்ரீ எம். கே. மனோகர்', content: 'அறங்காவலர். நியமிக்கப்பட்ட கணக்காளர்; நிதி மேலாண்மை மற்றும் வெளிப்படைத்தன்மை.', type: 'trustees' },
      { title: 'SVIT நோக்கம்', content: 'தொலைநோக்குடைய கல்வியாளர்களின் தன்னலமற்ற சேவையால் தரமான கல்விக்கு வலுவான அடித்தளத்தை அமைத்தல்.', type: 'trustees' },
    ],
  },
  Telugu: {
    college: [
      { title: 'SVIT పరిచయం', content: '2008లో ప్రముఖ విద్యావేత్తలు మరియు నిపుణుల బృందం స్థాపించిన SVIT, బెంగళూరులో ప్రముఖ విద్యాసంస్థగా నిలిచింది.', type: 'college' },
      { title: 'NAAC A గ్రేడ్', content: "SVITకు NAAC 'A' గ్రేడ్ గుర్తింపు లభించింది, ఇది విద్యా మరియు పరిశోధన నాణ్యతను సూచిస్తుంది.", type: 'college' },
      { title: 'మౌలిక వసతులు', content: '12 ఎకరాల పచ్చని ప్రాంగణంలో ఆధునిక ల్యాబ్‌లు మరియు హై-స్పీడ్ Wi-Fi సదుపాయాలు ఉన్నాయి.', type: 'college' },
      { title: 'మూల్యాలు', content: 'నైతికత, నాణ్యత, పరిశోధన మరియు నవీనత SVIT దృష్టికి ప్రధాన స్తంభాలు.', type: 'college' },
      { title: 'క్యాంపస్ జీవితం', content: '1500+ విద్యార్థులు మరియు చురుకైన క్లబ్‌లతో SVIT సమగ్ర అభివృద్ధికి ఉత్సాహభరిత వాతావరణాన్ని అందిస్తుంది.', type: 'college' },
    ],
    dept: {
      CSE: [
        { title: 'CSE విభాగం', content: 'CSE విభాగం సాఫ్ట్‌వేర్ మరియు సిస్టమ్‌లలో ప్రాథమిక సూత్రాలు మరియు ఆధునిక ఆవిష్కరణలపై దృష్టి పెడుతుంది.', type: 'dept' },
        { title: 'ప్రత్యేకతలు', content: 'AI-ML, డేటా సైన్స్, సైబర్ సెక్యూరిటీ ప్రత్యేకతలతో విద్యార్థులను ఆధునిక పరిశ్రమ అవసరాలకు సిద్ధం చేస్తుంది.', type: 'dept' },
        { title: 'అధ్యాపక నైపుణ్యం', content: 'డా. శశికుమార్ డి ఆర్ నాయకత్వంలో అనుభవజ్ఞులైన అధ్యాపక బృందం పనిచేస్తోంది.', type: 'dept' },
        { title: 'గ్లోబల్ ప్లేస్‌మెంట్స్', content: 'బలమైన పరిశ్రమ భాగస్వామ్యాలతో ప్లేస్‌మెంట్ మరియు కెరీర్ అభివృద్ధి సహాయం అందుబాటులో ఉంది.', type: 'dept' },
        { title: 'ఇన్నోవేషన్ ల్యాబ్స్', content: 'ప్రోటోటైపింగ్ మరియు సృజనాత్మక పరిష్కారాల కోసం ఆధునిక సాఫ్ట్‌వేర్ ల్యాబ్స్ మరియు మేకర్ స్పేస్‌లు ఉన్నాయి.', type: 'dept' },
      ],
    },
    hod: [
      { title: 'డా. శశికుమార్ డి ఆర్', content: 'కంప్యూటర్ సైన్స్ అండ్ ఇంజినీరింగ్ విభాగాధిపతి; ప్రముఖ విద్యావేత్త మరియు పరిశోధకుడు.', type: 'hod' },
      { title: 'CSE విజన్', content: 'బలమైన భారతదేశం మరియు ప్రపంచ అభివృద్ధికి తోడ్పడగల సమర్థ ఇంజినీర్లను తయారు చేయడం.', type: 'hod' },
      { title: 'అకడమిక్ నాయకత్వం', content: 'డిస్ట్రిబ్యూటెడ్ సిస్టమ్స్, AI, డీప్ లెర్నింగ్ రంగాల్లో 20+ సంవత్సరాల అనుభవం.', type: 'hod' },
      { title: 'విద్యార్థి కేంద్రీకరణ', content: 'మెంటరింగ్, నైతిక ఇంజినీరింగ్, ప్రాక్టికల్ నైపుణ్య శిక్షణపై ప్రధాన దృష్టి.', type: 'hod' },
    ],
    trustees: [
      { title: 'ప్రొ. ఎం. ఆర్. హొల్లా', content: 'స్థాపక ట్రస్టీ మరియు అధ్యక్షులు; సాంకేతిక విద్యలో 50+ సంవత్సరాల అనుభవం కలిగిన విశిష్ట విద్యావేత్త.', type: 'trustees' },
      { title: 'డా. మంజునాథ్ టి ఎన్', content: 'ప్రిన్సిపాల్ మరియు ప్రొఫెసర్. విద్యా దిశ మరియు సంస్థాగత నైపుణ్యానికి నాయకత్వం.', type: 'trustees' },
      { title: 'డా. లక్ష్మీనారాయణాచారి కె', content: 'ఉప ప్రిన్సిపాల్. విద్యా కార్యకలాపాలు, పాలన మరియు విద్యార్థి విజయానికి మద్దతు.', type: 'trustees' },
      { title: 'డా. వై. జయసింహ', content: 'ప్రముఖ ఎలక్ట్రానిక్స్ ప్రొఫెసర్, డీన్ (అకాడెమిక్స్), మరియు SVIT స్థాపక ట్రస్టీ.', type: 'trustees' },
      { title: 'ప్రొ. ఆర్. సి. షణ్ముఖస్వామి', content: 'ప్రముఖ ఎలక్ట్రికల్ ప్రొఫెసర్ మరియు పరిపాలనలో ప్రతిభకు అంకితమైన స్థాపక ట్రస్టీ.', type: 'trustees' },
      { title: 'డా. ఎ. ఎం. పద్మా రెడ్డి', content: 'ప్రముఖ కంప్యూటర్ సైన్స్ ప్రొఫెసర్ మరియు విద్యార్థి సంక్షేమంపై దృష్టి పెట్టిన స్థాపక ట్రస్టీ.', type: 'trustees' },
      { title: 'శ్రీ ఆర్. శ్రీనివాస్ రాజు', content: 'ట్రస్టీ. అభ్యాస సివిల్ ఇంజినీర్; పాలన మరియు మౌలిక సదుపాయాల దృష్టికోణం.', type: 'trustees' },
      { title: 'శ్రీ ఎం. కె. మనోహర్', content: 'ట్రస్టీ. చార్టర్డ్ అకౌంటెంట్; ఆర్థిక నిర్వహణ మరియు పారదర్శకత.', type: 'trustees' },
      { title: 'SVIT లక్ష్యం', content: 'దూరదృష్టి కలిగిన విద్యావేత్తల నిస్వార్థ సేవతో నాణ్యమైన విద్యకు బలమైన పునాది నిర్మించడం.', type: 'trustees' },
    ],
  },
  Malayalam: {
    college: [
      { title: 'SVIT പരിചയം', content: '2008-ൽ പ്രമുഖ വിദ്യാഭ്യാസ വിദഗ്ധരും പ്രൊഫഷണലുകളും ചേർന്ന് സ്ഥാപിച്ച SVIT, ബെംഗളൂരുവിലെ മുൻനിര വിദ്യാഭ്യാസ സ്ഥാപനങ്ങളിലൊന്നാണ്.', type: 'college' },
      { title: 'NAAC A ഗ്രേഡ്', content: "SVIT ന് NAAC 'A' ഗ്രേഡ് അംഗീകാരം ലഭിച്ചിട്ടുണ്ട്; ഇത് അക്കാദമിക്-ഗവേഷണ നിലവാരം തെളിയിക്കുന്നു.", type: 'college' },
      { title: 'ഇൻഫ്രാസ്ട്രക്ചർ', content: '12 ഏക്കർ പച്ചപ്പാർന്ന ക്യാമ്പസിൽ ആധുനിക ലാബുകളും ഹൈ-സ്പീഡ് Wi-Fi സൗകര്യങ്ങളും ലഭ്യമാണ്.', type: 'college' },
      { title: 'മൂല്യങ്ങൾ', content: 'നൈതികത, ഗുണമേന്മ, ഗവേഷണം, നവീകരണം എന്നിവ SVITയുടെ പ്രധാന അടിത്തറകളാണ്.', type: 'college' },
      { title: 'ക്യാമ്പസ് ജീവിതം', content: '1500+ വിദ്യാർത്ഥികളും സജീവ ക്ലബ്ബുകളും ചേർന്ന് SVIT സമഗ്ര വളർച്ചയ്ക്ക് സജീവ അന്തരീക്ഷം നൽകുന്നു.', type: 'college' },
    ],
    dept: {
      CSE: [
        { title: 'CSE ഡിപ്പാർട്ട്മെന്റ്', content: 'CSE ഡിപ്പാർട്ട്മെന്റ് സോഫ്റ്റ്‌വെയറും സിസ്റ്റം മേഖലയുടെയും അടിസ്ഥാനങ്ങളും നവീകരണങ്ങളും മുൻനിരയിൽ കൊണ്ടുവരുന്നു.', type: 'dept' },
        { title: 'സ്പെഷ്യലൈസേഷനുകൾ', content: 'AI-ML, ഡാറ്റാ സയൻസ്, സൈബർ സുരക്ഷ മേഖലകളിൽ പ്രത്യേക പരിശീലനം നൽകി വിദ്യാർത്ഥികളെ ആധുനിക മേഖലയിലേക്ക് ഒരുക്കുന്നു.', type: 'dept' },
        { title: 'അധ്യാപക മികവ്', content: 'ഡോ. ശശികുമാർ ഡി ആർയുടെ നേതൃത്വത്തിൽ സമ്പന്ന അനുഭവമുള്ള അധ്യാപക സംഘം പ്രവർത്തിക്കുന്നു.', type: 'dept' },
        { title: 'ഗ്ലോബൽ പ്ലേസ്‌മെന്റ്സ്', content: 'ശക്തമായ ഇൻഡസ്ട്രി ബന്ധങ്ങളിലൂടെ മികച്ച പ്ലേസ്‌മെന്റും കരിയർ മാർഗനിർദ്ദേശവും നൽകുന്നു.', type: 'dept' },
        { title: 'ഇന്നോവേഷൻ ലാബുകൾ', content: 'പ്രോട്ടോടൈപ്പിംഗിനും സൃഷ്ടിപരമായ പരിഹാരങ്ങൾക്കുമായി ആധുനിക സോഫ്റ്റ്‌വെയർ ലാബുകളും മേക്കർ സ്പേസുകളും ലഭ്യമാണ്.', type: 'dept' },
      ],
    },
    hod: [
      { title: 'ഡോ. ശശികുമാർ ഡി ആർ', content: 'കമ്പ്യൂട്ടർ സയൻസ് ആൻഡ് എൻജിനീയറിംഗ് വിഭാഗ മേധാവി; പ്രമുഖ വിദ്യാഭ്യാസ വിദഗ്ധനും ഗവേഷകനുമാണ്.', type: 'hod' },
      { title: 'CSE ദർശനം', content: 'ശക്തമായ ഇന്ത്യയും ആഗോള പുരോഗതിയും നിർമ്മിക്കാൻ കഴിവുള്ള എഞ്ചിനീയർമാരെ വളർത്തുകയാണ് ലക്ഷ്യം.', type: 'hod' },
      { title: 'അക്കാദമിക് ലീഡർഷിപ്പ്', content: 'ഡിസ്ട്രിബ്യൂട്ടഡ് സിസ്റ്റംസ്, AI, ഡീപ് ലേണിംഗ് മേഖലകളിൽ 20+ വർഷത്തെ പരിചയം.', type: 'hod' },
      { title: 'വിദ്യാർത്ഥി കേന്ദ്രീകൃതത', content: 'മെന്ററിംഗ്, നൈതിക എൻജിനീയറിംഗ്, പ്രായോഗിക നൈപുണ്യ പരിശീലനം എന്നിവയ്ക്ക് മുൻഗണന നൽകുന്നു.', type: 'hod' },
    ],
    trustees: [
      { title: 'പ്രൊഫ്. എം. ആർ. ഹൊള്ള', content: 'സ്ഥാപക ട്രസ്റ്റിയും പ്രസിഡന്റും; സാങ്കേതിക വിദ്യാഭ്യാസത്തിൽ 50+ വർഷത്തെ പരിചയമുള്ള പ്രമുഖ വിദ്യാഭ്യാസ വിദഗ്ധൻ.', type: 'trustees' },
      { title: 'ഡോ. മഞ്ജുനാഥ് ടി എൻ', content: 'പ്രിൻസിപ്പലും പ്രൊഫസറും. അക്കാദമിക് ദിശയും സ്ഥാപന മികവും.', type: 'trustees' },
      { title: 'ഡോ. ലക്ഷ്മീനാരായണാചാരി കെ', content: 'വൈസ് പ്രിൻസിപ്പൽ. അക്കാദമിക് പ്രവർത്തനം, ഭരണം, വിദ്യാർത്ഥി വിജയം.', type: 'trustees' },
      { title: 'ഡോ. വൈ. ജയസിംഹ', content: 'പ്രമുഖ ഇലക്ട്രോണിക്സ് പ്രൊഫസർ, ഡീൻ (അക്കാദമിക്സ്), SVITയുടെ ദൂരദർശിയായ സ്ഥാപക ട്രസ്റ്റി.', type: 'trustees' },
      { title: 'പ്രൊഫ്. ആർ. സി. ശൺമുഖസ്വാമി', content: 'പ്രമുഖ ഇലക്ട്രിക്കൽ പ്രൊഫസറും ഭരണ മികവിന് സമർപ്പിതനായ സ്ഥാപക ട്രസ്റ്റിയും.', type: 'trustees' },
      { title: 'ഡോ. എ. എം. പത്മ റെడ్డి', content: 'പ്രമുഖ കമ്പ്യൂട്ടർ സയൻസ് പ്രൊഫസറും വിദ്യാർത്ഥി ക്ഷേമത്തിന് മുൻഗണന നൽകുന്ന സ്ഥാപക ട്രസ്റ്റിയും.', type: 'trustees' },
      { title: 'ശ്രീ ആർ. ശ്രീനിവാസ് രാജു', content: 'ട്രസ്റ്റി. പ്രാക്ടീസിംഗ് സിവിൽ എഞ്ചിനീയർ; ഭരണവും അടിസ്ഥാന സൗകര്യവും.', type: 'trustees' },
      { title: 'ശ്രീ എം. കെ. മനോഹർ', content: 'ട്രസ്റ്റി. ചാർട്ടേഡ് അക്കൗണ്ടൻ്റ്; സാമ്പത്തിക ഭരണവും വ്യക്തതയും.', type: 'trustees' },
      { title: 'SVIT ദൗത്യം', content: 'ദൂരദർശിയുള്ള വിദ്യാഭ്യാസ വിദഗ്ധരുടെ നിസ്വാർത്ഥ സേവനത്തിലൂടെ ഗുണമേന്മയുള്ള വിദ്യാഭ്യാസത്തിന് ശക്തമായ അടിത്തറ നിർമ്മിക്കുന്നു.', type: 'trustees' },
    ],
  },
};

/**
 * Static marketing cards only. Department and HOD decks come from locale JSON via collegeLocaleUtils + useCollegeData.
 */
export function getStaticCardsForTrigger(language: Language, trigger: string): CardDataItem[] | null {
  // Kannada production cards are built from backend locale JSON by
  // collegeLocaleUtils; never fall back to this legacy marketing catalog.
  if (language === 'Kannada') return null;
  const normalized = (trigger || '').toLowerCase();
  const data = LOCALIZED_CARD_DATA[language] ?? LOCALIZED_CARD_DATA.English;
  if (['college', 'college_overview', 'overview', 'institution'].includes(normalized)) {
    return data.college;
  }
  if (
    ['dept', 'department', 'department_overview', 'hod', 'hod_profile', 'head_of_department'].includes(normalized)
  ) {
    return null;
  }
  if (['trustees', 'trustee', 'trustees_profile', 'trustee_profile'].includes(normalized)) {
    return data.trustees;
  }
  return null;
}

export function getCardsForTrigger(language: Language, trigger: string): CardDataItem[] | null {
  return getStaticCardsForTrigger(language, trigger);
}

// Backward-compatible exports (English defaults).
export const COLLEGE_OVERVIEW_DATA = LOCALIZED_CARD_DATA.English.college;
export const DEPARTMENT_OVERVIEW_DATA = { CSE: LOCALIZED_CARD_DATA.English.dept.CSE };
export const HOD_INFO_DATA = LOCALIZED_CARD_DATA.English.hod;
export const TRUSTEES_INFO_DATA = LOCALIZED_CARD_DATA.English.trustees;
