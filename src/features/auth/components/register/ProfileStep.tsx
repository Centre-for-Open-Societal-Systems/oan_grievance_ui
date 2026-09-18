'use client';

import { type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ShieldCheck } from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { AnimatedSelect } from '@/components/submitter-identity/SI-Dropdown';
import { CooperativeFPOForm } from '@/components/submitter-identity/SI-CooperativeFPOForm';
import { DevelopmentAgentForm } from '@/components/submitter-identity/SI-DevelopmentAgentForm';
import { IndividualFarmerForm } from '@/components/submitter-identity/SI-IndividualFarmerForm';
import { NGOForm } from '@/components/submitter-identity/SI-NGOForm';
import { WoredaKebeleForm } from '@/components/submitter-identity/SI-WoredaKebeleForm';
import type { SIFormProps } from '@/components/submitter-identity/SI-types';
import { submitterTypeOptions } from '@/components/submitter-identity/fields';

const SUBMITTER_TYPE_FORMS: Record<string, ComponentType<SIFormProps>> = {
  individual: IndividualFarmerForm,
  cooperative: CooperativeFPOForm,
  ngo: NGOForm,
  woreda_kebele: WoredaKebeleForm,
  development_agent: DevelopmentAgentForm,
};

export interface ProfileStepProps {
  submitterType: string;
  onSubmitterTypeChange: (value: string) => void;
  identityValues: Record<string, string>;
  setIdentityValue: (key: string, value: string) => void;
  hiddenFields: string[];
  profileError: string | null;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  onSubmit: () => void;
}

/**
 * Step 2 of registration — submitter identity, including the consent
 * gate for collecting a national ID number. The ID asked for here (Fayda ID
 * or a per-type variant) is government identity data, so continuing past
 * this step requires an explicit checked box, not just filling the fields.
 *
 * `consentChecked` is owned by the parent (RegisterForm), not local state
 * here — so that switching submitter type can reset it alongside
 * identityValues. Consent given for one national-ID field must not silently
 * carry over to a different one after a mid-step type change.
 */
export function ProfileStep({
  submitterType,
  onSubmitterTypeChange,
  identityValues,
  setIdentityValue,
  hiddenFields,
  profileError,
  consentChecked,
  onConsentChange,
  onSubmit,
}: ProfileStepProps) {
  const IdentityForm = SUBMITTER_TYPE_FORMS[submitterType];
  const collectsNationalId = Boolean(IdentityForm);
  const t = useTranslations('register.profile');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-gray-900">{t('accountCreatedTitle')}</h3>
        <p className="text-gray-500 font-medium">{t('subtitle')}</p>
      </div>

      {profileError && <ErrorAlert id="register-profile-error">{profileError}</ErrorAlert>}

      <div>
        <label htmlFor="register-submitter-type" className="block text-sm font-semibold text-gray-800 mb-2">{t('submitterTypeLabel')}</label>
        <AnimatedSelect
          id="register-submitter-type"
          options={submitterTypeOptions}
          placeholder={t('submitterTypePlaceholder')}
          value={submitterType}
          onChange={onSubmitterTypeChange}
          invalid={!!profileError}
          describedBy={profileError ? 'register-profile-error' : undefined}
        />
      </div>

      {IdentityForm && (
        <IdentityForm values={identityValues} setValue={setIdentityValue} hiddenFields={hiddenFields} />
      )}

      {collectsNationalId && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-3">
            <p className="text-[13px] text-blue-800 leading-relaxed">{t('consentNotice')}</p>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-300 ${consentChecked
                    ? 'bg-[#16A34A] border-2 border-[#16A34A]'
                    : 'border-2 border-gray-300 bg-white group-hover:border-[#16A34A]'
                    }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 text-white transition-all duration-300 ${consentChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                    strokeWidth={4}
                  />
                </div>
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => onConsentChange(e.target.checked)}
                  className="sr-only"
                  aria-label={t('consentCheckboxLabel')}
                />
              </div>
              <span className="text-[13px] font-medium text-gray-700 leading-relaxed select-none">
                {t('consentCheckboxLabel')}
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={collectsNationalId && !consentChecked}
          className="bg-[#16A34A] hover:bg-[#15803d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] shadow-sm"
        >
          {t('continue')}
        </button>
      </div>
    </div>
  );
}
