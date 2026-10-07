'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface AnimatedSelectProps {
  /** A plain string is shorthand for `{ value: s, label: s }`. */
  options: Array<string | SelectOption>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function normalize(option: string | SelectOption): SelectOption {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

export function AnimatedSelect({ options, value, onChange, placeholder }: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalized = options.map(normalize);
  const selectedLabel = normalized.find((opt) => opt.value === value)?.label;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`border rounded-lg px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer flex justify-between items-center ${isOpen ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200 hover:border-gray-300'
          }`}
      >
        <span className={selectedLabel ? 'text-gray-700' : 'text-gray-400'}>{selectedLabel || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full top-full mt-2 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-auto py-1">
            {normalized.map((opt) => (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === opt.value
                  ? 'bg-[#16A34A]/10 text-[#16A34A] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
