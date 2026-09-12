"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Info } from "lucide-react";

export function DevelopmentAgentForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("+255");
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Farmer Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Farmer Name (on behalf of) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter Full name"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Fayda ID */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Fayda ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter Fayda ID"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Info Message Box */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex items-start gap-2.5 shadow-sm">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[13px] text-blue-600 leading-snug">
          You are submitting on behalf of a farmer. Your Officer ID will be recorded for audit purposes. The farmer remains the primary grievance owner.
        </p>
      </div>

      {/* Empty div for right column to keep layout structure */}
      <div className="hidden md:block"></div>

      {/* Contact Mobile */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Contact Mobile <span className="text-red-500">*</span>
        </label>
        <div className="flex shadow-sm rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[#0b8535]/20 focus-within:border-[#0b8535] transition-colors relative">
          <div className="relative" ref={dropdownRef}>
            <div 
              className="bg-gray-50/50 rounded-l-lg px-3 py-2.5 border-r border-gray-300 flex items-center gap-1.5 cursor-pointer h-full"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="text-gray-500 text-sm font-medium">{selectedCode}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </div>

            {/* Dropdown Menu */}
            <div
              className={`absolute top-full left-0 w-24 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 overflow-hidden transition-all duration-300 origin-top ${
                isOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"
              }`}
            >
              <ul className="max-h-32 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {["+255", "+254", "+256", "+250", "+251", "+252", "+253", "+258"].map((code) => (
                  <li
                    key={code}
                    className={`px-4 py-2 cursor-pointer text-sm text-[#4B5563] hover:bg-gray-50 transition-colors ${
                      selectedCode === code ? "bg-[#f4f8f5] text-[#0b8535] font-medium" : ""
                    }`}
                    onClick={() => {
                      setSelectedCode(code);
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
            placeholder="Enter Contact Mobile"
            className="flex-1 bg-white text-gray-700 py-2.5 px-4 rounded-r-lg focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Contact Email ID */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Contact Email ID
        </label>
        <input
          type="email"
          placeholder="Enter Contact Email ID"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>
    </div>
  );
}
