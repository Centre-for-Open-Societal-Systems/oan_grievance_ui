"use client";

import { useEffect, useState } from 'react';
import { User, ChevronDown, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { GrievanceActionPayload, GrievanceTimelineData } from '../../types';

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
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 flex justify-between items-center hover:border-gray-300 focus:outline-none focus:border-[#1d9645] focus:ring-1 focus:ring-[#1d9645] bg-white transition-all duration-200 shadow-xs"
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
          {options.map((opt, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                value === opt ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CaseManagementProps {
  canManageCase: boolean;
  timelineData?: GrievanceTimelineData | null;
  onExecuteAction?: (payload: GrievanceActionPayload) => Promise<unknown>;
}

export function CaseManagement({
  canManageCase,
  timelineData,
  onExecuteAction,
}: CaseManagementProps) {
  const [status, setStatus] = useState<string>('');
  const [officer, setOfficer] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [escalated, setEscalated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (timelineData) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setStatus(timelineData.status || timelineData.current_status || '');
      setOfficer(timelineData.assignment?.assigned_to || '');
      setDepartment(timelineData.assignment?.department || '');
      setEscalated(Boolean(timelineData.escalated));
    }
  }, [timelineData]);

  if (!canManageCase) return null;

  const handleSave = async () => {
    if (!onExecuteAction) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      if (status && status !== timelineData?.status) {
        await onExecuteAction({
          action: status,
          reason: `Status updated to ${status}`,
        });
      }
      setFeedback({ type: 'success', message: 'Case updated successfully' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update case';
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
          label="Status"
          placeholder="Select Status"
          value={status}
          onChange={setStatus}
          options={[
            'Submitted',
            'Assigned',
            'In Progress',
            'Under Investigation',
            'More Info Requested',
            'Resolved',
            'Closed',
            'Rejected',
          ]}
        />

        <AnimatedDropdown
          label="Assigned Officer"
          placeholder="Select Officer"
          value={officer}
          onChange={setOfficer}
          options={['Tigist Alemu', 'Abebe Bekele', 'Yonas Mekonnen', 'Almaz Worku']}
        />

        <AnimatedDropdown
          label="Department"
          placeholder="Select Department"
          value={department}
          onChange={setDepartment}
          options={[
            'Inputs Supply & Distribution Agency',
            'Market Development & Trade Bureau',
            'Credit & Financial Services',
            'Agronomy & Crop Extension',
          ]}
        />

        <label className="flex items-center gap-2.5 cursor-pointer group mt-0.5">
          <input
            type="checkbox"
            checked={escalated}
            onChange={(e) => setEscalated(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm font-semibold text-[#475467] group-hover:text-gray-900 transition-colors">
            Escalated Priority
          </span>
        </label>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-2.5 bg-[#1E9E49] hover:bg-[#18803B] text-white font-bold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-xs mt-1 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving…' : 'Save Assignment'}
        </button>
      </div>
    </div>
  );
}
