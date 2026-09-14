import React, { useState, useRef, useEffect } from 'react';
import { FileText, AlertCircle, ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, EyeOff, Send } from 'lucide-react';

const AnimatedDropdown = ({ label, options, placeholder, required, value, onChange }: { label: string, options: string[], placeholder: string, required?: boolean, value: string, onChange: (val: string) => void }) => {
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

  return (
    <div className="relative flex flex-col flex-1" ref={dropdownRef}>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm flex justify-between items-center transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 ${value ? 'border-gray-300' : 'border-gray-300'} bg-white`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute top-[72px] left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden transition-all duration-300 origin-top transform ${isOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}
      >
        <div className="max-h-48 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0 ${value === opt ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const AnimatedDatePicker = ({ label, required, value, onChange, placeholder = 'dd/mm/yyyy' }: { label: string, required?: boolean, value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calRef.current && !calRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const currentMonthShort = today.toLocaleString('default', { month: 'short' });
  const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();

  return (
    <div className="relative flex flex-col flex-1" ref={calRef}>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-500 flex justify-between items-center hover:border-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        <CalendarIcon className="h-4 w-4 text-gray-700" />
      </button>

      <div
        className={`absolute top-[72px] right-0 p-4 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[60] w-[260px] transform transition-all duration-300 origin-top-right ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between mb-4">
          <button type="button" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-bold text-gray-800">{currentMonth} {currentYear}</span>
          <button type="button" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayDate = `${currentMonthShort} ${i + 1}, ${currentYear}`;
            const isSelected = value === dayDate;
            return (
              <button
                type="button"
                key={i}
                onClick={() => { onChange(dayDate); setIsOpen(false); }}
                className={`w-7 h-7 mx-auto text-xs font-medium flex items-center justify-center rounded-full transition-all ${isSelected
                  ? 'bg-[#1E8E3E] text-white shadow-md transform scale-110'
                  : 'text-gray-700 hover:bg-emerald-50 hover:text-[#1E8E3E]'
                  }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function ResponseForm() {
  const [activeTab, setActiveTab] = useState<'response' | 'internal'>('response');

  const [responseType, setResponseType] = useState('');
  const [closureDate, setClosureDate] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [internalNotesResponse, setInternalNotesResponse] = useState('');

  const [internalNoteTab, setInternalNoteTab] = useState('');

  const isResponseValid = responseType !== '' && closureDate !== '' && actionTaken.trim() !== '' && resolutionSummary.trim() !== '';
  const isInternalValid = internalNoteTab.trim() !== '';

  const isValid = activeTab === 'response' ? isResponseValid : isInternalValid;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('response')}
          className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'response' ? 'text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FileText className="h-4 w-4" /> Dept Response (Appendix D)
        </button>
        <button
          onClick={() => setActiveTab('internal')}
          className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'internal' ? 'text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <AlertCircle className="h-4 w-4" /> Internal Note
        </button>
      </div>
      <div className="p-6 flex flex-col gap-5 flex-1">
        {activeTab === 'response' ? (
          <>
            <div className="flex gap-4 z-50">
              <AnimatedDropdown
                label="Response Type"
                placeholder="Select Response Type"
                options={['Initial Acknowledgment', 'Investigation Update', 'Final Resolution']}
                required
                value={responseType}
                onChange={setResponseType}
              />
              <AnimatedDatePicker
                label="Proposed Closure Date"
                placeholder="Select Proposed Closure Date"
                required
                value={closureDate}
                onChange={setClosureDate}
              />
            </div>
            <div className="z-10 relative">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Action Taken <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">({actionTaken.length}/500)</span></label>
              <textarea
                rows={3}
                maxLength={500}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Describe the specific action taken by the department..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white resize-none"
              ></textarea>
            </div>
            <div className="z-10 relative">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Resolution Summary <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Summaries the outcome for the submitter..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white resize-none"
              ></textarea>
            </div>
            <div className="z-10 relative">
              <label className="block text-sm font-bold text-[#203628] mb-1.5 flex items-center gap-1.5"><EyeOff className="h-4 w-4 text-gray-500" /> Internal Notes <span className="text-gray-400 font-normal">(not visible to submitter)</span></label>
              <textarea
                rows={3}
                value={internalNotesResponse}
                onChange={(e) => setInternalNotesResponse(e.target.value)}
                placeholder="Process gaps, follow-up actions, escalation reasons..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-[#fff] resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={!isResponseValid}
                className={`flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-lg transition-all shadow-sm text-sm ${isResponseValid ? 'bg-[#1ca848] hover:bg-[#1a9c42] cursor-pointer transform hover:scale-[1.02]' : 'bg-[#66C38A] opacity-60 cursor-not-allowed'}`}
              >
                <Send className="h-4 w-4" />
                Submit Response
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1">
            <label className="block text-sm font-bold text-[#203628] mb-1.5 flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-gray-500" />
              <span>Internal Notes</span>
              <span className="text-gray-400 font-normal">(not visible to submitter)</span>
            </label>
            <textarea
              rows={4}
              value={internalNoteTab}
              onChange={(e) => setInternalNoteTab(e.target.value)}
              placeholder="Add an internal case note visible only to officers..."
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#EFA771] focus:ring-1 focus:ring-[#EFA771] bg-[#fff] resize-none"
            ></textarea>

            <div className="flex justify-end pt-4">
              <button
                disabled={!isInternalValid}
                className={`flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-lg transition-all shadow-sm text-sm ${isInternalValid ? 'bg-[#ECA974] hover:bg-[#DE9D68] cursor-pointer transform hover:scale-[1.02]' : 'bg-[#ECA974] opacity-60 cursor-not-allowed'}`}
              >
                <Send className="h-4 w-4" />
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
