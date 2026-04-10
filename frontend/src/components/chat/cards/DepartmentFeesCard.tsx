import React, { useMemo } from 'react';
import { useLanguage, type Language } from '../../../context/LanguageContext';
import feesEn from '../../../data/locales/en.json';
import feesHi from '../../../data/locales/hi.json';
import feesKn from '../../../data/locales/kn.json';
import feesTa from '../../../data/locales/ta.json';
import feesTe from '../../../data/locales/te.json';
import feesMl from '../../../data/locales/ml.json';

type FeesLocale = {
  fees: {
    title: string;
    description: string;
    management: string;
    other: string;
    visit_office: string;
    footer: string;
    admission_quota: string;
    estimated_fee: string;
    specify_department: string;
  };
  departments: Record<
    string,
    {
      name: string;
      fees: {
        management: string;
      };
    }
  >;
};

const LOCALE_BY_LANGUAGE: Record<Language, FeesLocale> = {
  English: feesEn as FeesLocale,
  Hindi: feesHi as FeesLocale,
  Kannada: feesKn as FeesLocale,
  Tamil: feesTa as FeesLocale,
  Telugu: feesTe as FeesLocale,
  Malayalam: feesMl as FeesLocale,
};

const DEPT_ALIAS: Record<string, string> = {
  cse: 'cse',
  'cse (computer science)': 'cse',
  'computer science': 'cse',
  ise: 'ise',
  'ise (information science)': 'ise',
  'information science': 'ise',
  aiml: 'cse_aiml',
  'cse (ai & ml)': 'cse_aiml',
  'cse (ai and ml)': 'cse_aiml',
  'ai ml': 'cse_aiml',
  'ai & ml': 'cse_aiml',
  'cse aiml': 'cse_aiml',
  ds: 'cse_ds',
  'cse (data science)': 'cse_ds',
  'data science': 'cse_ds',
  'cse data science': 'cse_ds',
  'cyber security': 'cse_cysec',
  'cse (cyber security)': 'cse_cysec',
  cybersecurity: 'cse_cysec',
  'cse cyber security': 'cse_cysec',
  'business systems': 'cse_bs',
  'cse (business systems)': 'cse_bs',
  'cse business systems': 'cse_bs',
  ece: 'ece',
  electronics: 'ece',
  civil: 'civil',
  mechanical: 'mechanical',
  mech: 'mechanical',
  mba: 'mba',
  'basic sciences': 'basic_sciences',
  'basic science': 'basic_sciences',
};

function normalizeDepartmentKey(departmentId: string): string {
  const cleaned = (departmentId || '').trim().toLowerCase();
  return DEPT_ALIAS[cleaned] ?? cleaned;
}

function formatInr(raw: string): string {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  const value = Number(digits);
  if (!Number.isFinite(value)) return '';
  return `₹${value.toLocaleString('en-IN')}`;
}

interface DepartmentFeesCardProps {
  departmentId?: string | null;
}

export default function DepartmentFeesCard({ departmentId }: DepartmentFeesCardProps) {
  const { language, t } = useLanguage();
  const locale = useMemo(() => LOCALE_BY_LANGUAGE[language] ?? LOCALE_BY_LANGUAGE.English, [language]);

  const normalizedDept = normalizeDepartmentKey(String(departmentId ?? ''));
  const deptRecord = normalizedDept ? locale.departments?.[normalizedDept] : undefined;
  const managementFee = deptRecord?.fees?.management ?? '';
  const formattedManagementFee = formatInr(managementFee);

  if (!departmentId || !deptRecord) {
    return (
      <div className="w-full max-w-3xl rounded-3xl border border-[#d8d0c3] bg-[#f8f5ee] p-8 shadow-md">
        <div className="text-[12px] tracking-[0.18em] text-[#9b8e6c] uppercase mb-2">
          {t('fees.title')}
        </div>
        <div className="text-[20px] font-semibold text-[#222]">
          {t('fees.specify_department')}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl rounded-3xl border border-[#d8d0c3] bg-[#f8f5ee] p-8 shadow-md">
      <div className="text-[12px] tracking-[0.18em] text-[#9b8e6c] uppercase mb-1">
        {t('fees.title')}
      </div>
      <h2 className="text-[52px] leading-[1.02] font-semibold text-[#1f1f1f] mb-3">{deptRecord.name}</h2>
      <p className="text-[#2d2d2d] text-[18px] leading-relaxed mb-6">{t('fees.description')}</p>

      <table className="w-full border-collapse text-[18px]">
        <thead>
          <tr>
            <th className="border border-[#bcb6ab] bg-[#f3f0e9] px-4 py-3 text-left font-semibold text-[#191919]">
              {t('fees.admission_quota')}
            </th>
            <th className="border border-[#bcb6ab] bg-[#f3f0e9] px-4 py-3 text-left font-semibold text-[#191919]">
              {t('fees.estimated_fee')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#bcb6ab] px-4 py-3 text-[#1f1f1f]">{t('fees.management')}</td>
            <td className="border border-[#bcb6ab] px-4 py-3 text-[#1f1f1f]">
              {formattedManagementFee || t('fees.visit_office')}
            </td>
          </tr>
          <tr>
            <td className="border border-[#bcb6ab] px-4 py-3 text-[#1f1f1f]">{t('fees.other')}</td>
            <td className="border border-[#bcb6ab] px-4 py-3 text-[#1f1f1f]">{t('fees.visit_office')}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 text-[14px] text-[#3f3f3f]">{t('fees.footer')}</div>
    </div>
  );
}
