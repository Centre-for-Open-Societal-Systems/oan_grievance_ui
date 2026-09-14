import React, { useState } from 'react';
import { User, ChevronDown, Save } from 'lucide-react';

const AnimatedDropdown = ({ label, options, placeholder }: { label: string, options: string[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('');

  return (
    <div className="relative flex flex-col gap-2">
      <label className="text-[14px] font-semibold text-[#1B362D]">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[16px] text-gray-500 flex justify-between items-center hover:border-gray-300 focus:outline-none focus:border-[#1d9645] focus:ring-1 focus:ring-[#1d9645] bg-white transition-all duration-200 shadow-sm"
      >
        <span className={selected ? 'text-gray-900' : 'text-[#8C9AA1]'}>{selected || placeholder}</span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute top-[84px] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden transition-all duration-300 origin-top transform ${isOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}
      >
        <div className="max-h-48 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelected(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-[16px] hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selected === opt ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export function CaseManagement() {
  const [escalated, setEscalated] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      {/* Header spanning full width */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <User className="h-6 w-6 text-blue-700 fill-blue-700" />
        <h3 className="text-md font-bold text-[#141F2B]">Case Management</h3>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col gap-5">
        <AnimatedDropdown
          label="Status"
          placeholder="Select Status"
          options={['In Progress', 'Resolved', 'Pending', 'Closed']}
        />

        <AnimatedDropdown
          label="Assigned Officer"
          placeholder="Select Status"
          options={['Tigist Alemu', 'Abebe Bekele', 'Yonas Mekonnen']}
        />

        <AnimatedDropdown
          label="Department"
          placeholder="Select Status"
          options={['Inputs', 'Market Governance', 'Credit Policy', 'General']}
        />

        <label className="flex items-center gap-3 cursor-pointer group mt-1">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={escalated}
              onChange={() => setEscalated(!escalated)}
              className="peer appearance-none w-5 h-5 border border-gray-400 rounded focus:ring-[#1f9e49] checked:bg-[#1f9e49] checked:border-[#1f9e49] transition-all duration-300 cursor-pointer"
            />
            <svg
              className={`absolute w-4 h-4 text-white pointer-events-none transition-transform duration-300 transform ${escalated ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-[#475467] group-hover:text-gray-900 transition-colors">Escalated</span>
        </label>

        <button className="w-full py-3 bg-[#1E9E49] hover:bg-[#18803B] text-white font-bold text-[17px] rounded-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm mt-1">
          <Save className="h-5 w-5" /> Save Assignment
        </button>
      </div>
    </div>
  );
}
