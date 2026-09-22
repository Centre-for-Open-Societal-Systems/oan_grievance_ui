"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { INVALID_INPUT_STYLES } from "@/components/ui/FieldError";

interface SIMaskedIdFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Lets a `<label htmlFor>` and the form's focus-first-error step find this input. */
  id?: string;
  invalid?: boolean;
  /** The id of the error message shown for this field, wired up as `aria-describedby`. */
  describedBy?: string;
  onBlur?: () => void;
}

/**
 * A national-ID input (Fayda ID and its per-type variants) — masked by
 * default like a password field, with an explicit reveal toggle. A
 * government ID number is sensitive enough to warrant the same
 * shoulder-surfing/screen-share protection a password gets, not a plain text
 * input that shows it on screen the moment it's typed.
 */
export function SIMaskedIdField({ value, onChange, placeholder, id, invalid, describedBy, onBlur }: SIMaskedIdFieldProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={revealed ? "text" : "password"}
        autoComplete="off"
        inputMode="numeric"
        maxLength={16}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter ID number"}
        className={`w-full bg-white border border-gray-300 text-gray-700 py-2.5 pl-4 pr-11 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm ${INVALID_INPUT_STYLES}`}
      />
      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        aria-label={revealed ? "Hide ID number" : "Show ID number"}
        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
      >
        {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
