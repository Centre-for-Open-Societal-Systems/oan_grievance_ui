'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchSubmitterOptionsThunk,
  selectPreferredLanguageOptions,
  selectSelectedLanguage,
  setSelectedLanguage,
} from '@/features/metadata';

/** The flag-and-label language picker on the auth card, distinct from the emoji-based one in the dashboard header. */
export function LanguageSelector() {
  const dispatch = useAppDispatch();
  const dynamicLanguages = useAppSelector(selectPreferredLanguageOptions);
  const metadataStatus = useAppSelector((state) => state.metadata.submitterOptionsStatus);
  const selectedCode = useAppSelector(selectSelectedLanguage);

  useEffect(() => {
    if (metadataStatus === 'idle') {
      void dispatch(fetchSubmitterOptionsThunk());
    }
  }, [dispatch, metadataStatus]);

  const languages = dynamicLanguages;
  const activeLanguage =
    languages.find((l) => l.code === selectedCode) ||
    languages[0] ||
    { code: 'en', label: 'English', flagUrl: '/images/flags/us.svg' };

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Language, ${activeLanguage.label}`}
        onClick={() => {
          if (languages.length > 0) {
            setIsOpen(!isOpen);
          }
        }}
        className={`flex items-center gap-2 text-sm font-bold transition-all duration-300 group border rounded-full px-3.5 py-1.5 hover:shadow-sm cursor-pointer ${isOpen ? 'border-[#16A34A] bg-[#16A34A]/5 text-[#16A34A] shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:border-[#16A34A] hover:bg-gray-50'}`}
      >
        <span className="flex items-center justify-center w-4 h-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeLanguage.flagUrl} alt="" width={20} height={20} className="w-full h-full rounded-sm object-cover" />
        </span>
        <span>{activeLanguage.label}</span>
      </button>
      {isOpen && languages.length > 0 && (
        <div role="menu" aria-label="Language" className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
          {languages.map((lang) => (
            <button
              type="button"
              key={lang.code}
              role="menuitemradio"
              aria-checked={activeLanguage.code === lang.code}
              onClick={() => {
                dispatch(setSelectedLanguage(lang.code));
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="flex items-center justify-center w-4 h-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lang.flagUrl} alt="" width={20} height={20} className="w-full h-full rounded-sm object-cover" />
                </span>
                <span className={activeLanguage.code === lang.code ? 'font-bold' : ''}>{lang.label}</span>
              </span>
              {activeLanguage.code === lang.code && <Check className="w-4 h-4 text-[#16A34A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
