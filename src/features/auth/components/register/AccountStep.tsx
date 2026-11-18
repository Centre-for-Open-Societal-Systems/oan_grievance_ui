'use client';

import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { errorIdFor, FieldError, INVALID_INPUT_STYLES } from '@/components/ui/FieldError';
import { PhoneField } from '@/components/ui/PhoneField';
import { Spinner } from '@/components/ui/Spinner';
import { PasswordRequirements } from '@/components/ui/PasswordRequirements';
import type { AccountField } from '@/lib/validation/fieldRules';
import { EMAIL_MAX_LENGTH, FULL_NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/validation/lengthLimits';
import type { FieldErrors } from '@/lib/validation/useFieldErrors';
import { AnimatedSelect } from '@/components/submitter-identity/SI-Dropdown';
import { onboardsOrganisationAfterSignIn, submitterTypeOptions } from '@/components/submitter-identity/fields';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { Lock, Mail, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export interface AccountStepProps {
  /** Chosen on this step because an organisation's account is named for the organisation, not a person. */
  submitterType: string;
  onSubmitterTypeChange: (value: string) => void;
  /** Shown under the type dropdown when none was chosen. */
  submitterTypeError?: string | null;
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  countryCode: string;
  setCountryCode: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  isLoading: boolean;
  /** A problem with the account as a whole (e.g. the email is already registered) — not tied to one field. */
  error: string | null;
  /** Per-field validation messages, shown directly under each field. */
  fieldErrors: FieldErrors<AccountField>;
  /** Called when a field loses focus, so the form can validate it. */
  onFieldBlur: (field: AccountField) => void;
  onSubmit: (event: React.FormEvent) => void;
}

const INPUT_CLASS =
  'w-full pl-10 pr-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm';

/** The submitter-type dropdown's id — focused when it is left empty. */
export const SUBMITTER_TYPE_FIELD_ID = 'register-submitter-type';

/** Ids the form uses to move focus to the first invalid field. */
export const ACCOUNT_FIELD_IDS: Record<AccountField, string> = {
  fullName: 'register-full-name',
  email: 'register-email',
  phoneNumber: 'register-phone',
  password: 'register-password',
  confirmPassword: 'register-confirm-password',
};

/** Step 1 of registration — account credentials. */
export function AccountStep({
  submitterType,
  onSubmitterTypeChange,
  submitterTypeError,
  fullName,
  setFullName,
  email,
  setEmail,
  countryCode,
  setCountryCode,
  phoneNumber,
  setPhoneNumber,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
  error,
  fieldErrors,
  onFieldBlur,
  onSubmit,
}: AccountStepProps) {
  const t = useTranslations('register');
  const tProfile = useTranslations('register.profile');
  const namesOrganisation = onboardsOrganisationAfterSignIn(submitterType);
  const nameLabel = namesOrganisation ? t('account.organisationNameLabel') : t('account.fullNameLabel');
  const namePlaceholder = namesOrganisation
    ? t('account.organisationNamePlaceholder')
    : t('account.fullNamePlaceholder');

  /** The aria/error wiring every field needs, in one place. */
  const a11y = (field: AccountField) => {
    const id = ACCOUNT_FIELD_IDS[field];
    const message = fieldErrors[field];
    return {
      id,
      'aria-invalid': message ? (true as const) : undefined,
      'aria-describedby': message ? errorIdFor(id) : undefined,
      onBlur: () => onFieldBlur(field),
    };
  };
  const fieldError = (field: AccountField) => {
    const message = fieldErrors[field];
    return message ? <FieldError id={errorIdFor(ACCOUNT_FIELD_IDS[field])}>{message}</FieldError> : null;
  };

  return (
    <>
      {error && <ErrorAlert className="mb-6">{error}</ErrorAlert>}

      {/* noValidate: the browser's own required/email bubbles would pre-empt the inline messages below. */}
      <form className="space-y-5 mb-8" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={SUBMITTER_TYPE_FIELD_ID} className="text-[14px] font-bold text-gray-700">
            {tProfile('submitterTypeLabel')} <RequiredMark />
          </label>
          <AnimatedSelect
            id={SUBMITTER_TYPE_FIELD_ID}
            options={submitterTypeOptions}
            placeholder={tProfile('submitterTypePlaceholder')}
            value={submitterType}
            onChange={onSubmitterTypeChange}
            invalid={!!submitterTypeError}
            clearable={false}
            describedBy={submitterTypeError ? errorIdFor(SUBMITTER_TYPE_FIELD_ID) : undefined}
          />
          {submitterTypeError && <FieldError id={errorIdFor(SUBMITTER_TYPE_FIELD_ID)}>{submitterTypeError}</FieldError>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={ACCOUNT_FIELD_IDS.fullName} className="text-[14px] font-bold text-gray-700 flex items-center">
            {nameLabel}
            <span className="ml-1">
              <RequiredMark />
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><User className="w-5 h-5" /></span>
            <input
              {...a11y('fullName')}
              type="text"
              autoComplete="name"
              maxLength={FULL_NAME_MAX_LENGTH}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={namePlaceholder}
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
          </div>
          {fieldError('fullName')}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={ACCOUNT_FIELD_IDS.email} className="text-[14px] font-bold text-gray-700 flex items-center">
            Email <span className="ml-1"><RequiredMark /></span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Mail className="w-5 h-5" /></span>
            <input
              {...a11y('email')}
              type="email"
              autoComplete="off"
              maxLength={EMAIL_MAX_LENGTH}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
          </div>
          {fieldError('email') ?? (
            <p className="text-[12px] text-gray-500 font-medium">
              You will sign in with this address.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={ACCOUNT_FIELD_IDS.phoneNumber} className="text-[14px] font-bold text-gray-700 flex items-center">
            Phone Number <span className="ml-1"><RequiredMark /></span>
          </label>
          <PhoneField
            id={ACCOUNT_FIELD_IDS.phoneNumber}
            countryCode={countryCode}
            setCountryCode={setCountryCode}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            placeholder="Enter phone number"
            invalid={!!fieldErrors.phoneNumber}
            describedBy={fieldErrors.phoneNumber ? errorIdFor(ACCOUNT_FIELD_IDS.phoneNumber) : undefined}
            onBlur={() => onFieldBlur('phoneNumber')}
          />
          {fieldError('phoneNumber')}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={ACCOUNT_FIELD_IDS.password} className="text-[14px] font-bold text-gray-700 flex items-center">
            Password <span className="ml-1"><RequiredMark /></span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock className="w-5 h-5" /></span>
            <input
              {...a11y('password')}
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
          </div>
          {fieldError('password')}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={ACCOUNT_FIELD_IDS.confirmPassword} className="text-[14px] font-bold text-gray-700 flex items-center">
            Confirm Password <span className="ml-1"><RequiredMark /></span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock className="w-5 h-5" /></span>
            <input
              {...a11y('confirmPassword')}
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`${INPUT_CLASS} ${INVALID_INPUT_STYLES}`}
            />
          </div>
          {fieldError('confirmPassword')}
        </div>

        <PasswordRequirements password={password} />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-4 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center mt-4 shadow-sm"
        >
          {isLoading ? <Spinner size="sm" /> : 'Continue'}
        </button>
      </form>

      <p className="text-center text-gray-600 font-medium">
        Already have an account?{' '}
        <Link href="/login" className="text-[#16A34A] hover:text-[#15803d] font-bold">
          Log in
        </Link>
      </p>
    </>
  );
}
