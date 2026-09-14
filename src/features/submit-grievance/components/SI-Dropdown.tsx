"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface AnimatedSelectProps {
  options: Option[];
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

export function AnimatedSelect({ options, placeholder, value, onChange }: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full text-sm" ref={wrapperRef}>
      {/* Select Box */}
      <div
        className={`w-full bg-white border ${isOpen ? "border-[#0b8535] ring-2 ring-[#0b8535]/20" : "border-gray-300"
          } text-gray-700 py-2.5 px-4 pr-4 rounded-lg cursor-pointer flex justify-between items-center transition-all duration-200 shadow-sm`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-900" : "text-[#6B7280]"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </div>

      {/* Dropdown Options */}
      <div
        className={`absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 overflow-hidden transition-all duration-300 origin-top ${isOpen
          ? "opacity-100 scale-y-100 pointer-events-auto"
          : "opacity-0 scale-y-95 pointer-events-none"
          }`}
      >
        <ul className="max-h-60 overflow-y-auto py-1">
          {/* Placeholder in dropdown */}
          <li
            className={`px-4 py-3 cursor-pointer text-[#4B5563] hover:bg-gray-50 transition-colors border-b border-gray-100 ${!value ? "bg-gray-50 font-medium" : ""
              }`}
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            {placeholder}
          </li>
          {options.map((option, idx) => (
            <li
              key={option.value}
              className={`px-4 py-3 cursor-pointer text-[#4B5563] hover:bg-gray-50 transition-colors ${idx !== options.length - 1 ? "border-b border-gray-100" : ""
                } ${value === option.value ? "bg-[#f4f8f5] text-[#0b8535] font-medium" : ""
                }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
