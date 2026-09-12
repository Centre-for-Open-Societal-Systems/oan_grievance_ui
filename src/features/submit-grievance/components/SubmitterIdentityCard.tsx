"use client";

import React, { useState } from "react";
import { FileEdit, Info, Save, ArrowRight } from "lucide-react";
import { AnimatedSelect } from "./SI-Dropdown";
import { IndividualFarmerForm } from "./SI-IndividualFarmerForm";
import { CooperativeFPOForm } from "./SI-CooperativeFPOForm";
import { NGOForm } from "./SI-NGOForm";
import { WoredaKebeleForm } from "./SI-WoredaKebeleForm";
import { DevelopmentAgentForm } from "./SI-DevelopmentAgentForm";

const submitterTypeOptions = [
  { value: "individual", label: "Individual Farmer" },
  { value: "cooperative", label: "Cooperative / FPO" },
  { value: "ngo", label: "NGO" },
  { value: "woreda_kebele", label: "Woreda/Kebele Body" },
  { value: "development_agent", label: "Development Agent (on behalf)" },
];

const submissionChannelOptions = [
  { value: "web", label: "Web Portal" },
  { value: "mobile", label: "Mobile App" },
  { value: "ivr", label: "IVR / Call Centre" },
  { value: "field_officer", label: "Field Officer Assisted" },
];

interface SubmitterIdentityCardProps {
  onNext?: () => void;
}

export function SubmitterIdentityCard({ onNext }: SubmitterIdentityCardProps) {
  const [submitterType, setSubmitterType] = useState("");
  const [submissionChannel, setSubmissionChannel] = useState("");
  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] rounded-xl shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
      {/* Card Header */}
      <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
            <FileEdit className="w-6 h-6 text-[#0b8535]" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-gray-900">Submitter Identity</h3>
            <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
            Step 1 of 3
          </span>
        </div>
      </div>

      {/* Card Body - Form Fields */}
      <div className="p-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Submitter Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Submitter Type <span className="text-red-500">*</span>
            </label>
            <AnimatedSelect
              options={submitterTypeOptions}
              placeholder="Select Submitter Type"
              value={submitterType}
              onChange={setSubmitterType}
            />
          </div>

          {/* Submission Channel */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Submission Channel <span className="text-red-500">*</span>
            </label>
            <AnimatedSelect
              options={submissionChannelOptions}
              placeholder="Select Submission Channel"
              value={submissionChannel}
              onChange={setSubmissionChannel}
            />
          </div>
        </div>
        {submitterType === "individual" && <IndividualFarmerForm />}
        {submitterType === "cooperative" && <CooperativeFPOForm />}
        {submitterType === "ngo" && <NGOForm />}
        {submitterType === "woreda_kebele" && <WoredaKebeleForm />}
        {submitterType === "development_agent" && <DevelopmentAgentForm />}
      </div>

      {/* Card Footer */}
      <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] flex items-center justify-between rounded-b-xl">
        <div className="flex items-center text-sm text-gray-600">
          <Info className="w-4 h-4 text-blue-600 mr-1.5" />
          <span>All fields marked <span className="text-red-500">*</span> are required</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
            <Save className="w-4 h-4 text-[#0b8535]" />
            Save Draft
          </button>
          <button 
            onClick={onNext}
            className="flex items-center gap-2 px-5 py-3 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#10883c] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b8535]/50"
          >
            Save & Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
