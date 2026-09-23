"use client";

import { User, Tag, Info, MapPin, Building, Radio, Calendar } from 'lucide-react';
import type { Grievance, GrievanceTimelineData } from '../../types';
import { getInitials } from '../../utils/mapGrievance';

interface SubmitterDetailsProps {
  grievance: Grievance;
  timelineData?: GrievanceTimelineData | null;
}

export function SubmitterDetails({ grievance, timelineData }: SubmitterDetailsProps) {
  const isAnonymous = grievance.isAnonymous || Boolean(timelineData?.submitter?.is_anonymous);
  const submitterName =
    (isAnonymous
      ? 'Anonymous'
      : timelineData?.submitter?.name || grievance.submitterName) || 'Anonymous';

  const submitterType =
    (isAnonymous
      ? 'Anonymous Submitter'
      : timelineData?.submitter?.submitter_type || grievance.submitterType) || 'Citizen Submitter';

  const category = timelineData?.summary?.service_category || grievance.category || 'General';
  const grievanceType = timelineData?.summary?.grievance_type || grievance.type || 'General Inquiry';
  const hierarchy =
    timelineData?.summary?.administrative_hierarchy ||
    timelineData?.administrative_hierarchy;
  const hierarchyLocation = hierarchy
    ? [hierarchy.woreda, hierarchy.region].filter(Boolean).join(' / ') ||
      [hierarchy.kebele, hierarchy.woreda, hierarchy.zone, hierarchy.region].filter(Boolean).join(', ')
    : null;
  const location =
    hierarchyLocation ||
    grievance.location ||
    timelineData?.summary?.location ||
    timelineData?.location ||
    timelineData?.summary?.administrative_area ||
    'N/A';
  const unit = timelineData?.summary?.administrative_unit || grievance.administrativeUnit || 'N/A';
  const channel = timelineData?.summary?.submission_channel || grievance.submissionChannel || 'Web Portal';
  const submittedAt = grievance.submittedAt || 'N/A';
  const initials = getInitials(submitterName);

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
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 ring-2 ring-gray-100 flex items-center justify-center bg-gray-800 text-white font-bold text-lg">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-gray-900 text-lg tracking-tight truncate">{submitterName}</span>
            <span className="text-xs text-gray-500 mb-1 truncate">{submitterType}</span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider w-max truncate">
              {timelineData?.ticket_number_display || timelineData?.ticket_number || grievance.ticketId}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span>Category</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[20px]">{category}</div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Type</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[20px]">{grievanceType}</div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>Location</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[20px]">{location}</div>
          </div>

          {unit !== 'N/A' && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 shrink-0" />
                <span>Unit / Kebele</span>
              </div>
              <div className="text-[14px] font-semibold text-gray-900 ml-[20px]">{unit}</div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 shrink-0" />
              <span>Channel</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[20px]">{channel}</div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Submitted</span>
            </div>
            <div className="text-[14px] font-semibold text-gray-900 ml-[20px]">{submittedAt}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
