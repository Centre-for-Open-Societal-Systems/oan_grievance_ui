'use client';

import { useEffect, useRef, useState } from 'react';

export interface CountryCodeOption {
  code: string;
  country: string;
  flagUrl?: string;
}

interface CountryCodeSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CountryCodeOption[];
  triggerClassName: string;
}

/** Dialling-code picker for phone fields — a hand-rolled dropdown standing in for a native <select>. */
export function CountryCodeSelect({ value, onChange, options, triggerClassName }: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = options.find((c) => c.code === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!active) return null;

  return (
    <div className="relative flex shrink-0" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Country code, ${active.country} ${active.code}`}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        {active.flagUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.flagUrl} alt="" width={20} height={16} className="w-5 h-4 rounded-sm object-cover" />
        )}
        <span>{active.code}</span>
      </button>
      {isOpen && (
        <div role="menu" aria-label="Country code" className="absolute top-full left-0 mt-1 w-full min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {options.map((c) => (
            <button
              key={c.code}
              type="button"
              role="menuitemradio"
              aria-checked={value === c.code}
              onClick={() => {
                onChange(c.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[14px] hover:bg-gray-50 ${value === c.code ? 'bg-gray-50 font-bold' : 'font-medium text-gray-700'}`}
            >
              {c.flagUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.flagUrl} alt="" width={20} height={16} className="w-5 h-4 rounded-sm object-cover shrink-0" />
              )}
              <span>{c.country} {c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
