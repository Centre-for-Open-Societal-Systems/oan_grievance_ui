'use client';

import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { CountryCodeSelect, type CountryCodeOption } from '@/components/ui/CountryCodeSelect';
import { Spinner } from '@/components/ui/Spinner';
import { PasswordRequirements } from '@/components/ui/PasswordRequirements';
import { registerUser } from '@/features/auth/api/authApi';
import { CooperativeFPOForm } from '@/features/submit-grievance/components/SI-CooperativeFPOForm';
import { DevelopmentAgentForm } from '@/features/submit-grievance/components/SI-DevelopmentAgentForm';
import { AnimatedSelect } from '@/features/submit-grievance/components/SI-Dropdown';
import { IndividualFarmerForm } from '@/features/submit-grievance/components/SI-IndividualFarmerForm';
import { NGOForm } from '@/features/submit-grievance/components/SI-NGOForm';
import type { SIFormProps } from '@/features/submit-grievance/components/SI-types';
import { SI_FIELDS_BY_TYPE, submitterTypeOptions } from '@/features/submit-grievance/components/SubmitterIdentityCard';
import { WoredaKebeleForm } from '@/features/submit-grievance/components/SI-WoredaKebeleForm';
import { saveSubmitterProfile } from '@/lib/submitterProfile';
import { validatePassword } from '@/lib/validation/password';
import { PHONE_NUMBER_REGEX, stripLeadingZero, toDigitsOnly } from '@/lib/validation/phone';
import { Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useState, type ComponentType } from 'react';

const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+251', flagUrl: '/images/flags/et.svg', country: 'Ethiopia' },
];

// Full Name, Phone and Email are already collected on the account step above
// — the per-type identity forms below (reused as-is from Submit Grievance)
// skip these via `hiddenFields` rather than asking for them twice.
const ALREADY_COLLECTED_FIELDS = ['fullName', 'phoneNumber', 'email'];

const SUBMITTER_TYPE_FORMS: Record<string, ComponentType<SIFormProps>> = {
  individual: IndividualFarmerForm,
  cooperative: CooperativeFPOForm,
  ngo: NGOForm,
  woreda_kebele: WoredaKebeleForm,
  development_agent: DevelopmentAgentForm,
};

type RegisterStep = 'account' | 'profile' | 'success';

export function RegisterForm() {
  const [step, setStep] = useState<RegisterStep>('account');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+251');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 — Submitter identity, collected right after account creation so
  // Submit Grievance's own Step 1 can be pre-filled later (see submitterProfile.ts).
  const [submitterType, setSubmitterType] = useState('');
  const [identityValues, setIdentityValues] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
    setProfileError(null);
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!PHONE_NUMBER_REGEX.test(phoneNumber)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fullPhone = `${countryCode}${stripLeadingZero(phoneNumber)}`;
      await registerUser({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone_number: fullPhone,
      });
      setStep('profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = () => {
    if (!submitterType) {
      setProfileError('Select a submitter type to continue, or skip for now.');
      return;
    }
    const requiredFields = (SI_FIELDS_BY_TYPE[submitterType] || []).filter(
      (field) => field.required && !ALREADY_COLLECTED_FIELDS.includes(field.key)
    );
    const missing = requiredFields.some((field) => !identityValues[field.key]?.trim());
    if (missing) {
      setProfileError('Fill in all fields marked as required, or skip for now.');
      return;
    }
    setProfileError(null);
    // Submit Grievance's own Step 1 isn't pre-filterable to just the "new"
    // fields the way this page is — it always shows the full per-type form.
    // Folding the account-step fields in here too (under the same keys those
    // forms already use) means that page comes back genuinely pre-filled
    // rather than just missing a few fields, since name/phone aren't
    // otherwise available after login (the JWT only carries email + roles).
    saveSubmitterProfile(email, {
      submitterType,
      identityValues: {
        ...identityValues,
        fullName: fullName.trim(),
        phoneCode: countryCode,
        phoneNumber: stripLeadingZero(phoneNumber),
        email: email.trim(),
      },
    });
    setStep('success');
  };

  if (step === 'profile') {
    const IdentityForm = SUBMITTER_TYPE_FORMS[submitterType];
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">Account Created!</h3>
          <p className="text-gray-500 font-medium">
            One more thing — tell us how you&apos;ll be submitting grievances, so we don&apos;t ask again later.
          </p>
        </div>

        {profileError && <ErrorAlert>{profileError}</ErrorAlert>}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Submitter Type</label>
          <AnimatedSelect
            options={submitterTypeOptions}
            placeholder="Select Submitter Type"
            value={submitterType}
            onChange={handleSubmitterTypeChange}
          />
        </div>

        {IdentityForm && (
          <IdentityForm values={identityValues} setValue={setIdentityValue} hiddenFields={ALREADY_COLLECTED_FIELDS} />
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep('success')}
            className="text-[14px] font-bold text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleProfileSubmit}
            className="bg-[#16A34A] hover:bg-[#15803d] text-white py-3 px-6 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] shadow-sm"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-200 mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h3>
          <p className="text-gray-500 font-medium">Your account has been created successfully. You can now log in using your email and password.</p>
        </div>
        <Link
          href="/login"
          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-4 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] shadow-sm flex items-center justify-center"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && <ErrorAlert className="mb-6">{error}</ErrorAlert>}

      <form className="space-y-5 mb-8" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-gray-700 flex items-center">
            Full Name <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><User className="w-5 h-5" /></span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-gray-700 flex items-center">
            Email <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Mail className="w-5 h-5" /></span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm"
            />
          </div>
          <p className="text-[12px] text-gray-500 font-medium">
            You will sign in with this address.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-gray-700 flex items-center">
            Phone Number <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex shadow-sm">
            <CountryCodeSelect
              value={countryCode}
              onChange={(val) => setCountryCode(val)}
              options={COUNTRY_CODES}
              triggerClassName="flex items-center gap-2 px-3 py-3 bg-gray-50 border border-r-0 border-[#D1D5DB] rounded-l-xl text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] font-medium cursor-pointer hover:bg-gray-100 min-w-[90px]"
            />
            <input
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(toDigitsOnly(e.target.value))}
              maxLength={10}
              placeholder="Enter phone number"
              required
              className="w-full px-4 py-3 bg-white border border-[#D1D5DB] rounded-r-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-gray-700 flex items-center">
            Password <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock className="w-5 h-5" /></span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-gray-700 flex items-center">
            Confirm Password <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock className="w-5 h-5" /></span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#D1D5DB] rounded-xl text-[14px] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all placeholder:text-[#9CA3AF] font-medium shadow-sm"
            />
          </div>
        </div>

        <PasswordRequirements password={password} />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-4 rounded-2xl font-extrabold text-[15px] transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center mt-4 shadow-sm"
        >
          {isLoading ? <Spinner size="sm" /> : 'Create Account'}
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
