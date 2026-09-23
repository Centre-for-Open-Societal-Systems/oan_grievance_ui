"use client";

import { useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Clock, Timer } from 'lucide-react';
import { DeferSLAPopup } from './DeferSLAPopup';
import type { Grievance, GrievanceTimelineData } from '../../types';
import { formatDate } from '../../utils/mapGrievance';

interface SLATrackerProps {
  canManageCase: boolean;
  grievance: Grievance;
  timelineData?: GrievanceTimelineData | null;
}

export function SLATracker({ canManageCase, grievance, timelineData }: SLATrackerProps) {
  const [showPopup, setShowPopup] = useState(false);
  const canDefer = canManageCase;

  const slaData = timelineData?.sla;
  const consumedPercent = Math.min(
    100,
    Math.max(0, slaData?.sla_consumed_percent ?? (grievance.status === 'Resolved' ? 100 : 50))
  );

  const isResolved = grievance.status === 'Resolved' || grievance.status === 'Closed';
  const isOverdue = !isResolved && (consumedPercent >= 100 || grievance.status === 'Overdue');
  const isAtRisk = !isResolved && !isOverdue && consumedPercent >= 80;

  const submittedDate =
    formatDate(slaData?.sla_start_at) || grievance.submittedAt.split(',')[0] || 'N/A';
  const dueDate = formatDate(slaData?.sla_due_date) || grievance.slaDueDate || 'N/A';

  const getStatusBadge = () => {
    if (isResolved) {
      return (
        <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-full flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Met SLA
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-full flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Overdue
        </span>
      );
    }
    if (isAtRisk) {
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> At Risk
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" /> On Track
      </span>
    );
  };

  const getProgressBarColor = () => {
    if (isResolved) return 'bg-emerald-600';
    if (isOverdue) return 'bg-red-500';
    if (isAtRisk) return 'bg-amber-500';
    return 'bg-[#1E9E49]';
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden">
        <div
          className={`flex items-center justify-between p-5 pb-4 border-b ${
            isOverdue ? 'border-red-100' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Timer className={`h-5 w-5 ${isOverdue ? 'text-red-500' : 'text-indigo-600'}`} />
            <h3 className="text-md font-bold text-gray-900">SLA Tracker</h3>
          </div>
          {getStatusBadge()}
        </div>

        <div className="p-5 flex flex-col">
          <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
            <span>SLA Consumed</span>
            <span
              className={`font-bold ${
                isOverdue ? 'text-red-600' : isAtRisk ? 'text-amber-600' : 'text-gray-900'
              }`}
            >
              {consumedPercent}%
            </span>
          </div>

          <div className="h-2.5 w-full bg-gray-100 rounded-full mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${consumedPercent}%` }}
            ></div>
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200/80">
              <div className="text-xs font-medium text-gray-500">Submitted</div>
              <div className="text-sm font-bold text-gray-900 truncate">{submittedDate}</div>
            </div>
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-center border ${
                isOverdue
                  ? 'bg-red-50/60 border-red-100 text-red-600'
                  : 'bg-gray-50 border-gray-200/80 text-gray-900'
              }`}
            >
              <div className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                Due Date
              </div>
              <div className="text-sm font-bold truncate">{dueDate}</div>
            </div>
          </div>

          {canDefer && !isResolved && (
            <button
              type="button"
              onClick={() => setShowPopup(true)}
              className="w-full py-2.5 bg-[#1ca848] hover:bg-[#1a9c42] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs text-sm"
            >
              <CalendarClock className="h-4 w-4" /> Defer SLA
            </button>
          )}
        </div>
      </div>

      {canDefer && showPopup && <DeferSLAPopup onClose={() => setShowPopup(false)} />}
    </>
  );
}
