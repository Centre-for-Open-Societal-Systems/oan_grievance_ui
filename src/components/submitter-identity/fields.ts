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
