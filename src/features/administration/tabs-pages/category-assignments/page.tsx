'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useIsReviewOfficer } from '@/features/auth/hooks/useIsReviewOfficer';
import { useGrievanceOptions } from '@/features/metadata';
import {
  createCategoryAssignment,
  deactivateCategoryAssignment,
  fetchCategoryAssignments,
  updateCategoryAssignment,
} from './api/categoryAssignmentsApi';
import { CategoryAssignmentRow } from './components/CategoryAssignmentRow';
import { CategoryAssignmentFormModal } from './components/CategoryAssignmentFormModal';
import type { CategoryAssignment, CreateCategoryAssignmentPayload, UpdateCategoryAssignmentPayload } from './components/types';

const PAGE_SIZE = 20;

/** `null` = form closed, `'new'` = adding, an assignment = editing it. */
type FormState = null | 'new' | CategoryAssignment;

export default function CategoryAssignmentsPage() {
  const t = useTranslations('admin.categoryAssignments');
  // A Review Officer can view this tab (route access — see rbac.ts) but the backend
  // refuses every create/edit/deactivate call for it, so those controls are hidden
  // here rather than left to fail with a 403 on click — same pattern used across the
  // other admin screens. There is no narrower "Category Assignment Admin" role to
  // gate against yet: STG-433 was marked Done but never actually shipped (its merged
  // diff has no role, and the write endpoints still gate on the generic admin list) —
  // see that ticket's own comment thread. Once it lands, swap this for the real check.
  const canManage = !useIsReviewOfficer();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [assignments, setAssignments] = useState<CategoryAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAssignment, setBusyAssignment] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>(null);

  const { data: grievanceOptions } = useGrievanceOptions();

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategoryAssignments(
      { page_size: PAGE_SIZE, department: departmentFilter || undefined },
      { signal: controller.signal }
    )
      .then((data) => {
        setAssignments(data?.assignments ?? []);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error && err.message ? err.message : t('loadFailed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [departmentFilter, reloadKey, t]);

  // `department_name`, not `department_id` — matches what the rest of this feature (officer
  // creation, officer-list filtering via `fetchOfficers`) already sends as `department`, so
  // the officer pickers below and the assignment payload stay scoped to the same value.
  const departments = useMemo<Array<{ value: string; label: string }>>(
    () => (grievanceOptions?.departments ?? []).map((d) => ({ value: d.department_name, label: d.department_name })),
    [grievanceOptions]
  );
  const serviceCategories = useMemo<Array<{ value: string; label: string }>>(
    () => (grievanceOptions?.service_categories ?? []).map((c) => ({ value: c.category_name, label: c.category_name })),
    [grievanceOptions]
  );
  const departmentName = (id: string | null | undefined) =>
    id ? departments.find((d) => d.value === id)?.label ?? id : null;

  const filteredAssignments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return assignments;
    return assignments.filter((a) =>
      [a.service_category, a.department, a.l1_officer_name, a.l2_officer_name].some((field) =>
        (field || '').toLowerCase().includes(search)
      )
    );
  }, [assignments, searchTerm]);

  const handleCreate = async (payload: CreateCategoryAssignmentPayload) => {
    await createCategoryAssignment(payload);
    reload();
  };

  const handleUpdate = async (assignment: string, payload: UpdateCategoryAssignmentPayload) => {
    await updateCategoryAssignment(assignment, payload);
    reload();
  };

  const runRowAction = async (assignment: CategoryAssignment, action: () => Promise<unknown>) => {
    setBusyAssignment(assignment.name);
    setActionError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : t('saveFailed'));
    } finally {
      setBusyAssignment(null);
    }
  };

  const handleDeactivate = (assignment: CategoryAssignment) =>
    void runRowAction(assignment, () => deactivateCategoryAssignment(assignment.name));

  const handleReactivate = (assignment: CategoryAssignment) =>
    void runRowAction(assignment, () => updateCategoryAssignment(assignment.name, { active: true }));

  return (
    <div className="w-full flex flex-col h-[calc(100vh-230px)] bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 shrink-0">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-4">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label={t('department')}
            className="mt-5 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
          >
            <option value="">{t('allDepartments')}</option>
            {departments.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {canManage && (
            <button
              type="button"
              onClick={() => setForm('new')}
              className="mt-5 px-4 py-2.5 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803d] transition-colors"
            >
              {t('addButton')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="p-6">
          {actionError && <ErrorAlert className="mb-4">{actionError}</ErrorAlert>}

          {isLoading ? (
            <p className="text-sm text-gray-500" role="status">{t('loading')}</p>
          ) : error ? (
            <ErrorAlert>
              {error}{' '}
              <button type="button" onClick={reload} className="underline font-semibold">
                {t('retry')}
              </button>
            </ErrorAlert>
          ) : filteredAssignments.length === 0 ? (
            <p className="text-sm text-gray-500">{t('empty')}</p>
          ) : (
            <div className="flex flex-col">
              {filteredAssignments.map((assignment, index) => (
                <CategoryAssignmentRow
                  key={assignment.name}
                  assignment={assignment}
                  departmentName={departmentName(assignment.department)}
                  isLast={index === filteredAssignments.length - 1}
                  isBusy={busyAssignment === assignment.name}
                  canManage={canManage}
                  onEdit={setForm}
                  onDeactivate={handleDeactivate}
                  onReactivate={handleReactivate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {form !== null && (
        <CategoryAssignmentFormModal
          assignment={form === 'new' ? null : form}
          departments={departments}
          serviceCategories={serviceCategories}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
