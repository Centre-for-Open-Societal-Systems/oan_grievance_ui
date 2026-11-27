"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Field, FormShell, inputClass } from '../../category-sla-configuration/components/FormShell';
import { SlaAreaSelect } from './SlaAreaSelect';
import type { CreateSlaRulePayload, SlaRule, UpdateSlaRuleClusterPayload } from './types';

export interface SelectOption {
  value: string;
  label: string;
}

export interface GrievanceTypeOption extends SelectOption {
  serviceCategory: string;
}

export interface SlaRuleFormModalProps {
  /** The cluster being edited (rules that differ only by grievance type); absent when adding. */
  rules?: SlaRule[] | null;
  /** The category the list is filtered to; preselected when adding. */
  defaultCategory?: string;
  serviceCategories: SelectOption[];
  roleLevels: SelectOption[];
  grievanceTypes: GrievanceTypeOption[];
  onCreate: (payload: CreateSlaRulePayload) => Promise<unknown>;
  /** `grievance_types` is the cluster's new set of types; empty means every type. */
  onUpdate: (rules: SlaRule[], payload: UpdateSlaRuleClusterPayload & { grievance_types: string[] }) => Promise<unknown>;
  onClose: () => void;
}

/** A window field is blank (all year) or a whole number; `NaN` marks one that is neither. */
const wholeOrNull = (text: string): number | null => (text.trim() === '' ? null : /^\d+$/.test(text.trim()) ? Number(text) : NaN);

/**
 * Add or edit an SLA rule. The category is fixed once the rule exists. The base rule
 * (no level, type, area or window) only has its days and urgency changed: the service
 * refuses to narrow it.
 */
export function SlaRuleFormModal({
  rules,
  defaultCategory = '',
  serviceCategories,
  roleLevels,
  grievanceTypes,
  onCreate,
  onUpdate,
  onClose,
}: SlaRuleFormModalProps) {
  const t = useTranslations('admin.slaRules');
  const rule = rules?.[0] ?? null;
  const isEdit = !!rule;
  const lockScope = !!rule?.is_base;
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [serviceCategory, setServiceCategory] = useState(rule?.service_category ?? defaultCategory);
  const [ruleLabel, setRuleLabel] = useState(rule?.rule_label ?? '');
  const [roleLevel, setRoleLevel] = useState(rule?.role_level ?? '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    () => (rules ?? []).flatMap((r) => (r.grievance_type ? [r.grievance_type] : []))
  );
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

  useEffect(() => {
    firstFieldRef.current?.focus();
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
      administrative_area: area || null,
      start_month: startMonth,
      start_day: startDay,
      end_month: endMonth,
      end_day: endDay,
    };
    setIsSaving(true);
    setError(null);
    try {
      if (rules && rule) {
        await onUpdate(
          rules,
          lockScope
            ? { sla_days: days, is_urgent: isUrgent, grievance_types: [] }
            : { ...scope, sla_days: days, is_urgent: isUrgent, grievance_types: selectedTypes }
        );
      } else {
        const defined = Object.fromEntries(Object.entries(scope).filter(([, value]) => value !== null));
        await onCreate({
          ...defined,
          ...(selectedTypes.length > 0 && { grievance_types: selectedTypes }),
          service_category: serviceCategory,
          sla_days: days,
          is_urgent: isUrgent,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const windowField = (key: keyof typeof window, label: string) => (
    <Field label={label}>
      {(id) => (
        <input
          id={id}
          inputMode="numeric"
          value={window[key]}
          disabled={lockScope}
          onChange={(e) => setWindow((prev) => ({ ...prev, [key]: e.target.value }))}
          className={inputClass()}
        />
      )}
    </Field>
  );

  return (
    <FormShell title={isEdit ? t('editTitle') : t('addTitle')} closeLabel={t('close')} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6" noValidate>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        {lockScope && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('baseRuleNote')}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <Field label={t('serviceCategory')} required>
            {(id) => (
              <select
                id={id}
                ref={firstFieldRef}
                value={serviceCategory}
                disabled={isEdit}
                onChange={(e) => {
                  setServiceCategory(e.target.value);
                  setSelectedTypes([]);
                }}
                className={inputClass()}
              >
                <option value="">{t('selectCategory')}</option>
                {serviceCategories.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label={t('ruleLabel')}>
            {(id) => (
              <input id={id} value={ruleLabel} maxLength={140} disabled={lockScope} onChange={(e) => setRuleLabel(e.target.value)} className={inputClass()} />
            )}
          </Field>

          <Field label={t('roleLevel')}>
            {(id) => (
              <select id={id} value={roleLevel} disabled={lockScope} onChange={(e) => setRoleLevel(e.target.value)} className={inputClass()}>
                <option value="">{t('wholeCase')}</option>
                {roleLevels.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}
          </Field>

          <fieldset className="flex flex-col gap-1.5 sm:col-span-2" disabled={lockScope}>
            <legend className="text-sm font-semibold text-gray-700 mb-1">{t('grievanceTypes')}</legend>
            <p className="text-xs text-gray-500">{t('grievanceTypesHint')}</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-2 flex flex-col gap-1">
              {typeOptions.length === 0 ? (
                <span className="text-sm text-gray-500 px-1">{t('noTypes')}</span>
              ) : (
                typeOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-gray-800 px-1">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(option.value)}
                      onChange={(e) =>
                        setSelectedTypes((prev) => (e.target.checked ? [...prev, option.value] : prev.filter((v) => v !== option.value)))
                      }
                      className="h-4 w-4 accent-[#16A34A]"
                    />
                    {option.label}
                  </label>
                ))
              )}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-gray-700">{t('administrativeArea')}</span>
            <p className="text-xs text-gray-500">{t('areaHint')}</p>
            <SlaAreaSelect value={area} disabled={lockScope} onChange={setArea} className={inputClass()} />
          </div>
        </div>

        <fieldset className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 flex flex-col gap-3" disabled={lockScope}>
          <legend className="px-1 text-sm font-semibold text-gray-700">{t('window')}</legend>
          <p className="text-xs text-gray-500">{t('windowHint')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {windowField('startMonth', t('startMonth'))}
            {windowField('startDay', t('startDay'))}
            {windowField('endMonth', t('endMonth'))}
            {windowField('endDay', t('endDay'))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 items-end">
          <Field label={t('slaDays')} required>
            {(id) => (
              <input id={id} type="number" min={1} value={slaDays} onChange={(e) => setSlaDays(e.target.value)} className={inputClass()} />
            )}
          </Field>
          <label className="flex items-center gap-2 h-[42px] text-sm font-semibold text-gray-700 cursor-pointer w-max">
            <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="h-4 w-4 accent-[#16A34A]" />
            {t('urgent')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} className="text-gray-700">{t('cancel')}</Button>
          <Button type="submit" isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            {isEdit ? t('save') : t('add')}
          </Button>
        </div>
      </form>
    </FormShell>
  );
}
