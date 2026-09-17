"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronDown, Check } from 'lucide-react';
import { isLocale } from '@/i18n/locales';

// Only the locales `src/i18n/request.ts` actually has a message catalog for
// are switchable — the rest are listed but disabled, rather than silently
// no-op-switching to a language that still renders English everywhere. See
// messages/README.md for translation status.
const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'am', label: 'Amharic', flag: '🇪🇹' },
  { code: 'om', label: 'Afaan Oromo', flag: '🇪🇹' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'ti', label: 'Tigrinya', flag: '🇪🇹' },
  { code: 'so', label: 'Somali', flag: '🇸🇴' },
] as const;

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const selectedLang = useLocale();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLocale = async (code: string) => {
    if (!isLocale(code) || code === selectedLang) {
      setIsOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: code }),
      });
      router.refresh();
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0]!;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between w-[200px] border border-gray-200 rounded-lg px-4 py-2 text-[18px] font-medium text-[#475569] hover:bg-gray-50 hover:shadow-sm hover:border-gray-300 active:scale-95 focus:outline-none transition-all duration-300"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[22px] leading-none inline-block origin-bottom-right group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">{currentLang.flag}</span>
          <span className="truncate text-[16px] font-medium">{currentLang.label}</span>
        </div>
        <ChevronDown className={`w-[18px] h-[18px] text-[#64748b] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 transition-all duration-200 origin-top z-50 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }`}
      >
        <div className="py-2">
          {LANGUAGES.map((lang) => {
            const isAvailable = isLocale(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => changeLocale(lang.code)}
                disabled={!isAvailable || isSaving}
                title={isAvailable ? undefined : 'Translation not available yet'}
                className={`w-full flex items-center px-6 py-4 transition-colors text-left ${isAvailable ? 'hover:bg-slate-50' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span className="text-[22px] mr-4 leading-none">{lang.flag}</span>
                <span className={`text-[16px] flex-1 tracking-wide ${selectedLang === lang.code ? 'font-bold text-[#1e293b]' : 'font-medium text-[#334155]'}`}>
                  {lang.label}
                </span>
                {selectedLang === lang.code && (
                  <Check className="w-6 h-6 text-[#10b981] stroke-[2]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
