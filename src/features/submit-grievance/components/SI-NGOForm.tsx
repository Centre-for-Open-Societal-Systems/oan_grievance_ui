"use client";

import { SIPhoneField } from "./SI-PhoneField";
import type { SIFormProps } from "./SI-types";

export const FIELDS = [
  { key: "orgName", label: "Organisation Name", required: true },
  { key: "registrationNumber", label: "Registration Number", required: true },
  { key: "representativeName", label: "Authorised Representative", required: true },
  { key: "representativeFaydaId", label: "Representative Fayda ID", required: true },
  { key: "phoneNumber", label: "Contact Mobile", required: true },
  { key: "email", label: "Contact Email ID", required: false },
];

export function NGOForm({ values, setValue }: SIFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Organisation Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Organisation Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.orgName || ""}
          onChange={(e) => setValue("orgName", e.target.value)}
          placeholder="Enter Full registered organisation name"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Registration Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Registration Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.registrationNumber || ""}
          onChange={(e) => setValue("registrationNumber", e.target.value)}
          placeholder="Enter COOP-XX-2024-XXXX"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Authorised Representative */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Authorised Representative <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.representativeName || ""}
          onChange={(e) => setValue("representativeName", e.target.value)}
          placeholder="Enter Rep's full name"
          className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b8535]/20 focus:border-[#0b8535] text-sm transition-colors shadow-sm"
        />
      </div>

      {/* Representative Fayda ID */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Representative Fayda ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={values.representativeFaydaId || ""}
          onChange={(e) => setValue("representativeFaydaId", e.target.value)}
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
