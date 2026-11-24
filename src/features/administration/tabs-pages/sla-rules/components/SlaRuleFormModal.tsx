"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import type { CreateSlaRulePayload, SlaRule, UpdateSlaRulePayload } from './types';

export interface SelectOption {
  value: string;
  label: string;
}

export interface GrievanceTypeOption extends SelectOption {
  serviceCategory: string;
}

export interface SlaRuleFormModalProps {
  /** The rule being edited; absent when adding one. */
  rule?: SlaRule | null;
  /** The category the list is filtered to; preselected when adding. */
  defaultCategory?: string;
  serviceCategories: SelectOption[];
  roleLevels: SelectOption[];
  grievanceTypes: GrievanceTypeOption[];
  onCreate: (payload: CreateSlaRulePayload) => Promise<unknown>;
  onUpdate: (ruleId: string, payload: UpdateSlaRulePayload) => Promise<unknown>;
  onClose: () => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:bg-gray-50 disabled:text-gray-500';

/** A window field is blank (all year) or a whole number; `NaN` marks one that is neither. */
const wholeOrNull = (text: string): number | null => (text.trim() === '' ? null : /^\d+$/.test(text.trim()) ? Number(text) : NaN);

/**
 * Add or edit an SLA rule. The category is fixed once the rule exists. The base rule
 * (no level, type, area or window) only has its days and urgency changed: the service
 * refuses to narrow it.
 */
export function SlaRuleFormModal({
  rule,
  defaultCategory = '',
  serviceCategories,
  roleLevels,
  grievanceTypes,
  onCreate,
  onUpdate,
  onClose,
}: SlaRuleFormModalProps) {
  const t = useTranslations('admin.slaRules');
  const isEdit = !!rule;
  const lockScope = !!rule?.is_base;
  const titleId = useId();
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [serviceCategory, setServiceCategory] = useState(rule?.service_category ?? defaultCategory);
  const [ruleLabel, setRuleLabel] = useState(rule?.rule_label ?? '');
  const [roleLevel, setRoleLevel] = useState(rule?.role_level ?? '');
  const [grievanceType, setGrievanceType] = useState(rule?.grievance_type ?? '');
  const [area, setArea] = useState(rule?.administrative_area ?? '');
  const [window, setWindow] = useState({
    startMonth: String(rule?.start_month ?? ''),
    startDay: String(rule?.start_day ?? ''),
    endMonth: String(rule?.end_month ?? ''),
    endDay: String(rule?.end_day ?? ''),
  });
  const [slaDays, setSlaDays] = useState(String(rule?.sla_days ?? ''));
  const [isUrgent, setIsUrgent] = useState(rule?.is_urgent ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so an inline `onClose` doesn't re-run the mount effect and steal focus.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const typeOptions = grievanceTypes.filter((type) => type.serviceCategory === serviceCategory);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const days = Number(slaDays);
    if (!serviceCategory) return setError(t('categoryRequired'));
    if (!/^[1-9]\d*$/.test(slaDays.trim()) || !Number.isFinite(days)) return setError(t('daysInvalid'));
    const [startMonth, startDay, endMonth, endDay] = [
      wholeOrNull(window.startMonth),
      wholeOrNull(window.startDay),
      wholeOrNull(window.endMonth),
      wholeOrNull(window.endDay),
    ];
    const parts = [startMonth, startDay, endMonth, endDay];
    if (parts.some((part) => Number.isNaN(part)) || (parts.some((p) => p === null) && parts.some((p) => p !== null))) {
      return setError(t('windowInvalid'));
    }

    // Blank scope is "every": null clears it on edit, omitted on create.
    const scope = {
      rule_label: ruleLabel.trim() || null,
      role_level: roleLevel || null,
      grievance_type: grievanceType || null,
      administrative_area: area.trim() || null,
      start_month: startMonth,
      start_day: startDay,
      end_month: endMonth,
      end_day: endDay,
    };
    setIsSaving(true);
    setError(null);
    try {
      if (rule) {
        await onUpdate(rule.name, lockScope ? { sla_days: days, is_urgent: isUrgent } : { ...scope, sla_days: days, is_urgent: isUrgent });
      } else {
        const defined = Object.fromEntries(Object.entries(scope).filter(([, value]) => value !== null));
        await onCreate({ ...defined, service_category: serviceCategory, sla_days: days, is_urgent: isUrgent });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const windowField = (key: keyof typeof window, label: string) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {label}
      <input
        inputMode="numeric"
        value={window[key]}
        disabled={lockScope}
        onChange={(e) => setWindow((prev) => ({ ...prev, [key]: e.target.value }))}
        className={inputClass}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {isEdit ? t('editTitle') : t('addTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4" noValidate>
          {error && <ErrorAlert>{error}</ErrorAlert>}
          {lockScope && <p className="text-xs text-gray-500">{t('baseRuleNote')}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
              {t('serviceCategory')} <span className="text-red-500">*</span>
              <select
                ref={firstFieldRef}
                value={serviceCategory}
                disabled={isEdit}
                onChange={(e) => {
                  setServiceCategory(e.target.value);
                  setGrievanceType('');
                }}
                className={inputClass}
              >
                <option value="">{t('selectCategory')}</option>
                {serviceCategories.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
              {t('ruleLabel')}
              <input value={ruleLabel} maxLength={140} disabled={lockScope} onChange={(e) => setRuleLabel(e.target.value)} className={inputClass} />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
              {t('roleLevel')}
              <select value={roleLevel} disabled={lockScope} onChange={(e) => setRoleLevel(e.target.value)} className={inputClass}>
                <option value="">{t('wholeCase')}</option>
                {roleLevels.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
              {t('grievanceType')}
              <select value={grievanceType} disabled={lockScope} onChange={(e) => setGrievanceType(e.target.value)} className={inputClass}>
                <option value="">{t('everyType')}</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800 sm:col-span-2">
              {t('administrativeArea')}
              <input value={area} disabled={lockScope} onChange={(e) => setArea(e.target.value)} placeholder={t('everywhere')} className={inputClass} />
            </label>
          </div>

          <fieldset className="flex flex-col gap-2" disabled={lockScope}>
            <legend className="text-sm font-medium text-gray-800 mb-1">{t('window')}</legend>
            <p className="text-xs text-gray-500">{t('windowHint')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {windowField('startMonth', t('startMonth'))}
              {windowField('startDay', t('startDay'))}
              {windowField('endMonth', t('endMonth'))}
              {windowField('endDay', t('endDay'))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-800">
              {t('slaDays')} <span className="text-red-500">*</span>
              <input type="number" min={1} value={slaDays} onChange={(e) => setSlaDays(e.target.value)} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800 pb-2.5">
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="h-4 w-4 accent-[#16A34A]" />
              {t('urgent')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 text-sm font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] disabled:opacity-50">
              {isEdit ? t('save') : t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
