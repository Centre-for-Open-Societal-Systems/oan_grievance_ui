"use client";

import { SIPhoneField } from "./SI-PhoneField";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "officeName", label: "Woreda / Kebele Office Name", required: true },
  { key: "adminZone", label: "Administrative Zone", required: true },
  { key: "responsibleOfficial", label: "Responsible Official", required: true },
  { key: "officialFaydaId", label: "Official's Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Mobile", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function WoredaKebeleForm({ values, setValue }: SIFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Office Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Woreda / Kebele Office Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.officeName || ""}
          onChange={(e) => setValue("officeName", e.target.value)}
          placeholder="Enter Woreda or Kebele office name"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Administrative Zone */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Administrative Zone <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.adminZone || ""}
          onChange={(e) => setValue("adminZone", e.target.value)}
          placeholder="Enter the zone this office administers"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Responsible Official */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Responsible Official <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.responsibleOfficial || ""}
          onChange={(e) => setValue("responsibleOfficial", e.target.value)}
          placeholder="Enter official's full name"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Official's Fayda ID */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Official&apos;s Fayda ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.officialFaydaId || ""}
          onChange={(e) => setValue("officialFaydaId", e.target.value)}
          placeholder="Enter Fayda ID"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Contact Mobile */}
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

      {/* Contact Email ID */}
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
    </div>
  );
}
