import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getCardContent } from '../../content/cardContent';

export default function CourseMenuComponent({
  onSelect,
  onBack,
}: {
  onSelect: (departmentName: string) => void;
  onBack?: () => void;
}) {
  const { language } = useLanguage();
  const { COURSE_MENU_GROUPS, COURSE_MENU_COPY } = getCardContent(language);

  return (
    <div className="w-full h-full flex flex-col">
      {onBack && (
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
            aria-label="Back to chat"
          >
            <ArrowLeft size={24} />
          </button>
          <span className="text-white/60 text-sm uppercase tracking-widest">CLARA</span>
          <div className="w-10" />
        </header>
      )}
      <div className="flex-1 flex items-center justify-center px-10">
        <div className="w-full max-w-5xl">
          <div className="mb-10 text-center">
            <div className="text-stone-300 tracking-[0.25em] uppercase text-xs">{COURSE_MENU_COPY.subtitle}</div>
            <div className="mt-3 text-4xl font-display italic text-white">{COURSE_MENU_COPY.heading}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COURSE_MENU_GROUPS.map((g) => (
            <div key={g.title} className="glass rounded-3xl border border-white/10 p-6">
              <div className="text-stone-200 tracking-widest uppercase text-xs">{g.title}</div>
              <div className="mt-5 flex flex-col gap-3">
                {g.items.map((dept) => (
                  <motion.button
                    key={dept}
                    type="button"
                    onClick={() => onSelect(dept)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="w-full text-left px-5 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
                  >
                    <div className="text-white text-lg">{dept}</div>
                    <div className="text-stone-400 text-xs tracking-widest uppercase mt-1">{COURSE_MENU_COPY.itemSuffix}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}

