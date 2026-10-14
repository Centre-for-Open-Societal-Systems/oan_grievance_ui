"use client";

import { SITextField } from "./SI-fields";
import type { SIFormProps } from "./SI-types";

/**
 * What an NGO or FPO is asked at sign-up: its registration number, which is
 * what the backend identifies it by (no Fayda ID). Everything else about the
 * organisation — legal name, address, contacts — is collected once, on the
 * onboarding screen shown at first sign-in, so is not asked here.
 */
export function OrganisationSignupForm({ values, setValue, errors, onFieldBlur }: SIFormProps) {
  return (
    <div className="grid grid-cols-1 gap-6 mt-6">
      <SITextField
        values={values}
        setValue={setValue}
        errors={errors}
        onFieldBlur={onFieldBlur}
        name="registrationNumber"
        label="Registration Number"
        required
        placeholder="Enter your organisation's registration number"
        hint="The registration or licence number issued to your organisation"
        maxLength={60}
      />
    </div>
  );
}
