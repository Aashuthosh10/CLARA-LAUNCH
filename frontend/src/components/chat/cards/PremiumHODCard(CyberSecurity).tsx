import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import { useLanguage } from '../../../context/LanguageContext';
import { collegeLogoMark as placeholderImg } from '../../../assets/logo';

const AMOGH = {
  name: 'Dr. Amogh Pramod Kulkarni',
  title: {
    English: 'Professor & HOD, CSE (Cyber Security)',
    Kannada: 'ಪ್ರಾಧ್ಯಾಪಕರು ಮತ್ತು ವಿಭಾಗಾಧ್ಯಕ್ಷರು, CSE (ಸೈಬರ್ ಸೆಕ್ಯುರಿಟಿ)',
    Hindi: 'प्रोफेसर एवं HOD, CSE (साइबर सुरक्षा)',
    Tamil: 'பேராசிரியர் மற்றும் HOD, CSE (சைபர் பாதுகாப்பு)',
    Telugu: 'ప్రొఫెసర్ & HOD, CSE (సైబర్ సెక్యూరిటీ)',
    Malayalam: 'പ്രൊഫസർ & HOD, CSE (സൈബർ സെക്യൂരിറ്റി)',
  },
  bio: {
    English:
      'Dr. Amogh Pramod Kulkarni is the Head of the CSE (Cyber Security) Department at Sai Vidya Institute of Technology, Bengaluru, with over 16 years of teaching and research experience. His expertise includes Machine Learning, Deep Learning, Big Data Analytics, and Cloud Computing, with active involvement in research, academic leadership, technical training, and student development.',
    Kannada:
      'ಡಾ. ಅಮೋಘ್ ಪ್ರಮೋದ್ ಕುಲಕರ್ಣಿ ಅವರು ಬೆಂಗಳೂರಿನ ಸಾಯಿ ವಿದ್ಯಾ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿಯಲ್ಲಿ CSE (ಸೈಬರ್ ಸೆಕ್ಯುರಿಟಿ) ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು. 16 ವರ್ಷಗಳಿಗೂ ಹೆಚ್ಚು ಬೋಧನೆ ಮತ್ತು ಸಂಶೋಧನಾ ಅನುಭವ ಹೊಂದಿದ್ದು Machine Learning, Deep Learning, Big Data Analytics ಮತ್ತು Cloud Computingನಲ್ಲಿ ಪರಿಣತರು.',
    Hindi:
      'डॉ. अमोघ प्रमोद कुलकर्णी साई विद्या इंस्टीट्यूट ऑफ टेक्नोलॉजी, बेंगलुरु में CSE (साइबर सुरक्षा) विभाग के प्रमुख हैं। 16 वर्षों से अधिक शिक्षण और शोध अनुभव के साथ उनकी विशेषज्ञता मशीन लर्निंग, डीप लर्निंग, बिग डेटा एनालिटिक्स और क्लाउड कंप्यूटिंग में है।',
    Tamil:
      'டாக்டர் அமோக் பிரமோத் குல்கர்ணி அவர்கள் பெங்களூரில் உள்ள Sai Vidya Institute of Technology-இல் CSE (சைபர் பாதுகாப்பு) துறைத் தலைவர். 16 ஆண்டுகளுக்கும் மேற்பட்ட அனுபவத்துடன் Machine Learning, Deep Learning, Big Data Analytics மற்றும் Cloud Computing துறைகளில் நிபுணத்துவம் பெற்றவர்.',
    Telugu:
      'డా. అమోఘ్ ప్రమోద్ కులకర్ణి బెంగళూరులోని Sai Vidya Institute of Technologyలో CSE (సైబర్ సెక్యూరిటీ) విభాగ అధిపతి. 16 సంవత్సరాలకు పైగా అనుభవంతో Machine Learning, Deep Learning, Big Data Analytics మరియు Cloud Computingలో నైపుణ్యం కలిగి ఉన్నారు.',
    Malayalam:
      'ഡോ. അമോഘ് പ്രമോദ് കുൽകർണി ബെംഗളൂരുവിലെ Sai Vidya Institute of Technologyയിൽ CSE (സൈബർ സെക്യൂരിറ്റി) വകുപ്പ് മേധാവിയാണ്. 16 വർഷത്തിലേറെ അനുഭവത്തോടെ Machine Learning, Deep Learning, Big Data Analytics, Cloud Computing എന്നിവയിൽ വിദഗ്ധനാണ്.',
  },
};

/** HOD card for CSE (Cyber Security). */
export default function PremiumHODCardCyberSecurity() {
  const { language } = useLanguage();
  return (
    <PremiumHODCard
      name={AMOGH.name}
      title={AMOGH.title[language] || AMOGH.title.English}
      bio={AMOGH.bio[language] || AMOGH.bio.English}
      portrait={placeholderImg}
    />
  );
}
