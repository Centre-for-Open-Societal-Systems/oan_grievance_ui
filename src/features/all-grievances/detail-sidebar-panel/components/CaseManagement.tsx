"use client";

import { useEffect, useMemo, useState } from 'react';
import { User, ChevronDown, Save, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import type { GrievanceActionPayload, GrievanceChangeResponseData, GrievanceTimelineData, ReassignGrievancePayload } from '../../types';

const AnimatedDropdown = ({
  label,
  options,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[#1B362D]">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 flex justify-between items-center hover:border-gray-300 focus:outline-none focus:border-[#1d9645] focus:ring-1 focus:ring-[#1d9645] bg-white transition-all duration-200 shadow-xs cursor-pointer"
      >
        <span className={value ? 'text-gray-900 font-medium' : 'text-[#8C9AA1]'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-[68px] left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-30 overflow-hidden max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">No departments available</div>
          ) : (
            options.map((opt, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer ${
                  value === opt ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                }`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

interface CaseManagementProps {
  canManageCase: boolean;
  ticketNumber?: string | null;
  timelineData?: GrievanceTimelineData | null;
  onExecuteAction?: (payload: GrievanceActionPayload) => Promise<unknown>;
  onReassign?: (payload: ReassignGrievancePayload) => Promise<unknown>;
}

export function CaseManagement({
  canManageCase,
  ticketNumber,
  timelineData,
  onReassign,
}: CaseManagementProps) {
  const activeTicket = ticketNumber || timelineData?.ticket_number || '';
  const optionsData = useAppSelector((state) => state.metadata?.grievanceOptions);

  const [department, setDepartment] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const initialDepartment = timelineData?.assignment?.department || '';

  useEffect(() => {
    if (timelineData) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setDepartment(timelineData.assignment?.department || '');
      setReassignReason('');
    }
  }, [timelineData]);

  const departmentOptions = useMemo(() => {
    return (optionsData?.departments ?? []).map((d) => d.department_name).filter(Boolean);
  }, [optionsData]);

  if (!canManageCase) return null;

  const isReassignment = department && department !== initialDepartment;

  const handleSave = async () => {
    if (!onReassign || !activeTicket) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      if (isReassignment) {
        const result = (await onReassign({
          target_department: department,
          reason: reassignReason.trim() || undefined,
        })) as GrievanceChangeResponseData | undefined;

        const isPending = result?.change_request?.status === 'Pending';
        const msg = isPending
          ? 'Reassignment request submitted (pending supervisor approval)'
          : `Case reassigned to ${department}`;

        setFeedback({ type: 'success', message: msg });
        setReassignReason('');
      } else {
        setFeedback({ type: 'success', message: 'No department changes to save' });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request reassignment';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      {/* Header spanning full width */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <User className="h-6 w-6 text-blue-700 fill-blue-700" />
        <h3 className="text-md font-bold text-[#141F2B]">Case Management</h3>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col gap-4">
        {feedback && (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <AnimatedDropdown
          label="Department"
          placeholder="Select Department"
          value={department}
          onChange={setDepartment}
          options={departmentOptions}
        />

        {/* Reason for Reassignment (visible when department is modified) */}
        {isReassignment && (
          <div className="flex flex-col gap-1.5 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
              <span>Reassignment Justification</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-tight">
              Junior officer reassignment requests will be routed to your supervisor for review.
            </p>
            <textarea
              rows={2}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="Provide justification for routing to this department..."
              className="w-full mt-1 border border-amber-200 rounded-md p-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>
        )}

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-2.5 bg-[#1E9E49] hover:bg-[#18803B] text-white font-bold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-xs mt-1 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving…' : isReassignment ? 'Submit Reassignment Request' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
