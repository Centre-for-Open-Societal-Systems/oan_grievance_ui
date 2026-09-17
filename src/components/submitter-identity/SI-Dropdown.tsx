"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  /** Associates an external `<label htmlFor={id}>` with this control. Falls back to an internally generated id if omitted. */
  id?: string;
  /** Set when an error is showing for this field — points the control at the error's id via aria-describedby. */
  describedBy?: string;
  /** Set when this field has a validation error — surfaces as aria-invalid so assistive tech announces it. */
  invalid?: boolean;
}

/**
 * A custom listbox, not a native `<select>` — built to the WAI-ARIA
 * combobox/listbox pattern (role, aria-expanded/aria-activedescendant,
 * arrow-key + Enter/Escape handling) since a plain div with an onClick is
 * invisible to a screen reader and unusable from a keyboard.
 */
export function AnimatedSelect({ options, placeholder, value, onChange, id, describedBy, invalid }: AnimatedSelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const allOptions = [{ value: "", label: placeholder }, ...options];
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openAt = (index: number) => {
    setIsOpen(true);
    setActiveIndex(index);
  };

  const commit = (index: number) => {
    const option = allOptions[index];
    if (!option) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (!isOpen) {
          const currentIndex = allOptions.findIndex((o) => o.value === value);
          openAt(currentIndex >= 0 ? currentIndex : 0);
        } else {
          commit(activeIndex);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          const currentIndex = allOptions.findIndex((o) => o.value === value);
          openAt(currentIndex >= 0 ? currentIndex : 0);
        } else {
          setActiveIndex((prev) => Math.min(prev + 1, allOptions.length - 1));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isOpen) setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div className="relative w-full text-sm" ref={wrapperRef}>
      {/* Select Box */}
      <div
        ref={triggerRef}
        id={controlId}
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`w-full bg-white border ${isOpen ? "border-[#0b8535] ring-2 ring-[#0b8535]/20" : "border-gray-300"
          } text-gray-700 py-2.5 px-4 pr-4 rounded-lg cursor-pointer flex justify-between items-center transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b8535]/30`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
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
        <ul id={listboxId} role="listbox" aria-label={placeholder} className="max-h-60 overflow-y-auto py-1">
          {allOptions.map((option, idx) => (
            <li
              key={option.value || "__placeholder__"}
              id={`${listboxId}-option-${idx}`}
              role="option"
              aria-selected={value === option.value}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`px-4 py-3 cursor-pointer transition-colors ${idx !== allOptions.length - 1 ? "border-b border-gray-100" : ""
                } ${idx === 0 && !value ? "bg-gray-50 font-medium text-[#4B5563]" : ""
                } ${value === option.value && idx !== 0 ? "bg-[#f4f8f5] text-[#0b8535] font-medium" : "text-[#4B5563]"
                } ${activeIndex === idx ? "bg-gray-100" : "hover:bg-gray-50"}`}
              onClick={() => commit(idx)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
