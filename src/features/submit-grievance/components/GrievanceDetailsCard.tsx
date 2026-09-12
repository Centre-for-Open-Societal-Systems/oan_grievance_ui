"use client";

import React, { useState, useRef } from "react";
import { FileText, Info, Save, ArrowRight, ArrowLeft, Folder, IdCard, Eye, Trash2, X } from "lucide-react";
import { AnimatedSelect } from "./SI-Dropdown";

const serviceCategoryOptions = [
  { value: "inputs", label: "Inputs" },
  { value: "schemes", label: "Schemes" },
  { value: "payments", label: "Payments" },
  { value: "credit", label: "Credit" },
  { value: "markets", label: "Markets" },
];

const grievanceTypeOptions = [
  { value: "denied", label: "Market access denied" },
  { value: "manipulation", label: "Market price manipulation" },
  { value: "default", label: "Cooperative buyer default" },
  { value: "dispute", label: "Weighing / measurement dispute" },
  { value: "failure", label: "Market infrastructure failure" },
  { value: "delay", label: "Export permit / certification delay" },
];

const regionOptions = [
  { value: "addis", label: "Addis Ababa" },
  { value: "amhara", label: "Amhara" },
  { value: "oromia", label: "Oromia" },
  { value: "tigray", label: "Tigray" },
  { value: "snnpr", label: "SNNPR" },
  { value: "sidama", label: "Sidama" },
  { value: "afar", label: "Afar" },
  { value: "somali", label: "Somali" },
  { value: "benishangul", label: "Benishangul-Gumuz" },
  { value: "gambela", label: "Gambela" },
  { value: "harrari", label: "Harari" },
  { value: "dire", label: "Dire Dawa" },
];

interface GrievanceDetailsCardProps {
  onNext: () => void;
  onBack: () => void;
}

export function GrievanceDetailsCard({ onNext, onBack }: GrievanceDetailsCardProps) {
  const [serviceCategory, setServiceCategory] = useState("");
  const [grievanceType, setGrievanceType] = useState("");
  const [region, setRegion] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">
        {/* Card Header */}
        <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
              <FileText className="w-6 h-6 text-[#0b8535]" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-gray-900">Grievance Details</h3>
              <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
              Step 2 of 3
            </span>
          </div>
        </div>

        {/* Card Body - Form Fields */}
        <div className="p-6 pb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Service Category <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                options={serviceCategoryOptions}
                placeholder="Select category"
                value={serviceCategory}
                onChange={setServiceCategory}
              />
            </div>

            {/* Grievance Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Grievance Type <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                options={grievanceTypeOptions}
                placeholder="Select service category first"
                value={grievanceType}
                onChange={setGrievanceType}
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Region <span className="text-red-500">*</span>
              </label>
              <AnimatedSelect
                options={regionOptions}
                placeholder="Select region"
                value={region}
                onChange={setRegion}
              />
            </div>

            {/* Zone / Sub-city */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Zone / Sub-city <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Zone / Sub-city"
                className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
              />
            </div>

            {/* Woreda */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Woreda <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Woreda name"
                className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
              />
            </div>

            {/* Kebele / Village */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Kebele / Village
              </label>
              <input
                type="text"
                placeholder="Enter kebele or village name"
                className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
              />
            </div>
          </div>

          {/* Service Provider / Branch / Office Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Service Provider / Branch / Office Name
            </label>
            <input
              type="text"
              placeholder="Enter Input store, cooperative, bank, or market name (if applicable)"
              className="w-full bg-white border border-gray-300 text-gray-900 py-2.5 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Describe the issue clearly — what happened, when, where, and who was involved. Include dates, amounts, and reference numbers where available."
              className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y"
            />
          </div>

          {/* Desired Outcome */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Desired Outcome
            </label>
            <textarea
              rows={3}
              placeholder="What is the expected resolution for this grievance?"
              className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded-lg focus:outline-none focus:border-[#0b8535] focus:ring-2 focus:ring-[#0b8535]/20 transition-all shadow-sm text-sm resize-y"
            />
          </div>

          {/* Supporting Documents / Evidence */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Supporting Documents / Evidence
            </label>
            {!uploadedFile && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#F9FAFB] border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#f0fcf3] transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-gray-100">
                  <Folder className="w-6 h-6 text-slate-400" fill="currentColor" />
                </div>
                <p className="text-[14px] font-semibold text-[#1e293b] mb-1">
                  Attach photos, voice recordings, or documents
                </p>
                <p className="text-[13px] text-slate-500 mb-4 font-medium">
                  Max 10 MB · JPG, PNG, PDF, MP3
                </p>
                <button className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F0FDF4] text-[#16A34A] rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors border border-green-300 hover:border-green-300">
                  + Browse Files
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf,.mp3"
            />

            {/* Uploaded File */}
            {uploadedFile && (
              <div className="flex items-center justify-between bg-[#F0FDF4] hover:bg-[#e5fbeb] border border-green-300 p-4 rounded-xl mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#D1FAE5] rounded-xl flex items-center justify-center">
                    <IdCard className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 leading-snug">
                      {uploadedFile.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[#16A34A] text-[13px] font-medium">
                      <div className="w-2 h-2 rounded-full bg-[#16A34A]"></div>
                      Uploaded · pending registry verification
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPreviewOpen(true);
                    }}
                    className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-5 h-5 text-blue-500" />
                  </button>
                  <button
                    onClick={handleRemoveFile}
                    className="p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] flex items-center justify-between rounded-b-xl">
          <div className="flex items-center text-sm text-gray-600">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 mr-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
              Back
            </button>
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

      {/* Image Preview Modal */}
      {isPreviewOpen && uploadedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 truncate pr-4">
                {uploadedFile.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(false);
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content - Image */}
            <div className="p-4 bg-gray-50/50 flex justify-center items-center overflow-auto max-h-[70vh]">
              {uploadedFile.type.startsWith("image/") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={URL.createObjectURL(uploadedFile)}
                  alt="Preview"
                  className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
                />
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p>Preview not available for this file type.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
