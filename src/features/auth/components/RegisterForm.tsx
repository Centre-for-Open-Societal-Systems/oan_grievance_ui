'use client';

import { registerUser } from '@/features/auth/api/authApi';
import { getMissingRequiredFields, getFieldFormatErrors } from '@/components/submitter-identity/fields';
import { saveSubmitterProfile } from '@/lib/submitterProfile';
import { validatePassword } from '@/lib/validation/password';
import { PHONE_NUMBER_REGEX, stripLeadingZero } from '@/lib/validation/phone';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AccountStep } from './register/AccountStep';
import { ProfileStep } from './register/ProfileStep';
import { SuccessStep } from './register/SuccessStep';

// Full Name, Phone and Email are already collected on the account step above
// — the per-type identity forms below (reused as-is from Submit Grievance)
// skip these via `hiddenFields` rather than asking for them twice.
//
// Development Agent is the one type this doesn't hold for: its "Contact
// Mobile"/"Contact Email ID" fields are the case's follow-up contact for the
// farmer being filed on behalf of ("The farmer remains the primary
// grievance owner" — see SI-DevelopmentAgentForm.tsx), not the agent's own.
// Hiding them and silently prefilling the registrant's own phone/email under
// those keys would record the agent's contact as if it were the farmer's.
const ALREADY_COLLECTED_FIELDS_BY_TYPE: Record<string, string[]> = {
  individual: ['fullName', 'phoneNumber', 'email'],
  cooperative: ['fullName', 'phoneNumber', 'email'],
  ngo: ['fullName', 'phoneNumber', 'email'],
  woreda_kebele: ['fullName', 'phoneNumber', 'email'],
  development_agent: ['fullName'],
};

type RegisterStep = 'account' | 'profile' | 'success';

/**
 * Three-step registration: account credentials, then submitter identity
 * (so Submit Grievance's own Step 1 can be pre-filled later — see
 * submitterProfile.ts), then confirmation. This component owns the flow's
 * state and step transitions; each step's own form markup lives in
 * ./register/*Step.tsx.
 */
export function RegisterForm() {
  const t = useTranslations('register.profile');
  const [step, setStep] = useState<RegisterStep>('account');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+251');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submitterType, setSubmitterType] = useState('');
  const [identityValues, setIdentityValues] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  // Lifted out of ProfileStep (rather than local state there) specifically
  // so switching submitter type can reset it here alongside identityValues —
  // consent given for one national-ID field (e.g. Fayda ID) must not carry
  // over silently to a different one after a mid-step type change (e.g.
  // Individual -> Cooperative swaps in representativeFaydaId).
  const [consentChecked, setConsentChecked] = useState(false);

  const handleSubmitterTypeChange = (value: string) => {
    setSubmitterType(value);
    setIdentityValues({});
    setProfileError(null);
    setConsentChecked(false);
  };

  const setIdentityValue = (key: string, value: string) => {
    setIdentityValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAccountSubmit = async (event: React.FormEvent) => {
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
      setProfileError('Select a submitter type to continue.');
      return;
    }
    const hiddenFields = ALREADY_COLLECTED_FIELDS_BY_TYPE[submitterType] ?? [];
    const missing = getMissingRequiredFields(submitterType, identityValues, hiddenFields);
    if (missing.length > 0) {
      setProfileError(t('missingFields', { count: missing.length, fields: missing.join(', ') }));
      return;
    }
    const invalid = getFieldFormatErrors(submitterType, identityValues, hiddenFields);
    if (invalid.length > 0) {
      setProfileError(t('invalidFields', { count: invalid.length, fields: invalid.join(', ') }));
      return;
    }
    setProfileError(null);
    // Submit Grievance's own Step 1 isn't pre-filterable to just the "new"
    // fields the way this page is — it always shows the full per-type form.
    // Folding the account-step fields in here too (under the same keys those
    // forms already use) means that page comes back genuinely pre-filled
    // rather than just missing a few fields, since name/phone aren't
    // otherwise available after login (the JWT only carries email + roles).
    // Only for the fields this type actually treats as "the registrant's
    // own" — see ALREADY_COLLECTED_FIELDS_BY_TYPE.
    saveSubmitterProfile(email, {
      submitterType,
      identityValues: {
        ...identityValues,
        ...(hiddenFields.includes('fullName') ? { fullName: fullName.trim() } : {}),
        ...(hiddenFields.includes('phoneNumber')
          ? { phoneCode: countryCode, phoneNumber: stripLeadingZero(phoneNumber) }
          : {}),
        ...(hiddenFields.includes('email') ? { email: email.trim() } : {}),
      },
    });
    setStep('success');
  };

  if (step === 'profile') {
    return (
      <ProfileStep
        submitterType={submitterType}
        onSubmitterTypeChange={handleSubmitterTypeChange}
        identityValues={identityValues}
        setIdentityValue={setIdentityValue}
        hiddenFields={ALREADY_COLLECTED_FIELDS_BY_TYPE[submitterType] ?? []}
        profileError={profileError}
        consentChecked={consentChecked}
        onConsentChange={setConsentChecked}
        onSubmit={handleProfileSubmit}
      />
    );
  }

  if (step === 'success') {
    return <SuccessStep />;
  }

  return (
    <AccountStep
      fullName={fullName}
      setFullName={setFullName}
      email={email}
      setEmail={setEmail}
      countryCode={countryCode}
      setCountryCode={setCountryCode}
      phoneNumber={phoneNumber}
      setPhoneNumber={setPhoneNumber}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      isLoading={isLoading}
      error={error}
      onSubmit={handleAccountSubmit}
    />
  );
}
