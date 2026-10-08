'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Archive, ChevronDown, Pencil, RotateCcw } from 'lucide-react';
import type { CategoryAssignment } from './types';

interface CategoryAssignmentRowProps {
  assignment: CategoryAssignment;
  departmentName: string | null;
  isLast?: boolean;
  isBusy?: boolean;
  /** False hides Edit/Deactivate/Reactivate — for a read-only role (Review Officer) the backend refuses the write anyway. */
  canManage?: boolean;
  onEdit: (assignment: CategoryAssignment) => void;
  onDeactivate: (assignment: CategoryAssignment) => void;
  onReactivate: (assignment: CategoryAssignment) => void;
}

export function CategoryAssignmentRow({
  assignment,
  departmentName,
  isLast,
  isBusy = false,
  canManage = true,
  onEdit,
  onDeactivate,
  onReactivate,
}: CategoryAssignmentRowProps) {
  const t = useTranslations('admin.categoryAssignments');
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = `assignment-${assignment.name}-details`;

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden border border-gray-200 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 ${assignment.active ? '' : 'opacity-70'} ${!isLast ? 'mb-4' : ''}`}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="w-full p-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16A34A]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-semibold text-gray-900 truncate">{assignment.service_category}</span>
              {!assignment.active && (
                <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold border bg-gray-100 text-gray-600 border-gray-300">
                  {t('inactive')}
                </span>
              )}
            </div>
            <div className="text-[13px] text-gray-500">{departmentName ?? assignment.department}</div>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 mb-0.5">{t('l1Officer')}</span>
            <span className="text-sm font-medium text-gray-900">{assignment.l1_officer_name ?? '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 mb-0.5">{t('l2Officer')}</span>
            <span className="text-sm font-medium text-gray-900">{assignment.l2_officer_name ?? '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 mb-0.5">{t('sla')}</span>
            <span className="text-sm font-medium text-gray-900">
              {assignment.sla_days != null ? t('slaDays', { count: assignment.sla_days }) : '—'}
            </span>
          </div>
          <span className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </div>
      </button>

      {isExpanded && canManage && (
        <div id={panelId} className="border-t border-gray-100 bg-white px-8 py-4">
          <div className="flex items-center justify-end gap-4">
            <span className="text-[12px] text-gray-600 font-medium mr-auto">
              {assignment.auto_escalate ? t('autoEscalateOn') : t('autoEscalateOff')}
            </span>

            {assignment.active ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onDeactivate(assignment)}
                className="px-5 py-3 border border-red-200 rounded-lg text-[14px] font-medium text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" aria-hidden="true" />
                {t('deactivate')}
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onReactivate(assignment)}
                className="px-5 py-3 border border-gray-200 rounded-lg text-[14px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                {t('reactivate')}
              </button>
            )}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onEdit(assignment)}
              className="px-5 py-3 bg-[#16A34A] text-white rounded-lg text-[14px] font-bold hover:bg-[#15803d] flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              {t('edit')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
