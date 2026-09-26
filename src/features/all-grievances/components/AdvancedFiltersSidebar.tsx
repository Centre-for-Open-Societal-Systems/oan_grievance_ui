import React, { useState, useRef, useEffect } from 'react';
import { X, SlidersHorizontal, ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchGrievanceOptionsThunk,
  fetchRegionsThunk,
  fetchChildAreasThunk,
  findWoredaNode,
  selectCategoryFilterOptions,
  selectRegionFilterOptions,
  selectStatusFilterOptions,
  selectWoredaFilterOptions,
  selectKebeleFilterOptions,
} from '@/features/metadata';
import { EMPTY_GRIEVANCE_FILTERS, type GrievanceFilters } from '../types';

export type { GrievanceFilters };

/** A selectable filter value: `value` goes to the API, `label` is shown to the user. */
export interface FilterOption {
  value: string;
  label: string;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  isLoading = false,
  disabled = false,
  disabledMessage,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (val: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Deduplicate options by value
  const uniqueOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const result: FilterOption[] = [];
    for (const opt of options) {
      if (opt.value && !seen.has(opt.value)) {
        seen.add(opt.value);
        result.push(opt);
      }
    }
    return result;
  }, [options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtering happens server-side, where "no values" means "no constraint" — so an
  // empty selection is exactly what "All" means, and ticking All just clears it.
  const isAllSelected = selected.length === 0;

  const handleToggleAll = () => {
    onChange([]);
  };

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => v !== value));
    }
  };

  const selectedLabels = selected
    .map(val => uniqueOptions.find(opt => opt.value === val)?.label || val)
    .join(', ');

  const summary = isLoading
    ? 'Loading…'
    : disabled && disabledMessage
      ? disabledMessage
      : selected.length > 0
        ? selectedLabels
        : `Select ${label}`;

  return (
    <div className="flex flex-col gap-1.5 mb-4 relative" ref={dropdownRef}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div
        className={`flex items-center justify-between px-3 py-2.5 border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-70'
            : 'border-gray-200 cursor-pointer bg-white hover:bg-gray-50'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="text-sm text-gray-500 line-clamp-1">{summary}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-gray-100 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white overflow-hidden max-h-60 overflow-y-auto transform origin-top transition-all duration-200 opacity-100 scale-100 flex flex-col">
          <div className="overflow-y-auto max-h-48">
            {uniqueOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">
                {isLoading ? 'Loading options…' : 'No options available'}
              </div>
            ) : (
              [
                { value: '__all__', label: 'All' },
                ...uniqueOptions,
              ].map((option, idx) => {
                const isAllRow = option.value === '__all__';
                const isChecked = isAllRow ? isAllSelected : selected.includes(option.value);
                return (
                  <label
                    key={`${option.value}-${idx}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="peer appearance-none w-[18px] h-[18px] border border-gray-300 rounded-[3px] bg-white checked:bg-[#1E8E3E] checked:border-[#1E8E3E] transition-all duration-200 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) =>
                          isAllRow ? handleToggleAll() : handleToggle(option.value, e.target.checked)
                        }
                      />
                      <svg
                        className={`absolute w-3 h-3 text-white pointer-events-none transition-transform duration-300 ${isChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600 truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** `YYYY-MM-DD` in local time — the format the list API's date filters expect. */
function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatIsoForDisplay(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ModernCalendar({
  onSelect,
  selectedDate,
  onClose,
  align = 'left',
}: {
  /** Receives a `YYYY-MM-DD` date. */
  onSelect: (date: string) => void;
  /** `YYYY-MM-DD`, or empty. */
  selectedDate: string;
  onClose: () => void;
  align?: 'left' | 'right';
}) {
  const calRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    return year && month ? new Date(year, month - 1, 1) : new Date();
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calRef.current && !calRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString('en-US', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  const shiftMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  return (
    <div ref={calRef} className={`absolute bottom-[calc(100%+8px)] ${align === 'right' ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'} p-4 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[60] w-[260px] transform transition-all duration-200 scale-100 opacity-100`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-bold text-gray-800">{monthLabel} {year}</span>
        <button onClick={() => shiftMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const iso = toIsoDate(new Date(year, month, i + 1));
          const isSelected = selectedDate === iso;
          return (
            <button
              key={iso}
              onClick={() => { onSelect(iso); onClose(); }}
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
  filters: GrievanceFilters;
  setFilters: React.Dispatch<React.SetStateAction<GrievanceFilters>>;
}) {
  const dispatch = useAppDispatch();
  const statusOptions = useAppSelector(selectStatusFilterOptions);
  const categoryOptions = useAppSelector(selectCategoryFilterOptions);
  const rawRegions = useAppSelector((state) => state.metadata.regions);
  const metadata = useAppSelector((state) => state.metadata);
  const regionOptions = useAppSelector(selectRegionFilterOptions);
  const woredaOptions = useAppSelector((state) =>
    selectWoredaFilterOptions(state, filters.regions.length > 0 ? filters.regions : undefined)
  );
  const kebeleOptions = useAppSelector((state) =>
    selectKebeleFilterOptions(state, filters.woredas.length > 0 ? filters.woredas : undefined)
  );
  const grievanceStatus = useAppSelector((state) => state.metadata.grievanceOptionsStatus);
  const regionsStatus = useAppSelector((state) => state.metadata.regionsStatus);

  const isWoredasLoading = useAppSelector((state) => {
    if (filters.regions.length === 0) return false;
    return filters.regions.some((regionName) => {
      const regNode = rawRegions.find(
        (r) =>
          r.area_name.toLowerCase() === regionName.toLowerCase() ||
          r.area_id.toLowerCase() === regionName.toLowerCase() ||
          (r.code && r.code.toLowerCase() === regionName.toLowerCase()) ||
          (r.path_code && r.path_code.toLowerCase() === regionName.toLowerCase())
      );
      const parentKey = regNode?.area_id || regionName;
      return (
        state.metadata.childAreasStatus[`${parentKey}_Woreda`] === 'loading' ||
        state.metadata.childAreasStatus[parentKey] === 'loading' ||
        state.metadata.childAreasStatus[`${regionName}_Woreda`] === 'loading' ||
        state.metadata.childAreasStatus[regionName] === 'loading'
      );
    });
  });

  const isKebelesLoading = useAppSelector((state) => {
    if (filters.woredas.length === 0) return false;
    return filters.woredas.some((woredaName) => {
      const woredaNode = findWoredaNode({ metadata: state.metadata }, woredaName);
      const parentKey = woredaNode?.area_id || woredaName;
      return (
        state.metadata.childAreasStatus[`${parentKey}_Kebele`] === 'loading' ||
        state.metadata.childAreasStatus[parentKey] === 'loading' ||
        state.metadata.childAreasStatus[`${woredaName}_Kebele`] === 'loading' ||
        state.metadata.childAreasStatus[woredaName] === 'loading'
      );
    });
  });

  useEffect(() => {
    if (grievanceStatus === "idle") {
      void dispatch(fetchGrievanceOptionsThunk());
    }
    if (regionsStatus === "idle") {
      void dispatch(fetchRegionsThunk());
    }
  }, [dispatch, grievanceStatus, regionsStatus]);

  useEffect(() => {
    if (filters.regions.length > 0) {
      const parentIds: string[] = [];
      filters.regions.forEach((regionName) => {
        const regNode = rawRegions.find(
          (r) =>
            r.area_name.toLowerCase() === regionName.toLowerCase() ||
            r.area_id.toLowerCase() === regionName.toLowerCase() ||
            (r.code && r.code.toLowerCase() === regionName.toLowerCase()) ||
            (r.path_code && r.path_code.toLowerCase() === regionName.toLowerCase())
        );
        const id = regNode?.area_id || regNode?.path_code || regionName;
        if (id && !parentIds.includes(id)) {
          parentIds.push(id);
        }
      });
      if (parentIds.length > 0) {
        void dispatch(fetchChildAreasThunk({ parent: parentIds, level_name: 'Woreda' }));
      }
    }
  }, [dispatch, filters.regions, rawRegions]);

  useEffect(() => {
    if (filters.woredas.length > 0) {
      const parentIds: string[] = [];
      filters.woredas.forEach((woredaName) => {
        const woredaNode = findWoredaNode({ metadata }, woredaName);
        const id = woredaNode?.area_id || woredaNode?.path_code || woredaName;
        if (id && !parentIds.includes(id)) {
          parentIds.push(id);
        }
      });
      if (parentIds.length > 0) {
        void dispatch(fetchChildAreasThunk({ parent: parentIds, level_name: 'Kebele' }));
      }
    }
  }, [dispatch, filters.woredas, metadata]);

  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);

  const totalFilters =
    filters.status.length +
    filters.category.length +
    filters.regions.length +
    filters.woredas.length +
    filters.kebeles.length +
    (filters.fromDate || filters.toDate || filters.dateRange ? 1 : 0);

  const handleReset = () => {
    setFilters({ ...EMPTY_GRIEVANCE_FILTERS });
  };

  const setDateRangePreset = (range: string) => {
    const today = new Date();
    const from = new Date();
    const to = new Date();

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

    setFilters((f) => ({
      ...f,
      dateRange: range,
      fromDate: toIsoDate(from),
      toDate: toIsoDate(to)
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
          <FilterDropdown
            label="Status"
            options={statusOptions}
            selected={filters.status}
            onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
            isLoading={grievanceStatus === 'loading'}
          />
          <FilterDropdown
            label="Category"
            options={categoryOptions}
            selected={filters.category}
            onChange={(val) => setFilters((f) => ({ ...f, category: val }))}
            isLoading={grievanceStatus === 'loading'}
          />
          <FilterDropdown
            label="Regions"
            options={regionOptions}
            selected={filters.regions}
            onChange={(val) => setFilters((f) => {
              const next = { ...f, regions: val };
              if (val.length === 0) {
                next.woredas = [];
                next.kebeles = [];
              }
              return next;
            })}
            isLoading={regionsStatus === 'loading'}
          />
          <FilterDropdown
            label="Woredas"
            options={woredaOptions}
            selected={filters.woredas}
            onChange={(val) => setFilters((f) => {
              const next = { ...f, woredas: val };
              if (val.length === 0) {
                next.kebeles = [];
              }
              return next;
            })}
            isLoading={isWoredasLoading}
            disabled={filters.regions.length === 0}
            disabledMessage="Select region first"
          />
          <FilterDropdown
            label="Kebeles"
            options={kebeleOptions}
            selected={filters.kebeles}
            onChange={(val) => setFilters((f) => ({ ...f, kebeles: val }))}
            isLoading={isKebelesLoading}
            disabled={filters.woredas.length === 0}
            disabledMessage="Select woreda first"
          />

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
                  <input type="text" readOnly value={formatIsoForDisplay(filters.fromDate)} placeholder="Oct 1, 2026" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-emerald-500 transition-colors hover:border-emerald-300" />
                </div>
                {isFromCalendarOpen && (
                  <ModernCalendar onSelect={(date) => setFilters((f) => ({ ...f, fromDate: date, dateRange: null }))} selectedDate={filters.fromDate} onClose={() => setIsFromCalendarOpen(false)} />
                )}
              </div>
              <div className="flex-1 relative">
                <span className="text-sm text-gray-400 mb-1 block">To</span>
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setIsToCalendarOpen(!isToCalendarOpen); setIsFromCalendarOpen(false); }}
                >
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" readOnly value={formatIsoForDisplay(filters.toDate)} placeholder="Oct 31, 2026" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer focus:outline-none focus:border-emerald-500 transition-colors hover:border-emerald-300" />
                </div>
                {isToCalendarOpen && (
                  <ModernCalendar align="right" onSelect={(date) => setFilters((f) => ({ ...f, toDate: date, dateRange: null }))} selectedDate={filters.toDate} onClose={() => setIsToCalendarOpen(false)} />
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
