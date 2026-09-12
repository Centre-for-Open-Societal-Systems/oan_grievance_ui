import React from 'react';
import { Link, FileText, EyeOff, Paperclip } from 'lucide-react';

export function ThreadSummary() {
  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      {/* Header spanning full width */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <div className="w-6 flex justify-center">
          <Link className="h-6 w-6 text-indigo-700" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-[#141F2B]">Thread Summary</h3>
      </div>

      {/* Content Area */}
      <div className="px-5 py-3 flex flex-col">
        <div className="flex flex-col">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-4 text-[16px] text-[#475467]">
              <div className="p-2.5 bg-orange-50 text-[#E85D04] rounded-xl"><FileText className="h-4 w-4" /></div>
              Dept responses
            </div>
            <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[15px] font-bold rounded-full">1</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="flex items-center gap-4 text-[16px] text-[#475467]">
              <div className="p-2.5 bg-blue-50 text-[#007BFF] rounded-xl"><EyeOff className="h-4 w-4" /></div>
              Internal notes
            </div>
            <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[15px] font-bold rounded-full">1</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4 text-[16px] text-[#475467]">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Paperclip className="h-4 w-4" /></div>
              Attachments
            </div>
            <span className="px-3 py-1 bg-[#F1F3F4] text-[#475467] text-[14px] font-bold rounded-full">3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
