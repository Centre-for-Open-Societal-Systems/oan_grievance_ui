// Field metadata shared by every consumer of the submitter-identity forms —
// RegisterForm.tsx (features/auth) and SubmitterIdentityCard.tsx /
// ReviewAndSubmitCard.tsx (features/submit-grievance) all need the same
// per-type field list and dropdown options. Lives here, not inside any one
// UI component, precisely so it has one owner neither feature reaches into
// the other's internals to get at.

import { FIELDS as INDIVIDUAL_FIELDS } from "./SI-IndividualFarmerForm";
import { FIELDS as COOPERATIVE_FIELDS } from "./SI-CooperativeFPOForm";
import { FIELDS as NGO_FIELDS } from "./SI-NGOForm";
import { FIELDS as WOREDA_KEBELE_FIELDS } from "./SI-WoredaKebeleForm";
import { FIELDS as DEVELOPMENT_AGENT_FIELDS } from "./SI-DevelopmentAgentForm";
import type { SIFieldMeta } from "./SI-types";
import { isValidPhoneNumber } from "@/lib/validation/phone";

/** Which field set applies to each submitter type. */
export const SI_FIELDS_BY_TYPE: Record<string, SIFieldMeta[]> = {
  individual: INDIVIDUAL_FIELDS,
  cooperative: COOPERATIVE_FIELDS,
  ngo: NGO_FIELDS,
  woreda_kebele: WOREDA_KEBELE_FIELDS,
  development_agent: DEVELOPMENT_AGENT_FIELDS,
};

export const submitterTypeOptions = [
  { value: "individual", label: "Individual Farmer" },
  { value: "cooperative", label: "Cooperative / FPO" },
  { value: "ngo", label: "NGO" },
  { value: "woreda_kebele", label: "Woreda/Kebele Body" },
  { value: "development_agent", label: "Development Agent (on behalf)" },
];

export const submissionChannelOptions = [
  { value: "web", label: "Web Portal" },
  { value: "mobile", label: "Mobile App" },
  { value: "ivr", label: "IVR / Call Centre" },
  { value: "field_officer", label: "Field Officer Assisted" },
];

/**
 * Labels of the required `SI_FIELDS_BY_TYPE[type]` fields `values` is still
 * missing, skipping anything in `hiddenFields`. The one place this check is
 * made — RegisterForm.tsx (which excludes the fields it already collected on
 * its account step) and SubmitterIdentityCard.tsx (which excludes nothing)
 * both call this instead of each keeping their own copy of "empty" ("" or
 * whitespace-only). A field considered required-and-missing by one but not
 * the other would let registration accept a submitter profile that Submit
 * Grievance's own identity step would reject, or vice versa.
 */
export function getMissingRequiredFields(
  submitterType: string,
  values: Record<string, string>,
  hiddenFields: readonly string[] = []
): string[] {
  return (SI_FIELDS_BY_TYPE[submitterType] ?? [])
    .filter((field) => field.required && !hiddenFields.includes(field.key) && !values[field.key]?.trim())
    .map((field) => field.label);
}

// Mirrors oan_grievance_service/services/identity.py's FAYDA_PATTERN /
// REGISTRATION_PATTERN exactly (same 6-30 / 3-60 char, alphanumeric-plus-
// separator shape) — the backend enforces these once a grievance is
// actually filed (grievance.submit isn't wired up on this branch yet, but
// the fields collected here go straight into that same call once it is).
// A format the backend will reject is worth catching here first, rather
// than as a confusing rejection once that wiring lands.
const FAYDA_PATTERN = /^(?=.{6,30}$)[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const REGISTRATION_PATTERN = /^(?=.{3,60}$)[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*$/;
// Practical, not RFC-exhaustive — same bar the browser's own
// type="email" validation already sets, just enforced explicitly since
// these fields render as type="text" (see SI-*Form.tsx).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Exported so ReviewAndSubmitCard.tsx's masked-display logic checks the same
 * field set this module validates as a Fayda ID, rather than keeping its own
 * copy that could drift from this one.
 */
export const ID_FIELD_KEYS = ["faydaId", "representativeFaydaId", "officialFaydaId"];

/**
 * Labels of fields whose *value* (not presence — see `getMissingRequiredFields`
 * for that) doesn't match what the backend will eventually require, paired
 * with why. Only checks fields that have a value; an empty optional field is
 * `getMissingRequiredFields`'s concern, not this one's.
 */
export function getFieldFormatErrors(
  submitterType: string,
  values: Record<string, string>,
  hiddenFields: readonly string[] = []
): string[] {
  const errors: string[] = [];
  for (const field of SI_FIELDS_BY_TYPE[submitterType] ?? []) {
    if (hiddenFields.includes(field.key)) continue;
    const value = values[field.key]?.trim();
    if (!value) continue;

    if (ID_FIELD_KEYS.includes(field.key) && !FAYDA_PATTERN.test(value)) {
      errors.push(`${field.label} (6-30 letters/numbers, hyphens allowed between)`);
    } else if (field.key === "registrationNumber" && !REGISTRATION_PATTERN.test(value)) {
      errors.push(`${field.label} (3-60 letters/numbers, hyphens or slashes allowed between)`);
    } else if (field.key === "email" && !EMAIL_PATTERN.test(value)) {
      errors.push(`${field.label} (not a valid email address)`);
    } else if (field.key === "phoneNumber" && !isValidPhoneNumber(value)) {
      errors.push(`${field.label} (10 digits, e.g. 0912345678)`);
    }
  }
  return errors;
}
