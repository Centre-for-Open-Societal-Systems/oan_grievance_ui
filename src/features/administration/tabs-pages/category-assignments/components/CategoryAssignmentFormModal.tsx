'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { fetchOfficers } from '@/features/user-management/api/officerApi';
import type { CategoryAssignment, CreateCategoryAssignmentPayload, UpdateCategoryAssignmentPayload } from './types';

export interface SelectOption {
  value: string;
  label: string;
}

export interface CategoryAssignmentFormModalProps {
  /** The assignment being edited; absent when adding one. */
  assignment?: CategoryAssignment | null;
  departments: SelectOption[];
  serviceCategories: SelectOption[];
  onCreate: (payload: CreateCategoryAssignmentPayload) => Promise<unknown>;
  onUpdate: (assignment: string, payload: UpdateCategoryAssignmentPayload) => Promise<unknown>;
  onClose: () => void;
}

const inputClass =
  'w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500 border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600';

/** L1/L2 officers in `department`, for this form's officer pickers — empty while `department` is blank. */
function useDepartmentOfficerOptions(department: string, level: 'L1' | 'L2'): SelectOption[] {
  // Only ever set from the fetch's own then/catch below, never reset directly for the
  // `!department` case — avoids a setState call in the effect's early-return branch (same
  // shape as `useWiredCategoryOptions`).
  const [fetchedOptions, setFetchedOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!department) return;
    const controller = new AbortController();
    fetchOfficers({ department, level, status: 'Active', page: 1, page_size: 100 }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setFetchedOptions(data.officers.map((officer) => ({ value: officer.name, label: officer.full_name })));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchedOptions([]);
      });
    return () => controller.abort();
  }, [department, level]);

  return department ? fetchedOptions : [];
}

export function CategoryAssignmentFormModal({
  assignment,
  departments,
  serviceCategories,
  onCreate,
  onUpdate,
  onClose,
}: CategoryAssignmentFormModalProps) {
  const t = useTranslations('admin.categoryAssignments');
  const isEdit = !!assignment;
  const titleId = useId();
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  const [serviceCategory, setServiceCategory] = useState(assignment?.service_category ?? '');
  const [department, setDepartment] = useState(assignment?.department ?? '');
  const [l1Officer, setL1Officer] = useState(assignment?.l1_officer ?? '');
  const [l2Officer, setL2Officer] = useState(assignment?.l2_officer ?? '');
  const [slaDays, setSlaDays] = useState(assignment?.sla_days != null ? String(assignment.sla_days) : '');
  const [autoEscalate, setAutoEscalate] = useState(assignment?.auto_escalate ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const l1Options = useDepartmentOfficerOptions(department, 'L1');
  const l2Options = useDepartmentOfficerOptions(department, 'L2');

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };
  const dialogRef = useModalA11y<HTMLDivElement>(true, handleClose);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) return setError(t('departmentRequired'));
    if (!isEdit && !serviceCategory) return setError(t('categoryRequired'));
    if (!l1Officer) return setError(t('l1Required'));
    const sla = Number(slaDays);
    if (!slaDays || !Number.isInteger(sla) || sla < 1) return setError(t('slaRequired'));

    setError(null);
    setIsSubmitting(true);
    try {
      if (isEdit) {
        await onUpdate(assignment.name, {
          department,
          l1_officer: l1Officer,
          l2_officer: l2Officer || null,
          sla_days: sla,
          auto_escalate: autoEscalate,
        });
      } else {
        await onCreate({
          service_category: serviceCategory,
          department,
          l1_officer: l1Officer,
          l2_officer: l2Officer || null,
          sla_days: sla,
          auto_escalate: autoEscalate,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 id={titleId} className="text-xl font-bold text-gray-900">
            {isEdit ? t('editTitle') : t('addTitle')}
          </h2>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50">
            <X size={20} />
          </button>
        </div>

        <form className="contents" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className="p-6 overflow-y-auto flex flex-col gap-4">
            {error && <ErrorAlert>{error}</ErrorAlert>}

            <div className="flex flex-col gap-2">
              <label htmlFor="ca-category" className="text-sm font-bold text-gray-900">
                {t('category')} <span className="text-red-500">*</span>
              </label>
              <select
                ref={firstFieldRef}
                id="ca-category"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                disabled={isEdit}
                className={inputClass}
              >
                <option value="">{t('selectCategory')}</option>
                {serviceCategories.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {isEdit && <p className="text-xs text-gray-400">{t('categoryFixed')}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="ca-department" className="text-sm font-bold text-gray-900">
                {t('department')} <span className="text-red-500">*</span>
              </label>
              <select
                id="ca-department"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setL1Officer('');
                  setL2Officer('');
                }}
                className={inputClass}
              >
                <option value="">{t('selectDepartment')}</option>
                {departments.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="ca-l1" className="text-sm font-bold text-gray-900">
                {t('l1Officer')} <span className="text-red-500">*</span>
              </label>
              <select
                id="ca-l1"
                value={l1Officer}
                onChange={(e) => setL1Officer(e.target.value)}
                disabled={!department}
                className={inputClass}
              >
                <option value="">{department ? t('selectOfficer') : t('selectDepartmentFirst')}</option>
                {l1Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="ca-l2" className="text-sm font-bold text-gray-900">
                {t('l2Officer')}
              </label>
              <select
                id="ca-l2"
                value={l2Officer}
                onChange={(e) => setL2Officer(e.target.value)}
                disabled={!department}
                className={inputClass}
              >
                <option value="">{t('none')}</option>
                {l2Options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="ca-sla" className="text-sm font-bold text-gray-900">
                  {t('slaDaysLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="ca-sla"
                  type="number"
                  min={1}
                  value={slaDays}
                  onChange={(e) => setSlaDays(e.target.value)}
                  placeholder={t('slaDaysPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2 justify-end pb-2.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEscalate}
                    onChange={(e) => setAutoEscalate(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#16A34A] focus:ring-[#16A34A]"
                  />
                  {t('autoEscalateLabel')}
                </label>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isEdit ? t('save') : t('add')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
