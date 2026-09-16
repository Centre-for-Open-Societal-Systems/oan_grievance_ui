"use client";

import { Info } from "lucide-react";
import { SIPhoneField } from "./SI-PhoneField";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "farmerName", label: "Farmer Name (on behalf of)", required: true },
  { key: "faydaId", label: "Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Mobile", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function DevelopmentAgentForm({ values, setValue, hiddenFields = [] }: SIFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Farmer Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Farmer Name (on behalf of) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.farmerName || ""}
          onChange={(e) => setValue("farmerName", e.target.value)}
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
          value={values.faydaId || ""}
          onChange={(e) => setValue("faydaId", e.target.value)}
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
      {!hiddenFields.includes("phoneNumber") && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Contact Mobile <span className="text-red-500">*</span>
          </label>
          <SIPhoneField
            countryCode={values.phoneCode || "+251"}
            setCountryCode={(code) => setValue("phoneCode", code)}
            phoneNumber={values.phoneNumber || ""}
            setPhoneNumber={(value) => setValue("phoneNumber", value)}
          />
        </div>
      )}

      {/* Contact Email ID */}
      {!hiddenFields.includes("email") && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Contact Email ID
          </label>
          <input
            type="email"
            value={values.email || ""}
            onChange={(e) => setValue("email", e.target.value)}
            placeholder="Enter Contact Email ID"
            className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
