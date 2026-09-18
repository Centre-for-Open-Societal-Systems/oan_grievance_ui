"use client";

import { SIPhoneField } from "./SI-PhoneField";
import { SIMaskedIdField } from "./SIMaskedIdField";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "fullName", label: "Full Name", required: true },
  { key: "faydaId", label: "Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Number", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function IndividualFarmerForm({ values, setValue, hiddenFields = [] }: SIFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Full Name */}
      {!hiddenFields.includes("fullName") && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={values.fullName || ""}
            onChange={(e) => setValue("fullName", e.target.value)}
            placeholder="Enter Full Name"
            className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
          />
        </div>
      )}

      {/* Fayda ID */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Fayda ID <span className="text-red-500">*</span>
        </label>
        <SIMaskedIdField
          value={values.faydaId || ""}
          onChange={(value) => setValue("faydaId", value)}
          placeholder="Enter Fayda ID"
        />
      </div>

      {/* Contact Mobile */}
      {!hiddenFields.includes("phoneNumber") && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <SIPhoneField
            countryCode={values.phoneCode || "+251"}
            setCountryCode={(code) => setValue("phoneCode", code)}
            phoneNumber={values.phoneNumber || ""}
            setPhoneNumber={(value) => setValue("phoneNumber", value)}
            placeholder="Enter Contact Number"
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
