import React, { useState } from "react";
import { FileText, Info, Save, ArrowRight, ArrowLeft, User, Check } from "lucide-react";

interface ReviewAndSubmitCardProps {
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewAndSubmitCard({ onBack, onSubmit }: ReviewAndSubmitCardProps) {
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ">


      {/* Top Card - Review Header */}
      <div className="p-6 pb-4 border-b border-gray-200 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#078930]/10 flex items-center justify-center border border-[#078930]/20 flex-shrink-0">
            <FileText className="w-6 h-6 text-[#0b8535]" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-gray-900">Review & Submit</h3>
            <p className="text-sm text-gray-500 mt-0">Provide essential details about your grievance</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-[#0b8535] border border-green-200">
            Step 3 of 3
          </span>
        </div>
      </div>




      {/* Main Content Card */}
      <div className="p-6 pb-8 space-y-6">
          {/* Ticket Number Alert */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <User className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900 mb-0.5">Ticket number will be generated as:</p>
              <p className="text-sm font-medium text-gray-500">AMHA-SD-MAR-XXXXX</p>
            </div>
          </div>

          {/* Details Summary */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Submitter Type</p>
                <p className="text-[15px] font-semibold text-gray-900">Individual Farmer</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Channel</p>
                <p className="text-[15px] font-semibold text-gray-900">Mobile App</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fayda ID</p>
                <p className="text-[15px] font-semibold text-gray-900">3232</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Service Category</p>
                <p className="text-[15px] font-semibold text-gray-900">Markets</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Grievance Type</p>
                <p className="text-[15px] font-semibold text-gray-900">Export permit / certification delay</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                <p className="text-[15px] font-semibold text-gray-900">Amhara, sd, ds</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-[15px] font-semibold text-gray-900">Test TestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTest</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attachments (2)</p>
                <p className="text-[15px] font-semibold text-gray-900">evidence_2.jpg, evidence_2.jpg</p>
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div 
            className="flex items-start gap-3 mt-4 cursor-pointer group"
            onClick={() => setConsentChecked(!consentChecked)}
          >
            <div className="relative mt-0.5 flex-shrink-0">
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-300 ${
                consentChecked 
                  ? 'bg-[#16A34A] border-2 border-[#16A34A] shadow-[0_0_8px_rgba(22,163,74,0.4)]' 
                  : 'border-2 border-gray-300 bg-white group-hover:border-[#16A34A]'
              }`}>
                <Check className={`w-3.5 h-3.5 text-white transition-all duration-300 ${
                  consentChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`} strokeWidth={4} />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-600 leading-relaxed select-none">
              I consent to this grievance being shared with the relevant department for resolution. I confirm the information above is true and accurate to the best of my knowledge.
            </span>
          </div>
        </div>

      {/* Footer Actions */}
      <div className="bg-[#F3F4F8]/50 p-4 border-t border-[#E5E7EB] flex items-center justify-between rounded-b-xl mt-auto">
          <div className="flex items-center text-sm text-gray-600">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 mr-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
              Previous
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
              onClick={onSubmit}
              className={`flex items-center gap-2 px-5 py-3 text-white rounded-lg text-sm font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 ${consentChecked
                ? "bg-[#16A34A] hover:bg-[#10883c] focus:ring-[#0b8535]/50"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
                }`}
              disabled={!consentChecked}
            >
              Submit Grievance
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
      </div>
    </div>
  );
}
