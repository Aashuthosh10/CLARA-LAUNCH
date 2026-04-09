import React from 'react';
import PremiumHODCard from './PremiumHODCard';
import { useLanguage } from '../../../context/LanguageContext';
import hodImg from '../../../assets/hod_manjunatha.jpg';

export default function PremiumHODCardAIML() {
  const { language } = useLanguage();

  const data = {
    name: "Dr. T G Manjunatha",
    title: "Professor & HOD, CSE (Artificial Intelligence & Machine Learning)",
    bio: {
      English: "Dr. T G Manjunatha heads the AIML department, emphasizing strong foundations in Artificial Intelligence, Machine Learning, and data-driven problem solving. He has significant academic and research experience, guiding projects that apply AI techniques to real-world applications. Under his leadership, the department conducts workshops, coding events, and hands-on sessions to build strong practical skills.",
      Kannada: "ಡಾ. ಟಿ ಜಿ ಮಂಜುನಾಥ ಅವರು ಎಐ ಮತ್ತು ಎಂಎಲ್ ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರಾಗಿದ್ದು, ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ, ಯಂತ್ರ ಕಲಿಕೆ ಮತ್ತು ಡೇಟಾ ಆಧಾರಿತ समस्या ಪರಿಹಾರದಲ್ಲಿ ದೃಢವಾದ ನೆಲೆಗಳನ್ನು ಒದಗಿಸುತ್ತಾರೆ. ಅವರು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ನೈಜ ಜಗತ್ತಿನ ಸಮಸ್ಯೆಗಳಿಗೆ ಎಐ ತಂತ್ರಗಳನ್ನು ಅನ್ವಯಿಸುವ ಪ್ರಾಜೆಕ್ಟ್ಗಳನ್ನು ಮಾರ್ಗದರ್ಶನ ಮಾಡುತ್ತಾರೆ.",
      Tamil: "டாக்டர் டி ஜி மஞ்சுநாதா அவர்கள் AIML துறையின் தலைவர். செயற்கை நுண்ணறிவு, மெஷின் லெர்னிங் மற்றும் தரவின் அடிப்படையிலான பிரச்சினை தீர்வில் வலுவான அடித்தளத்தை உருவாக்குகிறார்.",
      Telugu: "డా. టి జి మంజునాథ గారు AIML విభాగానికి అధిపతి. కృత్రిమ మేధస్సు, మెషిన్ లెర్నింగ్ మరియు డేటా ఆధారిత సమస్యల పరిష్కారంపై దృష్టి సారిస్తున్నారు.",
      Malayalam: "ഡോ. ടി ജി മഞ്ജുനാഥ AIML വിഭാഗത്തിന്റെ തലവനാണ്. ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ്, മെഷീൻ ലേണിംഗ് എന്നിവയിൽ ശക്തമായ അടിസ്ഥാനങ്ങൾ നൽകുന്നു.",
      Hindi: "डॉ. टी जी मंजनाथ AIML विभाग के प्रमुख हैं। वे आर्टिफिशियल इंटेलिजेंस, मशीन लर्निंग और डेटा आधारित समस्या समाधान पर ध्यान केंद्रित करते हैं।"
    },
    portrait: hodImg
  };

  // Select localized bio with English fallback
  const selectedBio = data.bio[language] || data.bio.English;

  return (
    <PremiumHODCard
      name={data.name}
      title={data.title}
      bio={selectedBio}
      portrait={data.portrait}
    />
  );
}
