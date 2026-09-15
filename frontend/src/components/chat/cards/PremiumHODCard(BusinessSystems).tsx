import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import { useLanguage } from '../../../context/LanguageContext';
import { collegeLogoMark as placeholderImg } from '../../../assets/logo';

const PRASANNA = {
  name: 'Dr. Prasanna Lakshmi G S',
  title: {
    English: 'Professor & HOD, CSE (Business Systems)',
    Kannada: 'ಪ್ರಾಧ್ಯಾಪಕರು ಮತ್ತು ವಿಭಾಗಾಧ್ಯಕ್ಷರು, CSE (ಬಿಸಿನೆಸ್ ಸಿಸ್ಟಮ್ಸ್)',
    Hindi: 'प्रोफेसर एवं HOD, CSE (बिजनेस सिस्टम्स)',
    Tamil: 'பேராசிரியர் மற்றும் HOD, CSE (வணிக அமைப்புகள்)',
    Telugu: 'ప్రొఫెసర్ & HOD, CSE (బిజినెస్ సిస్టమ్స్)',
    Malayalam: 'പ്രൊഫസർ & HOD, CSE (ബിസിനസ് സിസ്റ്റംസ്)',
  },
  bio: {
    English:
      'Dr. Prasanna Lakshmi G S is the Head of the CSE (Business Systems) Department at Sai Vidya Institute of Technology, Bengaluru, with over 15 years of teaching and research experience. Her expertise spans Cybersecurity, AI, Machine Learning, Deep Learning, Computer Vision, and Big Data, with significant contributions to research, innovation, patents, and academic development.',
    Kannada:
      'ಡಾ. ಪ್ರಸನ್ನಾ ಲಕ್ಷ್ಮಿ ಜಿ ಎಸ್ ಅವರು ಬೆಂಗಳೂರಿನ ಸಾಯಿ ವಿದ್ಯಾ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿಯಲ್ಲಿ CSE (ಬಿಸಿನೆಸ್ ಸಿಸ್ಟಮ್ಸ್) ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು. 15 ವರ್ಷಗಳಿಗೂ ಹೆಚ್ಚು ಬೋಧನೆ ಮತ್ತು ಸಂಶೋಧನಾ ಅನುಭವ ಹೊಂದಿದ್ದು Cybersecurity, AI, Machine Learning, Deep Learning, Computer Vision ಮತ್ತು Big Data ಕ್ಷೇತ್ರಗಳಲ್ಲಿ ಪರಿಣತರು.',
    Hindi:
      'डॉ. प्रसन्ना लक्ष्मी जी एस साई विद्या इंस्टीट्यूट ऑफ टेक्नोलॉजी, बेंगलुरु में CSE (बिजनेस सिस्टम्स) विभाग की प्रमुख हैं। 15 वर्षों से अधिक शिक्षण और शोध अनुभव के साथ उनकी विशेषज्ञता साइबर सुरक्षा, एआई, मशीन लर्निंग, डीप लर्निंग, कंप्यूटर विज़न और बिग डेटा में है।',
    Tamil:
      'டாக்டர் பிரசன்னா லக்ஷ்மி ஜி எஸ் அவர்கள் பெங்களூரில் உள்ள Sai Vidya Institute of Technology-இல் CSE (வணிக அமைப்புகள்) துறைத் தலைவர். 15 ஆண்டுகளுக்கும் மேற்பட்ட அனுபவத்துடன் Cybersecurity, AI, Machine Learning, Deep Learning, Computer Vision மற்றும் Big Data துறைகளில் நிபுணத்துவம் பெற்றவர்.',
    Telugu:
      'డా. ప్రసన్నా లక్ష్మి జి ఎస్ బెంగళూరులోని Sai Vidya Institute of Technologyలో CSE (బిజినెస్ సిస్టమ్స్) విభాగ అధిపతి. 15 సంవత్సరాలకు పైగా అనుభవంతో Cybersecurity, AI, Machine Learning, Deep Learning, Computer Vision మరియు Big Dataలో నైపుణ్యం కలిగి ఉన్నారు.',
    Malayalam:
      'ഡോ. പ്രസന്ന ലക്ഷ്മി ജി എസ് ബെംഗളൂരുവിലെ Sai Vidya Institute of Technologyയിൽ CSE (ബിസിനസ് സിസ്റ്റംസ്) വകുപ്പ് മേധാവിയാണ്. 15 വർഷത്തിലേറെ അനുഭവത്തോടെ Cybersecurity, AI, Machine Learning, Deep Learning, Computer Vision, Big Data എന്നിവയിൽ വിദഗ്ധയാണ്.',
  },
};

/** HOD card for CSE (Business Systems). */
export default function PremiumHODCardBusinessSystems() {
  const { language } = useLanguage();
  return (
    <PremiumHODCard
      name={PRASANNA.name}
      title={PRASANNA.title[language] || PRASANNA.title.English}
      bio={PRASANNA.bio[language] || PRASANNA.bio.English}
      portrait={placeholderImg}
    />
  );
}
