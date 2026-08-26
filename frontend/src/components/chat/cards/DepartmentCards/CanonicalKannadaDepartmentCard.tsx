import React from 'react';
import { Award, MessageSquare, Rocket, TrendingUp, Users } from 'lucide-react';
import kannadaLocale from '@college-locales/kn.json';

import BaseDepartmentCard from './BaseDepartmentCard';

const DEPARTMENT_KEYS: Record<string, string> = {
  CSE: 'cse',
  'CSE (AI & ML)': 'cse_aiml',
  'CSE (Data Science)': 'cse_ds',
  'CSE (Cyber Security)': 'cse_cysec',
  'CSE (Business Systems)': 'cse_bs',
  ISE: 'ise',
  ECE: 'ece',
  Civil: 'civil',
  Mechanical: 'mechanical',
  MBA: 'mba',
  Mathematics: 'mathematics',
  Physics: 'physics',
  Chemistry: 'chemistry',
  'Basic Sciences': 'basic_sciences',
};

const ICONS = [<Users />, <MessageSquare />, <TrendingUp />, <Award />, <Rocket />];

export default function CanonicalKannadaDepartmentCard({
  slides,
  currentIdx,
  onNext,
  onPrev,
  onSelectSlide,
  departmentId,
}: any) {
  const locale = kannadaLocale as any;
  const departmentKey = DEPARTMENT_KEYS[departmentId] ?? 'cse';
  const departments = locale.departments as Record<string, { name?: string; intro?: string }>;
  const hods = locale.role_holders.hod_by_department as Record<string, { hod_name?: string }>;
  const department = departments[departmentKey] ?? departments.cse;
  const hod = hods[departmentKey];
  const currentSlide = slides[currentIdx] || {};
  const visualSlotIndex = typeof currentSlide?.slotIndex === 'number' ? currentSlide.slotIndex : currentIdx;

  return (
    <BaseDepartmentCard
      department={department.name ?? departmentId}
      deptTagline={currentSlide.tagline || ''}
      title={currentSlide.title || ''}
      tagline={currentSlide.tagline || ''}
      description={currentSlide.content || ''}
      icon={ICONS[visualSlotIndex % ICONS.length]}
      isHOD={visualSlotIndex === 1}
      hodName={hod?.hod_name ?? ''}
      departmentId={departmentId}
      currentSlide={currentIdx}
      visualSlotIndex={visualSlotIndex}
      totalSlides={slides.length}
      onNext={onNext}
      onPrev={onPrev}
      onSelectSlide={onSelectSlide}
    />
  );
}
