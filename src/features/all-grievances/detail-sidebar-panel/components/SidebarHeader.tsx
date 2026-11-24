"use client";

import { X, Maximize, Minimize } from 'lucide-react';
import { ExportMenu } from './ExportMenu';
import { audioAttachments } from './VoiceNotePlayer';
import { deriveTitle } from '../../utils/mapGrievance';
import { statusBadgeClass } from '../../utils/statusStyles';
import type { Grievance, GrievanceTimelineData } from '../../types';

interface SidebarHeaderProps {
  ticketNumber: string;
  timelineData?: GrievanceTimelineData | null;
  grievance?: Grievance | null;
  onClose: () => void;
  /** Whether the viewer holds the export permission; the backend re-checks. */
  canExport?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function SidebarHeader({ ticketNumber, timelineData, grievance, onClose, canExport = false, isFullscreen, onToggleFullscreen }: SidebarHeaderProps) {
  const displayTicket =
    timelineData?.ticket_number_display ||
    timelineData?.ticket_number ||
    grievance?.ticketId ||
    ticketNumber;

  const status =
    timelineData?.status ||
    timelineData?.current_status ||
    grievance?.status ||
    'Submitted';

  const isEscalated =
    timelineData?.escalated !== undefined
      ? Boolean(timelineData.escalated)
      : Boolean(grievance?.escalated);

  // A recording on the case marks it as a voice grievance; the list title (same
  // rule, from the channel) is used when the timeline hasn't loaded yet.
  const hasRecording = [timelineData?.attachments, ...(timelineData?.events ?? []).map((e) => e.attachments)].some(
    (list) => audioAttachments(list).length > 0,
  );
  const description = timelineData?.summary?.description ?? timelineData?.description;
  const title =
    (timelineData
      ? deriveTitle(description, { isVoice: hasRecording, ticket: displayTicket })
      : undefined) ||
    grievance?.title ||
    'Grievance Case';

  return (
    <div className="flex items-start justify-between pl-8 pr-6 py-5 bg-white border-b border-gray-200">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {displayTicket}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold leading-tight ${statusBadgeClass(status)}`}>
            {status}
          </span>
          {isEscalated && (
            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200/60 text-xs font-bold rounded-full">
              Escalated
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 leading-tight line-clamp-2">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {canExport && <ExportMenu ticketNumber={ticketNumber || displayTicket} />}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-300 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-gray-300/50"
            title={isFullscreen ? "Minimize" : "Full Screen"}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-red-500/30"
          title="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
