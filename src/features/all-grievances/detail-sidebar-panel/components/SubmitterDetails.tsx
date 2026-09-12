import React from 'react';
import { User, Tag, Info, MapPin, Building, Calendar } from 'lucide-react';
import { Grievance } from '../../mockData';

interface SubmitterDetailsProps {
  grievance: Grievance;
}

export function SubmitterDetails({ grievance }: SubmitterDetailsProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header spanning full width */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <div className="w-6 flex justify-center">
          <User className="h-6 w-6 text-indigo-700 fill-indigo-700" />
        </div>
        <h3 className="text-md font-bold text-gray-900">Submitter Details</h3>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 ring-2 ring-gray-50/50">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-xl tracking-tight">Abebe Bekele</span>
            <span className="text-[15px] text-gray-500 mb-1.5">Individual Farmer</span>
            <span className="text-[13px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl uppercase tracking-wider w-max">FYD-9821-0034</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-4 w-4 shrink-0" />
              <span>Category</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[22px]">{grievance.category}</div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-4 w-4 shrink-0" />
              <span>Type</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[22px]">{grievance.type}</div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Location</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[22px]">{grievance.location}</div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4 w-4 shrink-0" />
              <span>Kebele</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[22px]">Kebele 01</div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Channel</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[22px]">Field Officer Assisted</div>
          </div>
          <div>
            <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Submitted</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[22px]">{grievance.submittedAt}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
