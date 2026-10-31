"use client";

import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState } from 'react';
import { User, Save, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
// eslint-disable-next-line boundaries/dependencies
import { useGrievanceOptions } from '@/features/metadata/hooks/useMetadata';
import { AnimatedSelect } from '@/components/submitter-identity/SI-Dropdown';
import { ReviewReassignmentPopup } from './ReviewReassignmentPopup';
import type { GrievanceChangeResponseData, GrievanceTimelineData, ReassignGrievancePayload } from '../../types';
import { isTerminalStatus } from '../../utils/mapGrievance';
import { CharacterCounter } from '@/components/ui/CharacterCounter';
import { REASON_MAX_LENGTH } from '@/lib/validation/lengthLimits';

interface CaseManagementProps {
  canManageCase: boolean;
  ticketNumber?: string | null;
  timelineData?: GrievanceTimelineData | null;
  onReassign?: (payload: ReassignGrievancePayload) => Promise<unknown>;
  onDecideReassignment?: (name: string, decision: 'Approved' | 'Rejected', comments: string) => Promise<void>;
  isTerminal?: boolean;
}

export function CaseManagement({
  canManageCase,
  ticketNumber,
  timelineData,
  onReassign,
  onDecideReassignment,
  isTerminal: propIsTerminal,
}: CaseManagementProps) {
  const activeTicket = ticketNumber || timelineData?.ticket_number || '';
  const optionsData = useAppSelector((state) => state.metadata?.grievanceOptions);
  const categorySelectId = useId();
  const t = useTranslations('caseDetail');
  const officerSelectId = useId();
  const grievanceTypeSelectId = useId();

  const [category, setCategory] = useState<string>('');
  const [targetOfficer, setTargetOfficer] = useState<string>('');
  const [targetGrievanceType, setTargetGrievanceType] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showViewPopup, setShowViewPopup] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // The service sends the category under `summary` (SubmitterDetails reads it there too).
  const initialCategory = timelineData?.summary?.service_category || timelineData?.service_category || '';
  const initialOfficer = timelineData?.assignment?.assigned_to || '';
  const initialOfficerName = timelineData?.assignment?.assigned_to_name || '';
  const currentDepartment = timelineData?.assignment?.department || '';
  const activeReassignment = timelineData?.assignment?.active_reassignment_request;
  const user = useAppSelector((state) => state.auth?.user);
  const isApprover = !!activeReassignment && activeReassignment.pending_with === user?.email;

  const currentStatus = timelineData?.status || timelineData?.current_status || '';
  const resolvedIsTerminal =
    propIsTerminal ?? isTerminalStatus(currentStatus, optionsData?.statuses);

  // Re-sync only when the ticket or its server-side category actually
  // changes. Keying on the whole timelineData object reset the form on every
  // timeline refetch (status change, comment, the refetch after a reassign),
  // wiping a half-typed justification.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setCategory(initialCategory);
    setTargetOfficer(initialOfficer);
    setTargetGrievanceType('');
    setReassignReason('');
  }, [activeTicket, initialCategory, initialOfficer]);

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    // Types belong to a category, so a previous pick never carries over.
    setTargetGrievanceType('');
    if (val !== initialCategory) {
      setTargetOfficer('');
    } else {
      setTargetOfficer(initialOfficer);
    }
  };

  const { data: deptOptions, isLoading: isLoadingOfficers } = useGrievanceOptions(
    { service_category: category },
    { skip: !category }
  );

  const categoryOptions = useMemo(() => {
    return (optionsData?.service_categories ?? [])
      .map((c) => c.category_name)
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
  }, [optionsData]);

  // Moving to another category also needs one of that category's grievance types.
  const isCategoryChange = Boolean(category) && category !== initialCategory;
  const grievanceTypeOptions = useMemo(
    () =>
      (deptOptions?.grievance_types ?? [])
        .filter((g) => g.service_category === category)
        .map((g) => ({ value: g.grievance_type_id, label: g.type_name })),
    [deptOptions, category]
  );

  // The options list only holds categories with a staffed desk; the case's own
  // category must still show as selected when it isn't in it.
  const categorySelectOptions = useMemo(
    () =>
      initialCategory && !categoryOptions.some((o) => o.value === initialCategory)
        ? [{ value: initialCategory, label: initialCategory }, ...categoryOptions]
        : categoryOptions,
    [categoryOptions, initialCategory]
  );

  const officerOptions = useMemo(() => {
    return (deptOptions?.officers || []).map((o) => ({
      value: o.user_id,
      label: o.full_name,
    }));
  }, [deptOptions]);

  // The officers list leaves out the caller and is only loaded per category, so
  // the assigned officer is added from the timeline when it isn't in it. Its
  // label is the full name, never the email.
  const officerSelectOptions = useMemo(
    () =>
      initialOfficer && category === initialCategory && !officerOptions.some((o) => o.value === initialOfficer)
        ? [{ value: initialOfficer, label: initialOfficerName || t('assignedOfficer') }, ...officerOptions]
        : officerOptions,
    [officerOptions, initialOfficer, initialOfficerName, category, initialCategory]
  );

  if (!canManageCase && !isApprover && !resolvedIsTerminal) return null;

  const isReassignment =
    (category && category !== initialCategory) || (targetOfficer !== initialOfficer);

  const handleSave = async () => {
    if (!onReassign || !activeTicket) return;
    setFeedback(null);
    if (isCategoryChange && isLoadingOfficers) return;
    if (isCategoryChange && grievanceTypeOptions.length > 0 && !targetGrievanceType) {
      setFeedback({ type: 'error', message: t('chooseGrievanceType', { category }) });
      return;
    }
    setIsSaving(true);

    try {
      if (isReassignment) {
        const result = (await onReassign({
          // Always sent: the service picks the receiving desk from the officer and the category together.
          target_category: category || undefined,
          target_grievance_type: isCategoryChange ? targetGrievanceType || undefined : undefined,
          // With no category to go on, the case's current desk stands in for it.
          target_department: category ? undefined : currentDepartment || undefined,
          target_officer: targetOfficer || undefined,
          reason: reassignReason.trim() || undefined,
        })) as GrievanceChangeResponseData | undefined;

        const isPending = result?.change_request?.status === 'Pending';
        const msg = isPending
          ? 'Reassignment request submitted (pending supervisor approval)'
          : `Case reassigned to ${category}`;

        setFeedback({ type: 'success', message: msg });
        setReassignReason('');
        // A pending request leaves the server department unchanged, so the
        // effect above won't fire — reset the dropdown here instead of
        // leaving the form armed to resubmit the same request.
        if (isPending) setCategory(initialCategory);
      } else {
        setFeedback({ type: 'success', message: 'No changes to save' });
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      // The thunk rejects with the message string itself (unwrap() rethrows it), not an Error.
      const msg =
        typeof err === 'string' && err
          ? err
          : err instanceof Error && err.message
            ? err.message
            : 'Failed to request reassignment';
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

        {activeReassignment && (
          <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-2">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold">
              <RefreshCw className="h-4 w-4" />
              Reassignment Pending
            </div>
            <p className="text-xs text-blue-700">
              A request to reassign to {activeReassignment.changes?.find(c => c.fieldname === 'service_category')?.new_value || 'another category'} is pending.
            </p>
            <button
              onClick={() => setShowViewPopup(true)}
              className="mt-1 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              {isApprover ? 'Review Request' : 'View Request'}
            </button>
          </div>
        )}

        {resolvedIsTerminal ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[#1B362D]">Category</span>
              <div className="w-full border border-gray-200 bg-gray-50/80 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium">
                {initialCategory || 'None'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[#1B362D]">Officer</span>
              <div className="w-full border border-gray-200 bg-gray-50/80 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-medium">
                {officerOptions.find((o) => o.value === initialOfficer)?.label || initialOfficerName || (initialOfficer ? t('assignedOfficer') : 'Unassigned')}
              </div>
            </div>

            <div className="text-xs text-gray-500 italic mt-0.5">
              Case is {currentStatus ? currentStatus.toLowerCase() : 'closed'} and cannot be reassigned.
            </div>
          </div>
        ) : canManageCase ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={categorySelectId} className="text-[13px] font-semibold text-[#1B362D]">
                Category
              </label>
              <AnimatedSelect
                id={categorySelectId}
                placeholder="Select Category"
                value={category}
                onChange={handleCategoryChange}
                options={categorySelectOptions}
              />
            </div>

            {isCategoryChange && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={grievanceTypeSelectId} className="text-[13px] font-semibold text-[#1B362D]">
                  {t('grievanceType')}
                </label>
                <AnimatedSelect
                  id={grievanceTypeSelectId}
                  placeholder={isLoadingOfficers ? t('loadingTypes') : t('selectGrievanceType')}
                  value={targetGrievanceType}
                  onChange={setTargetGrievanceType}
                  options={grievanceTypeOptions}
                  disabled={isLoadingOfficers}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={officerSelectId} className="text-[13px] font-semibold text-[#1B362D]">
                Officer (Optional)
              </label>
              <AnimatedSelect
                id={officerSelectId}
                placeholder={isLoadingOfficers ? "Loading officers..." : "Select Officer"}
                value={targetOfficer}
                onChange={setTargetOfficer}
                options={officerSelectOptions}
                disabled={isLoadingOfficers || !category}
              />
            </div>

            {/* Reason for Reassignment (visible when category is modified) */}
            {isReassignment && (
              <div className="flex flex-col gap-1.5 p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                  <span id="reassign-justification-label">Reassignment Justification</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-tight">
                  Junior officer reassignment requests will be routed to your supervisor for review.
                </p>
                <textarea
                  rows={2}
                  aria-labelledby="reassign-justification-label"
                  value={reassignReason}
                  maxLength={REASON_MAX_LENGTH}
                  aria-describedby="reassign-reason-count"
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Provide justification for routing to this category..."
                  className="w-full mt-1 border border-amber-200 rounded-md p-2 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
                <CharacterCounter id="reassign-reason-count" count={reassignReason.length} max={REASON_MAX_LENGTH} className="text-right" />
              </div>
            )}

            <button
              type="button"
              disabled={isSaving || (isCategoryChange && isLoadingOfficers)}
              onClick={handleSave}
              className="w-full py-2.5 bg-[#1E9E49] hover:bg-[#18803B] text-white font-bold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-xs mt-1 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving…' : isReassignment ? 'Submit Reassignment Request' : 'Save Changes'}
            </button>
          </>
        ) : null}
      </div>

      {showViewPopup && activeReassignment && (
        <ReviewReassignmentPopup
          request={activeReassignment}
          onClose={() => setShowViewPopup(false)}
          onDecide={
            isApprover && onDecideReassignment
              ? (decision, comments) => onDecideReassignment(activeReassignment.name, decision, comments)
              : async () => {} // If readonly, we don't need a real onDecide, but wait ReviewReassignmentPopup requires it
          }
        />
      )}
    </div>
  );
}
