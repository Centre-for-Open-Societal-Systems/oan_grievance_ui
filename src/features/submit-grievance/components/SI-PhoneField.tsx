"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRY_CODES = ["+251", "+254", "+255", "+256", "+250", "+252", "+253", "+258"];

interface SIPhoneFieldProps {
  countryCode: string;
  setCountryCode: (code: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  placeholder?: string;
}

/** The Contact Mobile field shared by every submitter-identity sub-form. */
export function SIPhoneField({ countryCode, setCountryCode, phoneNumber, setPhoneNumber, placeholder }: SIPhoneFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex shadow-sm rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[#0b8535]/20 focus-within:border-[#0b8535] transition-colors relative">
      <div className="relative" ref={dropdownRef}>
        <div
          className="bg-gray-50/50 rounded-l-lg px-3 py-2.5 border-r border-gray-300 flex items-center gap-1.5 cursor-pointer h-full"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-gray-500 text-sm font-medium">{countryCode}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>

        <div
          className={`absolute top-full left-0 w-24 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 overflow-hidden transition-all duration-300 origin-top ${
            isOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"
          }`}
        >
          <ul className="max-h-32 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {COUNTRY_CODES.map((code) => (
              <li
                key={code}
                className={`px-4 py-2 cursor-pointer text-sm text-[#4B5563] hover:bg-gray-50 transition-colors ${
                  countryCode === code ? "bg-[#f4f8f5] text-[#0b8535] font-medium" : ""
                }`}
                onClick={() => {
                  setCountryCode(code);
                  setIsOpen(false);
                }}
              >
                {code}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder={placeholder || "Enter Contact Mobile"}
        className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-r-lg focus:outline-none text-sm"
      />
    </div>
  );
}
