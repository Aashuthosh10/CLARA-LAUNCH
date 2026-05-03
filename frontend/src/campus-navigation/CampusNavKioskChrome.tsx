import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Globe, HelpCircle, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../context/LanguageContext';
import { LANGUAGE_OPTIONS } from '../screens/LanguageSelect';
import { CAMPUS_DIRECTIONS, campusLabels } from './campusDirections';

type CampusNavKioskChromeProps = {
  language: Language;
  onPickDestinationIndex: (index: number) => void;
  destinationSelectRef: React.RefObject<HTMLSelectElement | null>;
};

export default function CampusNavKioskChrome({
  language,
  onPickDestinationIndex,
  destinationSelectRef,
}: CampusNavKioskChromeProps) {
  const { language: ctxLang, setLanguage } = useLanguage();
  const lb = campusLabels(language) as Record<string, string>;
  const [q, setQ] = useState('');
  const [openSearch, setOpenSearch] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const effectiveLang = ctxLang ?? language;

  const matches = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (qq.length < 1) return [];
    const out: { idx: number; label: string }[] = [];
    for (let idx = 0; idx < CAMPUS_DIRECTIONS.length && out.length < 8; idx += 1) {
      const d = CAMPUS_DIRECTIONS[idx];
      if (d.to.toLowerCase().includes(qq)) out.push({ idx, label: d.to });
    }
    return out;
  }, [q]);

  const closePanels = useCallback(() => {
    setOpenSearch(false);
    setHelpOpen(false);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const down = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) closePanels();
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [closePanels]);

  const focusDestinationSelect = useCallback(() => {
    destinationSelectRef.current?.focus();
    try {
      destinationSelectRef.current?.showPicker?.();
    } catch {
      /* showPicker not supported for all <select> impl. */
    }
  }, [destinationSelectRef]);

  return (
    <div ref={rootRef} className="campus-nav-kiosk-chrome" role="banner">
      <div className="campus-nav-kiosk-chrome-row">
        <span className="campus-nav-kiosk-brand" aria-label={lb.campusKioskBrandShort}>
          {lb.campusKioskBrandShort}
        </span>

        <div className="campus-nav-kiosk-search-wrap">
          <label className="campus-nav-kiosk-search-label" htmlFor={`${listId}-search`}>
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <span className="campus-nav-kiosk-sr-only">{lb.campusKioskSearchPlaceholder}</span>
          </label>
          <input
            id={`${listId}-search`}
            type="search"
            className="campus-nav-kiosk-search"
            placeholder={lb.campusKioskSearchPlaceholder}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpenSearch(true);
            }}
            onFocus={() => setOpenSearch(true)}
            autoComplete="off"
            enterKeyHint="search"
            aria-expanded={openSearch}
            aria-controls={openSearch ? `${listId}-results` : undefined}
            aria-autocomplete="list"
          />
          {openSearch && matches.length > 0 ? (
            <ul id={`${listId}-results`} className="campus-nav-kiosk-search-results" role="listbox">
              {matches.map((m) => (
                <li key={m.idx} role="option">
                  <button
                    type="button"
                    className="campus-nav-kiosk-search-hit"
                    onClick={() => {
                      onPickDestinationIndex(m.idx);
                      setQ('');
                      setOpenSearch(false);
                    }}
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav className="campus-nav-kiosk-actions" aria-label={lb.campusKioskChromeNav}>
          <button type="button" className="campus-nav-kiosk-link-btn" onClick={focusDestinationSelect}>
            <BookOpen size={17} aria-hidden />
            <span>{lb.campusKioskDirectory}</span>
          </button>

          <div className="campus-nav-kiosk-lang">
            <span className="campus-nav-kiosk-lang-visual" aria-hidden>
              <Globe size={17} strokeWidth={2} className="campus-nav-kiosk-lang-globe-ic" />
              <ChevronDown size={14} className="campus-nav-kiosk-lang-chev" aria-hidden />
            </span>
            <select
              className="campus-nav-kiosk-lang-select"
              aria-label={lb.campusKioskLanguage}
              value={effectiveLang}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.name} value={opt.name}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="campus-nav-kiosk-help-wrap">
            <button
              type="button"
              className="campus-nav-kiosk-link-btn"
              aria-expanded={helpOpen}
              aria-controls={`${listId}-help`}
              onClick={() => setHelpOpen((v) => !v)}
            >
              <HelpCircle size={17} aria-hidden />
              <span>{lb.campusKioskHelp}</span>
            </button>
            {helpOpen ? (
              <div id={`${listId}-help`} className="campus-nav-kiosk-help-popover" role="region">
                <p>{lb.campusKioskHelpBody}</p>
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </div>
  );
}
