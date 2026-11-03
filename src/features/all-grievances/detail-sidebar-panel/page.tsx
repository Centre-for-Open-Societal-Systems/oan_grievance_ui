"use client";

import { useState } from 'react';
import { SidebarHeader } from './components/SidebarHeader';
import { CommentsAndCommunication } from './components/CommentsAndCommunication';
import { SLATracker } from './components/SLATracker';
import { CaseManagement } from './components/CaseManagement';
import { SubmitterDetails } from './components/SubmitterDetails';
import { ThreadSummary } from './components/ThreadSummary';
import { ResponseForm } from './components/ResponseForm';
import { AttachmentsList } from './components/AttachmentsList';
import { CaseActionsPanel } from './components/CaseActionsPanel';
import { useGrievanceTimeline } from '../hooks/useGrievanceTimeline';
import type { Grievance } from '../types';
import { grievanceFromTimeline, isTerminalStatus } from '../utils/mapGrievance';
import { useAppSelector } from '@/store/hooks';
import { canExportCase, isOfficerOrAdmin, isSubmitterOnly } from '@/features/auth/rbac';

export function GrievanceDetailSidebar({
  ticketNumber,
  grievance: selectedGrievance,
  onClose,
}: {
  ticketNumber?: string | null;
  grievance?: Grievance | null;
  onClose: () => void;
}) {
  const activeTicket = ticketNumber || selectedGrievance?.ticketNumber || selectedGrievance?.ticketId || null;
  const user = useAppSelector((state) => state.auth.user);
  const userRoles = user?.roles ?? [];
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load live timeline, conversation, and case state from Redux
  const {
    timelineData,
    isLoading,
    isSubmitting,
    error,
    refetch,
    addNote,
    executeAction,
    deferSLA,
    reassign,
  } = useGrievanceTimeline({
    ticketNumber: activeTicket,
  });

  // A case opened by link has no list row; fall back to what the timeline carries.
  const grievance = selectedGrievance ?? (timelineData ? grievanceFromTimeline(timelineData) : null);

  const handleDecideDeferral = async (name: string, decision: string, note: string) => {
    const { decideChangeRequest } = await import('../api/grievanceApi');
    await decideChangeRequest(name, { decision, note });
    await refetch();
  };

  const handleDecideReassignment = async (name: string, decision: string, note: string) => {
    const { decideChangeRequest } = await import('../api/grievanceApi');
    await decideChangeRequest(name, { decision, note });
    await refetch();
  };

  // Staff get the staff view (response form, internal notes); everyone else
  // the submitter's. Which actions a staff member may take on this case —
  // escalated or not, assigned to them or not — is the backend's call, made
  // through `available_actions`; none offered means none shown.
  const canManageCase = isOfficerOrAdmin(userRoles);
  const showCaseManagement = !isSubmitterOnly(userRoles);

  const statusOptions = useAppSelector((state) => state.metadata?.grievanceOptions?.statuses);
  const currentStatus =
    timelineData?.status || timelineData?.current_status || grievance?.status || '';
  const isTerminal = isTerminalStatus(currentStatus, statusOptions);

  if (!activeTicket) return null;

  // An officer takes every action through the department response form
  // (action, then the response type mapped onto it). A submitter has no
  // response form, so their actions get the panel in its place.
  const availableActions = timelineData?.available_actions ?? [];

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity duration-300 ${
          activeTicket ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 max-w-[100vw] bg-[#F8F9FA] shadow-2xl z-50 transform transition-all duration-300 ease-in-out flex flex-col ${
          isFullscreen ? 'w-full' : 'w-[1100px]'
        } ${activeTicket ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <SidebarHeader
          ticketNumber={activeTicket}
          timelineData={timelineData}
          grievance={grievance}
          onClose={onClose}
          canExport={canExportCase(userRoles)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />

        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column: Comments, Activity Timeline & Response Form */}
            <div className="col-span-2 flex flex-col gap-6">
              <CommentsAndCommunication
                canManageCase={canManageCase}
                timelineData={timelineData}
                isLoading={isLoading}
                error={error}
                onRetry={refetch}
                grievance={grievance}
              />
              <ResponseForm
                ticketNumber={activeTicket}
                canManageCase={canManageCase}
                actions={availableActions}
                isLoadingActions={!timelineData}
                onExecuteAction={executeAction}
                onAddNote={addNote}
                acceptsFiles
                isSubmitting={isSubmitting}
                isTerminal={isTerminal}
                caseStatus={currentStatus}
              />
              {timelineData && !canManageCase ? (
                <CaseActionsPanel
                  key={activeTicket}
                  actions={availableActions}
                  caseStatus={timelineData.status ?? timelineData.current_status}
                  isSubmitting={isSubmitting}
                  onExecute={executeAction}
                />
              ) : null}
            </div>

            {/* Right Column: SLA, Case Management, Submitter, Summary & Attachments */}
            <div className="col-span-1 flex flex-col gap-6">
              {grievance ? (
                <SLATracker
                  canManageCase={canManageCase}
                  grievance={grievance}
                  timelineData={timelineData}
                  onDefer={deferSLA}
                  onDecideDeferral={handleDecideDeferral}
                  isTerminal={isTerminal}
                />
              ) : null}
              {showCaseManagement ? (
                <CaseManagement
                  canManageCase={canManageCase}
                  ticketNumber={activeTicket}
                  timelineData={timelineData}
                  onReassign={reassign}
                  onDecideReassignment={handleDecideReassignment}
                  isTerminal={isTerminal}
                />
              ) : null}

              {grievance ? (
                <SubmitterDetails grievance={grievance} timelineData={timelineData} />
              ) : null}
              <ThreadSummary canManageCase={canManageCase} timelineData={timelineData} />
              <AttachmentsList
                attachments={timelineData?.attachments}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
