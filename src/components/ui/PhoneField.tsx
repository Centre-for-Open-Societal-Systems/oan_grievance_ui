'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CountryCodeOption {
  code: string;
  country: string;
  flagUrl?: string;
}

export const DEFAULT_COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+251', country: 'Ethiopia', flagUrl: '/images/flags/et.svg' },
  { code: '+254', country: 'Kenya' },
  { code: '+255', country: 'Tanzania' },
  { code: '+256', country: 'Uganda' },
  { code: '+250', country: 'Rwanda' },
  { code: '+252', country: 'Somalia' },
  { code: '+253', country: 'Djibouti' },
  { code: '+258', country: 'Mozambique' },
  { code: '+1', country: 'United States', flagUrl: '/images/flags/us.svg' },
];

function toDigitsOnly(val: string): string {
  return val.replace(/\D/g, '');
}

export interface PhoneFieldProps {
  countryCode: string;
  setCountryCode: (code: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  maxLength?: number;
  className?: string;
}

/**
 * Shared PhoneField component providing a country-code dialling dropdown (+251 default)
 * and an integrated digit-validated phone number input.
 */
export function PhoneField({
  countryCode,
  setCountryCode,
  phoneNumber,
  setPhoneNumber,
  placeholder = 'Enter phone number',
  required = false,
  disabled = false,
  id,
  name,
  maxLength = 10,
  className = '',
}: PhoneFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active =
    DEFAULT_COUNTRY_CODES.find((c) => c.code === countryCode) || {
      code: countryCode || '+251',
      country: 'Ethiopia',
      flagUrl: '/images/flags/et.svg',
    };

  return (
    <div
      className={`flex shadow-xs rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[#16A34A]/20 focus-within:border-[#16A34A] transition-colors relative bg-white ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      } ${className}`}
    >
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Country code, ${active.country} ${active.code}`}
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gray-50 rounded-l-lg px-3 py-2.5 border-r border-gray-300 flex items-center gap-1.5 cursor-pointer h-full hover:bg-gray-100 transition-colors focus:outline-none"
        >
          {active.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.flagUrl} alt="" width={18} height={13} className="w-4 h-3 rounded-xs object-cover" />
          )}
          <span className="text-gray-700 text-sm font-medium">{active.code}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Country code"
            className="absolute top-full left-0 mt-1 min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden"
          >
            <ul className="max-h-48 overflow-y-auto py-1">
              {DEFAULT_COUNTRY_CODES.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={countryCode === c.code}
                    onClick={() => {
                      setCountryCode(c.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                      countryCode === c.code ? 'bg-gray-50 text-[#16A34A] font-bold' : 'text-gray-700 font-medium'
                    }`}
                  >
                    {c.flagUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.flagUrl} alt="" width={18} height={13} className="w-4 h-3 rounded-xs object-cover shrink-0" />
                    )}
                    <span>{c.country} ({c.code})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <input
        type="tel"
        inputMode="numeric"
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(toDigitsOnly(e.target.value))}
        placeholder={placeholder}
        className="flex-1 bg-white text-gray-800 py-2.5 px-3.5 rounded-r-lg focus:outline-none text-sm placeholder:text-gray-400 font-medium"
      />
    </div>
  );
}
