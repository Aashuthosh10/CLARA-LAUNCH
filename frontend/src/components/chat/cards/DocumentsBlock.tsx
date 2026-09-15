import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  FolderOpen,
  IdCard,
  Image as ImageIcon,
  Ticket,
  ClipboardList,
} from 'lucide-react';
import { useLanguage, type Language } from '../../../context/LanguageContext';
import { uiText } from '../../../localization/uiCopy';

const DOCUMENTS_EN: string[] = [
  '10th Marks Card',
  '12th / II PUC Marks Card',
  'CET / COMEDK Rank Card + Allotment Letter',
  'Transfer Certificate (TC)',
  'Conduct / Character Certificate',
  'Caste / Income Certificate (if applicable)',
  'Aadhaar Card Copy',
  'Passport Size Photos (6–10)',
  'Migration Certificate (for other board students)',
  'VTU Eligibility Certificate (if required)',
];

const TITLE_BY_LANGUAGE: Partial<Record<Language, string>> = {
  English: 'Required Documents',
  Hindi: 'आवश्यक दस्तावेज़',
  Tamil: 'தேவையான ஆவணங்கள்',
  Telugu: 'అవసరమైన పత్రాలు',
  Malayalam: 'ആവശ്യമായ രേഖകൾ',
};

const SUPPORT_BY_LANGUAGE: Partial<Record<Language, string>> = {
  English: 'Bring originals and clear photocopies for admission verification.',
  Hindi: 'प्रवेश सत्यापन के लिए मूल दस्तावेज़ और स्पष्ट फोटोकॉपी साथ लाएँ।',
  Tamil: 'சேர்க்கை சரிபார்ப்பிற்கு அசல் ஆவணங்களையும் தெளிவான நகல்களையும் கொண்டு வாருங்கள்.',
  Telugu: 'ప్రవేశ ధృవీకరణ కోసం అసలు పత్రాలు మరియు స్పష్టమైన ఫోటోకాపీలు తీసుకురండి.',
  Malayalam: 'പ്രവേശന പരിശോധനയ്ക്ക് ഒറിജിനലുകളും വ്യക്തമായ ഫോട്ടോകോപ്പികളും കൊണ്ടുവരുക.',
  Kannada: 'ಪ್ರವೇಶ ಪರಿಶೀಲನೆಗೆ ಮೂಲ ದಾಖಲೆಗಳು ಮತ್ತು ಸ್ಪಷ್ಟ ಫೋಟೋಕಾಪಿಗಳನ್ನು ತನ್ನಿ.',
};

const DOCUMENT_TRANSLATIONS: Partial<Record<Language, Record<string, string>>> = {
  English: {},
  Hindi: {
    '10th Marks Card': '10वीं अंकतालिका',
    '12th / II PUC Marks Card': '12वीं / II PUC अंकतालिका',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK रैंक कार्ड + अलॉटमेंट लेटर',
    'Transfer Certificate (TC)': 'ट्रांसफर सर्टिफिकेट (TC)',
    'Conduct / Character Certificate': 'कंडक्ट / चरित्र प्रमाण पत्र',
    'Caste / Income Certificate (if applicable)': 'जाति / आय प्रमाण पत्र (यदि लागू हो)',
    'Aadhaar Card Copy': 'आधार कार्ड की प्रति',
    'Passport Size Photos (6–10)': 'पासपोर्ट आकार फोटो (6–10)',
    'Migration Certificate (for other board students)': 'माइग्रेशन प्रमाण पत्र (अन्य बोर्ड छात्रों के लिए)',
    'VTU Eligibility Certificate (if required)': 'VTU पात्रता प्रमाण पत्र (यदि आवश्यक हो)',
  },
  Tamil: {
    '10th Marks Card': '10ஆம் வகுப்பு மதிப்பெண் அட்டை',
    '12th / II PUC Marks Card': '12ஆம் / II PUC மதிப்பெண் அட்டை',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK தரவரிசை அட்டை + ஒதுக்கீட்டு கடிதம்',
    'Transfer Certificate (TC)': 'மாற்றுச் சான்றிதழ் (TC)',
    'Conduct / Character Certificate': 'நடத்தை / குணச் சான்றிதழ்',
    'Caste / Income Certificate (if applicable)': 'சாதி / வருமானச் சான்றிதழ் (தேவையெனில்)',
    'Aadhaar Card Copy': 'ஆதார் அட்டை நகல்',
    'Passport Size Photos (6–10)': 'பாஸ்போர்ட் அளவு புகைப்படங்கள் (6–10)',
    'Migration Certificate (for other board students)': 'மைக்ரேஷன் சான்றிதழ் (பிற வாரிய மாணவர்களுக்கு)',
    'VTU Eligibility Certificate (if required)': 'VTU தகுதி சான்றிதழ் (தேவையெனில்)',
  },
  Telugu: {
    '10th Marks Card': '10వ తరగతి మార్క్స్ కార్డ్',
    '12th / II PUC Marks Card': '12వ / II PUC మార్క్స్ కార్డ్',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK ర్యాంక్ కార్డ్ + అలాట్‌మెంట్ లెటర్',
    'Transfer Certificate (TC)': 'ట్రాన్స్‌ఫర్ సర్టిఫికేట్ (TC)',
    'Conduct / Character Certificate': 'కండక్ట్ / క్యారెక్టర్ సర్టిఫికేట్',
    'Caste / Income Certificate (if applicable)': 'కులం / ఆదాయం సర్టిఫికేట్ (అవసరమైతే)',
    'Aadhaar Card Copy': 'ఆధార్ కార్డ్ కాపీ',
    'Passport Size Photos (6–10)': 'పాస్‌పోర్ట్ సైజ్ ఫోటోలు (6–10)',
    'Migration Certificate (for other board students)': 'మైగ్రేషన్ సర్టిఫికేట్ (ఇతర బోర్డు విద్యార్థులకు)',
    'VTU Eligibility Certificate (if required)': 'VTU ఎలిజిబిలిటీ సర్టిఫికేట్ (అవసరమైతే)',
  },
  Malayalam: {
    '10th Marks Card': '10ാം ക്ലാസ് മാർക്ക് കാർഡ്',
    '12th / II PUC Marks Card': '12ാം / II PUC മാർക്ക് കാർഡ്',
    'CET / COMEDK Rank Card + Allotment Letter': 'CET / COMEDK റാങ്ക് കാർഡ് + അലോട്ട്മെന്റ് ലെറ്റർ',
    'Transfer Certificate (TC)': 'ട്രാൻസ്ഫർ സർട്ടിഫിക്കറ്റ് (TC)',
    'Conduct / Character Certificate': 'കണ്ടക്റ്റ് / കാരക്ടർ സർട്ടിഫിക്കറ്റ്',
    'Caste / Income Certificate (if applicable)': 'ജാതി / വരുമാന സർട്ടിഫിക്കറ്റ് (ആവശ്യമായാൽ)',
    'Aadhaar Card Copy': 'ആധാർ കാർഡ് പകർപ്പ്',
    'Passport Size Photos (6–10)': 'പാസ്‌പോർട്ട് സൈസ് ഫോട്ടോകൾ (6–10)',
    'Migration Certificate (for other board students)': 'മൈഗ്രേഷൻ സർട്ടിഫിക്കറ്റ് (മറ്റ് ബോർഡ് വിദ്യാർത്ഥികൾക്ക്)',
    'VTU Eligibility Certificate (if required)': 'VTU യോഗ്യത സർട്ടിഫിക്കറ്റ് (ആവശ്യമായാൽ)',
  },
};

function IconForDocument({ doc }: { doc: string }) {
  const n = doc.toLowerCase();
  const cls = 'documents-premium__item-icon';
  if (n.includes('aadhaar') || n.includes('ಆಧಾರ್') || n.includes('आधार')) {
    return <IdCard className={cls} aria-hidden />;
  }
  if (n.includes('marks') || n.includes('अंक') || n.includes('ಮಾರ್ಕ್')) {
    return <FileText className={cls} aria-hidden />;
  }
  if (n.includes('rank') || n.includes('comedk') || n.includes('cet')) {
    return <Ticket className={cls} aria-hidden />;
  }
  if (n.includes('photo') || n.includes('फोटो') || n.includes('ಫೋಟೋ')) {
    return <ImageIcon className={cls} aria-hidden />;
  }
  return <FolderOpen className={cls} aria-hidden />;
}

export default function DocumentsBlock() {
  const { language } = useLanguage();
  const isKannada = language === 'Kannada';
  const title = isKannada
    ? uiText('Kannada', 'documents.title')
    : TITLE_BY_LANGUAGE[language] ?? TITLE_BY_LANGUAGE.English;
  const chromeLabel = uiText(language, 'documents.label');
  const chromeChecklist = uiText(language, 'documents.checklist');
  const support =
    SUPPORT_BY_LANGUAGE[language] ?? SUPPORT_BY_LANGUAGE.English ?? SUPPORT_BY_LANGUAGE.English!;
  const translations = DOCUMENT_TRANSLATIONS[language] ?? DOCUMENT_TRANSLATIONS.English ?? {};
  const items = useMemo(
    () =>
      isKannada
        ? [
            'marks_10',
            'marks_12',
            'rank_allotment',
            'transfer',
            'conduct',
            'caste_income',
            'aadhaar',
            'photos',
            'migration',
            'vtu_eligibility',
          ].map((key) => ({
            text: uiText('Kannada', `documents.items.${key}`),
            key,
          }))
        : DOCUMENTS_EN.map((doc) => ({
            text: translations[doc] ?? doc,
            key: doc,
          })),
    [isKannada, translations],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="premium-hod-container documents-premium"
      data-testid="documents-block"
      data-variant="documents"
    >
      <div className="premium-hod-border-outer" />
      <div className="premium-hod-border-inner" />
      <div className="premium-hod-vignette" />
      <div className="premium-hod-glow" />

      <div className="premium-hod-content documents-premium__content">
        <div className="premium-hod-left documents-premium__left">
          <div className="premium-hod-text-box documents-premium__text-box">
            <div className="premium-hod-label">{chromeLabel}</div>
            <h2 className="premium-hod-name documents-premium__title">{title}</h2>
            <div className="premium-hod-title">{chromeChecklist}</div>
            <ul className="documents-premium__list" data-testid="documents-list">
              {items.map((item) => (
                <li key={item.key} className="documents-premium__item">
                  <IconForDocument doc={`${item.key} ${item.text}`} />
                  <span className="documents-premium__item-text">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="premium-hod-right documents-premium__right" aria-hidden>
          <div className="documents-premium__panel">
            <ClipboardList className="documents-premium__panel-icon" />
            <p className="documents-premium__panel-title">Admission desk</p>
            <p className="documents-premium__panel-copy">{support}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
