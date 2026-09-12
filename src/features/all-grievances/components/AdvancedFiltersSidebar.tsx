import React, { useState, useRef, useEffect } from 'react';
import { X, SlidersHorizontal, ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = ['All', 'Submitted', 'Assigned', 'In Progress', 'More Info Needed', 'Pending Submitter', 'Resolved', 'Closed'];
const CATEGORY_OPTIONS = ['All', 'Inputs', 'Schemes', 'Payments', 'Credit', 'Markets'];
const PRIORITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const REGIONS_OPTIONS = ['All', 'Addis Ababa', 'Amhara', 'Oromia', 'Tigray', 'SNNPR', 'Sidama', 'Afar', 'Somali', 'Benishangul-Gumuz', 'Gambela', 'Harari', 'Dire Dawa'];

function FilterDropdown({ label, options, selected, onChange }: { label: string, options: string[], selected: string[], onChange: (val: string[]) => void }) {
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

  const handleToggle = (option: string, checked: boolean) => {
    if (option === 'All') {
      onChange(checked ? [...options.filter(o => o !== 'All')] : []);
      return;
    }

    if (checked) {
      onChange([...selected, option]);
    } else {
      onChange(selected.filter(o => o !== option));
    }
  };

  const isAllSelected = selected.length === options.length - 1;

  return (
    <div className="flex flex-col gap-1.5 mb-4 relative" ref={dropdownRef}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div
        className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm text-gray-500 line-clamp-1">
          {selected.length > 0 ? `${selected.length} selected` : `Select ${label}`}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-100 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white overflow-hidden max-h-60 overflow-y-auto transform origin-top transition-all duration-200 opacity-100 scale-100">
          {options.map(option => {
            const isChecked = option === 'All' ? isAllSelected : selected.includes(option);
            return (
              <label key={option} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-[18px] h-[18px] border border-gray-300 rounded-[3px] bg-white checked:bg-[#1E8E3E] checked:border-[#1E8E3E] transition-all duration-200 cursor-pointer"
                    checked={isChecked}
                    onChange={(e) => handleToggle(option, e.target.checked)}
                  />
                  <svg
                    className={`absolute w-3 h-3 text-white pointer-events-none transition-transform duration-300 ${isChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModernCalendar({ onSelect, selectedDate, onClose, align = 'left' }: { onSelect: (date: string) => void, selectedDate: string, onClose: () => void, align?: 'left' | 'right' }) {
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calRef.current && !calRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const currentMonthShort = today.toLocaleString('default', { month: 'short' });

  // Get number of days in current month
  const daysInMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate();

  return (
    <div ref={calRef} className={`absolute bottom-[calc(100%+8px)] ${align === 'right' ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'} p-4 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[60] w-[260px] transform transition-all duration-200 scale-100 opacity-100`}>
      <div className="flex items-center justify-between mb-4">
        <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-bold text-gray-800">{currentMonth} {currentYear}</span>
        <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayDate = `${currentMonthShort} ${i + 1}, ${currentYear}`;
          const isSelected = selectedDate === dayDate;
          return (
            <button
              key={i}
              onClick={() => { onSelect(dayDate); onClose(); }}
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
  );
}

export function AdvancedFiltersSidebar({
  isOpen,
  onClose,
  filters,
  setFilters
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    status: string[];
    category: string[];
    priority: string[];
    regions: string[];
    dateRange: string | null;
    fromDate: string;
    toDate: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}) {
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);

  const totalFilters = filters.status.length + filters.category.length + filters.priority.length + filters.regions.length + (filters.fromDate || filters.toDate || filters.dateRange ? 1 : 0);

  const handleReset = () => {
    setFilters({
      status: [],
      category: [],
      priority: [],
      regions: [],
      dateRange: null,
      fromDate: '',
      toDate: ''
    });
  };

  const setDateRangePreset = (range: string) => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    if (range === 'Today') {
      // from and to are both today
    } else if (range === 'Yesterday') {
      from.setDate(today.getDate() - 1);
      to.setDate(today.getDate() - 1);
    } else if (range === 'Last 7 Days') {
      from.setDate(today.getDate() - 7);
    } else if (range === 'Last 30 Days') {
      from.setDate(today.getDate() - 30);
    }

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    setFilters((f: any) => ({
      ...f,
      dateRange: range,
      fromDate: formatDate(from),
      toDate: formatDate(to)
    }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-800">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-base">Advanced Filters</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full relative">
          <FilterDropdown label="Status" options={STATUS_OPTIONS} selected={filters.status} onChange={(val) => setFilters((f: any) => ({ ...f, status: val }))} />
          <FilterDropdown label="Category" options={CATEGORY_OPTIONS} selected={filters.category} onChange={(val) => setFilters((f: any) => ({ ...f, category: val }))} />
          <FilterDropdown label="Priority" options={PRIORITY_OPTIONS} selected={filters.priority} onChange={(val) => setFilters((f: any) => ({ ...f, priority: val }))} />
          <FilterDropdown label="Regions" options={REGIONS_OPTIONS} selected={filters.regions} onChange={(val) => setFilters((f: any) => ({ ...f, regions: val }))} />

          <div className="mt-2 mb-6 relative">
            <label className="text-sm font-semibold text-gray-700 block mb-3">Date Range</label>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <span className="text-sm text-gray-400 mb-1 block">From</span>
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setIsFromCalendarOpen(!isFromCalendarOpen); setIsToCalendarOpen(false); }}
                >
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" readOnly value={filters.fromDate} placeholder="Oct 1, 2026" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-emerald-500 transition-colors hover:border-emerald-300" />
                </div>
                {isFromCalendarOpen && (
                  <ModernCalendar onSelect={(date) => setFilters((f: any) => ({ ...f, fromDate: date, dateRange: null }))} selectedDate={filters.fromDate} onClose={() => setIsFromCalendarOpen(false)} />
                )}
              </div>
              <div className="flex-1 relative">
                <span className="text-sm text-gray-400 mb-1 block">To</span>
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setIsToCalendarOpen(!isToCalendarOpen); setIsFromCalendarOpen(false); }}
                >
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" readOnly value={filters.toDate} placeholder="Oct 31, 2026" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-emerald-500 transition-colors hover:border-emerald-300" />
                </div>
                {isToCalendarOpen && (
                  <ModernCalendar align="right" onSelect={(date) => setFilters((f: any) => ({ ...f, toDate: date, dateRange: null }))} selectedDate={filters.toDate} onClose={() => setIsToCalendarOpen(false)} />
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRangePreset(range)}
                  className={`px-3 py-1.5 rounded-lg text-[14px] font-semibold border transition-all duration-200 ${filters.dateRange === range
                    ? 'border-[#14B8A6] text-[#1E6865] bg-[#EDFAF2] shadow-sm transform scale-[1.02]'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-4 bg-white border border-gray-200 rounded-lg text-md font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-4 bg-[#1E8E3E] text-white rounded-lg text-md font-bold hover:bg-[#177233] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            Apply Filters {totalFilters > 0 && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{totalFilters}</span>}
          </button>
        </div>
      </div>
    </>
  );
}
