"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { composeResponseBody, splitResponseBody } from '@/lib/responseBody';
import {
  TEMPLATE_VARIABLES,
  type CreateResponseTemplatePayload,
  type ResponseTemplate,
  type UpdateResponseTemplatePayload,
} from './types';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ResponseTemplateFormModalProps {
  /** The template being edited; absent when adding one. */
  template?: ResponseTemplate | null;
  responseTypes: SelectOption[];
  departments: SelectOption[];
  serviceCategories: SelectOption[];
  onCreate: (payload: CreateResponseTemplatePayload) => Promise<unknown>;
  onUpdate: (template: string, payload: UpdateResponseTemplatePayload) => Promise<unknown>;
  onClose: () => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] disabled:bg-gray-50 disabled:text-gray-500';

/**
 * Add or edit a response template. The service stores one Jinja `body`; it is
 * edited here as Action taken + Resolution summary, the same two parts the
 * officer's response form fills from it (see `@/lib/responseBody`).
 */
export function ResponseTemplateFormModal({
  template,
  responseTypes,
  departments,
  serviceCategories,
  onCreate,
  onUpdate,
  onClose,
}: ResponseTemplateFormModalProps) {
  const t = useTranslations('admin.responseTemplates');
  const isEdit = !!template;
  const titleId = useId();
  const variablesId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const initialParts = template ? splitResponseBody(template.body) : { actionTaken: '', resolutionSummary: '' };
  const [code, setCode] = useState(template?.template ?? '');
  const [title, setTitle] = useState(template?.title ?? '');
  const [responseType, setResponseType] = useState(template?.response_type ?? '');
  const [department, setDepartment] = useState(template?.department ?? '');
  const [serviceCategory, setServiceCategory] = useState(template?.service_category ?? '');
  const [actionTaken, setActionTaken] = useState(initialParts.actionTaken);
  const [resolutionSummary, setResolutionSummary] = useState(initialParts.resolutionSummary);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so a parent passing an inline `onClose` doesn't re-run the
  // mount effect (and steal focus back to the first field) on every render.
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

  // A template's current type, department or category may since have been
  // deactivated and so be missing from the options; keep it selectable.
  const withCurrent = (options: SelectOption[], current: string) =>
    current && !options.some((o) => o.value === current) ? [...options, { value: current, label: current }] : options;

  const isValid =
    code.trim() !== '' &&
    title.trim() !== '' &&
    responseType !== '' &&
    actionTaken.trim() !== '' &&
    resolutionSummary.trim() !== '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setIsSaving(true);
    setError(null);
    const fields = {
      title: title.trim(),
      response_type: responseType,
      // An empty scope means "every department/category": null clears it on edit, omitted on create.
      department: department || null,
      service_category: serviceCategory || null,
      body: composeResponseBody({ actionTaken, resolutionSummary }),
      is_active: isActive,
    };
    try {
      if (template) {
        await onUpdate(template.template, fields);
      } else {
        await onCreate({
          ...fields,
          template: code.trim(),
          department: fields.department ?? undefined,
          service_category: fields.service_category ?? undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

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
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4" noValidate>
          {error && <ErrorAlert>{error}</ErrorAlert>}

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('code')} required hint={isEdit ? t('codeFixed') : undefined}>
              {(id, describedBy) => (
                <input
                  id={id}
                  ref={firstFieldRef}
                  aria-describedby={describedBy}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isEdit}
                  required
                  placeholder="TPL-RESOLVED-INPUTS"
                  className={inputClass}
                />
              )}
            </Field>
            <Field label={t('titleLabel')} required>
              {(id) => (
                <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
              )}
            </Field>
            <Field label={t('responseType')} required>
              {(id) => (
                <select id={id} value={responseType} onChange={(e) => setResponseType(e.target.value)} required className={inputClass}>
                  <option value="">{t('selectResponseType')}</option>
                  {withCurrent(responseTypes, responseType).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('department')}>
              {(id) => (
                <select id={id} value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
                  <option value="">{t('allDepartments')}</option>
                  {withCurrent(departments, department).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('serviceCategory')}>
              {(id) => (
                <select id={id} value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className={inputClass}>
                  <option value="">{t('allCategories')}</option>
                  {withCurrent(serviceCategories, serviceCategory).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[#16A34A]"
              />
              {t('active')}
            </label>
          </div>

          <p id={variablesId} className="text-xs text-gray-600 bg-[#F0F7FF] border border-[#D6E8FF] rounded-lg p-3">
            {t('variablesHint')}{' '}
            {TEMPLATE_VARIABLES.map((v) => (
              <code key={v} className="mr-1.5 text-[#1447E6]">{`{{ ${v} }}`}</code>
            ))}
          </p>

          <Field label={t('actionTaken')} required>
            {(id) => (
              <textarea
                id={id}
                rows={4}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                required
                aria-describedby={variablesId}
                className={`${inputClass} resize-y`}
              />
            )}
          </Field>
          <Field label={t('resolutionSummary')} required>
            {(id) => (
              <textarea
                id={id}
                rows={5}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                required
                aria-describedby={variablesId}
                className={`${inputClass} resize-y`}
              />
            )}
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!isValid} isLoading={isSaving}>
              {isEdit ? t('save') : t('add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children(id, hint ? hintId : undefined)}
      {hint && <p id={hintId} className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
