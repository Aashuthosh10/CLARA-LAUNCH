import React from 'react';
import { useLanguage, type Language } from '../../../context/LanguageContext';
import { uiText } from '../../../localization/uiCopy';

const DEPT_ALIAS: Record<string, string> = {
  cse: 'cse',
  'computer science': 'cse',
  ise: 'ise',
  'information science': 'ise',
  aiml: 'cse_aiml',
  'ai ml': 'cse_aiml',
  'cse aiml': 'cse_aiml',
  'data science': 'cse_ds',
  datascience: 'cse_ds',
  'cse data science': 'cse_ds',
  'cyber security': 'cse_cysec',
  cybersecurity: 'cse_cysec',
  'business systems': 'cse_bs',
  ece: 'ece',
  civil: 'civil',
  mechanical: 'mechanical',
  mech: 'mechanical',
  mba: 'mba',
  'basic sciences': 'basic_sciences',
};

const DEPARTMENT_ORDER: string[] = [
  'cse',
  'ise',
  'cse_aiml',
  'cse_ds',
  'cse_cysec',
  'cse_bs',
  'ece',
  'civil',
  'mechanical',
  'mba',
  'basic_sciences',
];

const MANAGEMENT_QUOTA_FEE_BY_KEY: Record<string, number> = {
  cse: 325000,
  cse_aiml: 325000,
  cse_cysec: 325000,
  cse_ds: 300000,
  cse_bs: 275000,
  ece: 250000,
  civil: 125000,
  mechanical: 125000,
};

const DEPARTMENT_DISPLAY_BY_LANGUAGE: Partial<Record<Language, Record<string, string>>> = {
  English: {
    cse: 'CSE',
    ise: 'ISE',
    cse_aiml: 'CSE (AI & ML)',
    cse_ds: 'CSE (Data Science)',
    cse_cysec: 'CSE (Cyber Security)',
    cse_bs: 'CSE (Business Systems)',
    ece: 'ECE',
    civil: 'Civil',
    mechanical: 'Mechanical',
    mba: 'MBA',
    basic_sciences: 'Basic Sciences',
  },
  Hindi: {
    cse: 'कंप्यूटर साइंस (CSE)',
    ise: 'आईएसई (ISE)',
    cse_aiml: 'CSE (AI & ML)',
    cse_ds: 'CSE (डेटा साइंस)',
    cse_cysec: 'CSE (साइबर सिक्योरिटी)',
    cse_bs: 'CSE (बिज़नेस सिस्टम्स)',
    ece: 'इलेक्ट्रॉनिक्स (ECE)',
    civil: 'सिविल',
    mechanical: 'मैकेनिकल',
    mba: 'एमबीए (MBA)',
    basic_sciences: 'बेसिक साइंसेस',
  },
  Tamil: {
    cse: 'கம்ப்யூட்டர் சயின்ஸ் (CSE)',
    ise: 'ஐஎஸ்இ (ISE)',
    cse_aiml: 'CSE (AI & ML)',
    cse_ds: 'CSE (டேட்டா சயின்ஸ்)',
    cse_cysec: 'CSE (சைபர் செக்யூரிட்டி)',
    cse_bs: 'CSE (பிஸினஸ் சிஸ்டம்ஸ்)',
    ece: 'எலெக்ட்ரானிக்ஸ் (ECE)',
    civil: 'சிவில்',
    mechanical: 'மெக்கானிக்கல்',
    mba: 'எம்பிஏ (MBA)',
    basic_sciences: 'அடிப்படை அறிவியல்',
  },
  Telugu: {
    cse: 'కంప్యూటర్ సైన్స్ (CSE)',
    ise: 'ఐఎస్‌ఇ (ISE)',
    cse_aiml: 'CSE (AI & ML)',
    cse_ds: 'CSE (డేటా సైన్స్)',
    cse_cysec: 'CSE (సైబర్ సెక్యూరిటీ)',
    cse_bs: 'CSE (బిజినెస్ సిస్టమ్స్)',
    ece: 'ఎలక్ట్రానిక్స్ (ECE)',
    civil: 'సివిల్',
    mechanical: 'మెకానికల్',
    mba: 'ఎంబీఏ (MBA)',
    basic_sciences: 'బేసిక్ సైన్సెస్',
  },
  Malayalam: {
    cse: 'കമ്പ്യൂട്ടർ സയൻസ് (CSE)',
    ise: 'ഐഎസ്ഇ (ISE)',
    cse_aiml: 'CSE (AI & ML)',
    cse_ds: 'CSE (ഡാറ്റ സയൻസ്)',
    cse_cysec: 'CSE (സൈബർ സെക്യൂരിറ്റി)',
    cse_bs: 'CSE (ബിസിനസ് സിസ്റ്റംസ്)',
    ece: 'ഇലക്ട്രോണിക്സ് (ECE)',
    civil: 'സിവിൽ',
    mechanical: 'മെക്കാനിക്കൽ',
    mba: 'എംബിഎ (MBA)',
    basic_sciences: 'ബേസിക് സയൻസസ്',
  },
};

type FeesCopy = {
  title: string;
  description: string;
  selectedDepartment: string;
  department: string;
  managementQuotaFee: string;
  otherQuotas: string;
  officeContact: string;
};

const FEES_COPY_BY_LANGUAGE: Partial<Record<Language, FeesCopy>> = {
  English: {
    title: 'Fees',
    description: 'Department-wise annual fee reference for the current academic intake.',
    selectedDepartment: 'Selected Department',
    department: 'Department',
    managementQuotaFee: 'Management Quota Fee',
    otherQuotas: 'Other Quotas',
    officeContact: 'Please contact the admission office for precise information.',
  },
  Hindi: {
    title: 'फीस',
    description: 'वर्तमान शैक्षणिक प्रवेश के लिए विभाग-वार वार्षिक फीस संदर्भ।',
    selectedDepartment: 'चयनित विभाग',
    department: 'विभाग',
    managementQuotaFee: 'मैनेजमेंट कोटा फीस',
    otherQuotas: 'अन्य कोटा',
    officeContact: 'सटीक जानकारी के लिए कृपया एडमिशन ऑफिस से संपर्क करें।',
  },
  Tamil: {
    title: 'கட்டணம்',
    description: 'தற்போதைய கல்வி சேர்க்கைக்கான துறைவாரியான ஆண்டு கட்டண குறிப்புகள்.',
    selectedDepartment: 'தேர்ந்தெடுத்த துறை',
    department: 'துறை',
    managementQuotaFee: 'மேலாண்மை ஒதுக்கீடு கட்டணம்',
    otherQuotas: 'மற்ற ஒதுக்கீடுகள்',
    officeContact: 'துல்லியமான தகவலுக்கு சேர்க்கை அலுவலகத்தை தொடர்புகொள்ளவும்.',
  },
  Telugu: {
    title: 'ఫీజులు',
    description: 'ప్రస్తుత విద్యా ప్రవేశానికి విభాగాల వారీగా వార్షిక ఫీజు సూచన.',
    selectedDepartment: 'ఎంచుకున్న విభాగం',
    department: 'విభాగం',
    managementQuotaFee: 'మేనేజ్‌మెంట్ కోటా ఫీజు',
    otherQuotas: 'ఇతర కోటాలు',
    officeContact: 'ఖచ్చితమైన సమాచారం కోసం అడ్మిషన్ కార్యాలయాన్ని సంప్రదించండి.',
  },
  Malayalam: {
    title: 'ഫീസ്',
    description: 'നിലവിലെ അക്കാദമിക് അഡ്മിഷനുള്ള വിഭാഗംപ്രകാരമുള്ള വാർഷിക ഫീസ് വിവരം.',
    selectedDepartment: 'തിരഞ്ഞെടുത്ത വിഭാഗം',
    department: 'വിഭാഗം',
    managementQuotaFee: 'മാനേജ്മെന്റ് ക്വോട്ട ഫീസ്',
    otherQuotas: 'മറ്റ് ക്വോട്ടകൾ',
    officeContact: 'കൃത്യമായ വിവരങ്ങൾക്ക് അഡ്മിഷൻ ഓഫീസുമായി ബന്ധപ്പെടുക.',
  },
};

interface DepartmentFeesCardProps {
  departmentId?: string | null;
  language?: Language;
}

function normalizeDepartmentKey(departmentId: string): string {
  const cleaned = String(departmentId || '').trim().toLowerCase();
  return DEPT_ALIAS[cleaned] ?? cleaned;
}

function formatInr(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function DepartmentFeesCard({ departmentId, language: languageProp }: DepartmentFeesCardProps) {
  const { language: contextLanguage } = useLanguage();
  const language = languageProp || contextLanguage;
  if (language === 'Kannada') {
    return (
      <div className="w-full max-w-5xl premium-glass-card p-10" data-testid="department-fees-card">
        <p className="whitespace-pre-line text-[20px] leading-relaxed text-slate-800">
          {uiText('Kannada', 'availability.official_fact_blocked')}
        </p>
      </div>
    );
  }

  const copy = (FEES_COPY_BY_LANGUAGE[language] ?? FEES_COPY_BY_LANGUAGE.English) as FeesCopy;
  const labelsByLanguage = (DEPARTMENT_DISPLAY_BY_LANGUAGE[language] ?? DEPARTMENT_DISPLAY_BY_LANGUAGE.English) as Record<string, string>;
  const selectedKey = normalizeDepartmentKey(departmentId ?? '');

  return (
    <div
      className="w-full max-w-5xl premium-glass-card p-10 overflow-hidden relative"
      data-testid="department-fees-card"
      data-department-id={selectedKey}
    >
      {/* Accent Glow inside card */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-[12px] tracking-[0.2em] text-indigo-500 font-bold uppercase mb-2">{copy.title}</div>
        <h2 className="text-[48px] leading-[1.05] font-bold text-[#0F172A] mb-4 tracking-tight">{copy.title}</h2>
        <p className="text-[#334155] text-[18px] leading-relaxed mb-6 max-w-2xl">{copy.description}</p>
        {DEPARTMENT_ORDER.includes(selectedKey) && (
          <div className="mb-6 px-4 py-2 bg-white/40 backdrop-blur-md rounded-full inline-flex items-center gap-2 border border-white/40 shadow-sm">
            <span className="text-[14px] font-semibold text-indigo-600 uppercase tracking-wide">{copy.selectedDepartment}:</span>
            <span className="text-[16px] font-bold text-slate-800">{labelsByLanguage[selectedKey] ?? selectedKey}</span>
          </div>
        )}

      <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm no-scrollbar">
        <table className="w-full border-collapse text-[15px]">
          <thead className="sticky top-0 bg-white/20 backdrop-blur-md z-10">
            <tr>
              <th className="border-b border-white/20 px-6 py-4 text-left font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">{copy.department}</th>
              <th className="border-b border-white/20 px-6 py-4 text-left font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">{copy.managementQuotaFee}</th>
              <th className="border-b border-white/20 px-6 py-4 text-left font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">{copy.otherQuotas}</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENT_ORDER.map((deptKey) => {
              const isSelected = deptKey === selectedKey;
              const amount = formatInr(MANAGEMENT_QUOTA_FEE_BY_KEY[deptKey]);
              return (
                <tr key={deptKey} className={`transition-colors ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}>
                  <td className="border-b border-white/10 px-6 py-4 text-[#334155] font-medium">
                    {labelsByLanguage[deptKey] ?? deptKey}
                  </td>
                  <td className="border-b border-white/10 px-6 py-4 text-[#334155]">{amount || copy.officeContact}</td>
                  <td className="border-b border-white/10 px-6 py-4 text-[#334155] italic opacity-70">{copy.officeContact}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-[14px] text-[#334155]/70 font-medium">{copy.officeContact}</div>
      </div>
    </div>
  );
}

