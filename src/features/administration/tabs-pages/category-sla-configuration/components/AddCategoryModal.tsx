"use client";

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Field, FormShell, inputClass } from './FormShell';
import { describeSaveError } from './apiErrorMessage';
import { suggestTicketCode } from './ticketCode';
import type { CreateServiceCategoryPayload } from './taxonomyTypes';

export interface DepartmentChoice {
  department_id: string;
  department_name: string;
}

export interface AddCategoryModalProps {
  /** Ticket codes already in use, so the generated one avoids them. */
  takenCodes: readonly string[];
  /** Creates the category along with its SLA configuration. */
  onCreate: (payload: CreateServiceCategoryPayload) => Promise<unknown>;
  onClose: () => void;
}

interface ToggleProps {
  label: string;
  stateLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, stateLabel, checked, onChange }: ToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <label className="flex items-center gap-2 cursor-pointer w-max">
        <span className="relative">
          <input
            type="checkbox"
            role="switch"
            aria-label={label}
            className="sr-only peer"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="block w-9 h-5 rounded-full bg-gray-300 transition-colors peer-checked:bg-[#16A34A] peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-600 peer-focus-visible:ring-offset-2" />
          <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
        </span>
        <span className="text-xs text-gray-500">{stateLabel}</span>
      </label>
    </div>
  );
}

/**
 * Add Category: name and SLA configuration fields.
 * Generates a 3-character ticket code from the name and establishes
 * the category and its resolution SLA atomically.
 */
export function AddCategoryModal({ takenCodes, onCreate, onClose }: AddCategoryModalProps) {
  const t = useTranslations('admin.taxonomy');
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [slaDays, setSlaDays] = useState('');
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [notifyOnBreach, setNotifyOnBreach] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slaDays?: string }>({});

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const schema = z.object({
      name: z.string().trim().min(1, t('nameRequired')).max(140, t('nameTooLong')),
      slaDays: z
        .string()
        .trim()
        .refine((v) => /^[1-9]\d*$/.test(v), t('slaDaysInvalid')),
    });
    const parsed = schema.safeParse({ name, slaDays });
    if (!parsed.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof fieldErrors;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      if (errors.name) nameRef.current?.focus();
      return;
    }

    const code = suggestTicketCode(parsed.data.name, takenCodes);
    if (!code) {
      setError(t('noCodeAvailable'));
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({
        category_name: parsed.data.name,
        code,
        sla_days: parseInt(parsed.data.slaDays, 10),
        auto_escalate: autoEscalate,
        notify_on_breach: notifyOnBreach,
      });
      onClose();
    } catch (err) {
      setError(
        describeSaveError(err, {
          auth: t('authError'),
          forbidden: t('forbiddenError'),
          connection: t('connectionError'),
          fallback: t('saveFailed'),
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormShell title={t('addCategoryTitle')} closeLabel={t('close')} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5" noValidate>
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <Field label={t('categoryName')} required error={fieldErrors.name}>
            {(id, describedBy) => (
              <input
                id={id}
                ref={nameRef}
                value={name}
                placeholder={t('categoryNamePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                }}
                aria-describedby={describedBy}
                aria-invalid={!!fieldErrors.name}
                className={inputClass(!!fieldErrors.name)}
              />
            )}
          </Field>

          <Field label={t('slaDays')} required error={fieldErrors.slaDays}>
            {(id, describedBy) => (
              <input
                id={id}
                inputMode="numeric"
                value={slaDays}
                placeholder={t('slaDaysPlaceholder')}
                onChange={(e) => {
                  setSlaDays(e.target.value);
                  if (fieldErrors.slaDays) setFieldErrors((p) => ({ ...p, slaDays: undefined }));
                }}
                aria-describedby={describedBy}
                aria-invalid={!!fieldErrors.slaDays}
                className={inputClass(!!fieldErrors.slaDays)}
              />
            )}
          </Field>

          <div className="flex flex-wrap gap-x-10 gap-y-4 sm:col-span-2">
            <Toggle
              label={t('autoEscalate')}
              stateLabel={autoEscalate ? t('active') : t('inactive')}
              checked={autoEscalate}
              onChange={setAutoEscalate}
            />
            <Toggle
              label={t('notifyOnEscalation')}
              stateLabel={notifyOnBreach ? t('active') : t('inactive')}
              checked={notifyOnBreach}
              onChange={setNotifyOnBreach}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} className="text-gray-700">{t('cancel')}</Button>
          <Button type="submit" isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            {t('saveShort')}
          </Button>
        </div>
      </form>
    </FormShell>
  );
}
