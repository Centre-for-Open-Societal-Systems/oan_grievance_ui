import type { Grievance } from '../types';
import { SidebarHeader } from './components/SidebarHeader';
import { CommentsAndCommunication } from './components/CommentsAndCommunication';
import { SLATracker } from './components/SLATracker';
import { CaseManagement } from './components/CaseManagement';
import { SubmitterDetails } from './components/SubmitterDetails';
import { ThreadSummary } from './components/ThreadSummary';
import { ResponseForm } from './components/ResponseForm';
import { useIsOfficerOrAdmin } from '@/features/auth/hooks/useIsOfficerOrAdmin';

export function GrievanceDetailSidebar({
  grievance,
  onClose
}: {
  grievance: Grievance | null;
  onClose: () => void;
}) {
  // Decided once, at the boundary that composes the panel, rather than by
  // each of the five child components independently calling the same hook —
  // this is the one place that states who may see officer/admin-only
  // content in this panel, instead of five separate memories of the rule.
  const canManageCase = useIsOfficerOrAdmin();

  if (!grievance) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity duration-300 ${grievance ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 right-0 w-[1100px] max-w-[100vw] bg-[#F8F9FA] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${grievance ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <SidebarHeader grievance={grievance} onClose={onClose} />

        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="grid grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="col-span-2 flex flex-col gap-6">
              <CommentsAndCommunication canManageCase={canManageCase} />
              <ResponseForm canManageCase={canManageCase} />
            </div>

            {/* Right Column */}
            <div className="col-span-1 flex flex-col gap-6">
              <SLATracker canManageCase={canManageCase} />
              <CaseManagement canManageCase={canManageCase} />
              <SubmitterDetails grievance={grievance} />
              <ThreadSummary canManageCase={canManageCase} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
