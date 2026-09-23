import { formatToE164 } from "@/lib/validation/phone";
import type { SaveDraftPayload } from "@/lib/drafts";

/**
 * `submitter_name`/`contact_mobile`/`contact_email` never reach the backend
 * any other way for a Cooperative/NGO/Woreda-Kebele/Development-Agent
 * submission: RegisterForm.tsx's Profile step only persists those fields to
 * `localStorage` (see `saveSubmitterProfile`), never to the backend, so the
 * signed-in account's own session has no way to know a representative's name
 * or a cooperative's contact details. They must be sent explicitly here.
 */
export interface WizardIdentitySource {
  identityValues: Record<string, string>;
  userFullName?: string | null;
  userMobile?: string | null;
  userEmail?: string | null;
}

/**
 * Field keys per submitter type — see fields.ts's `SI_FIELDS_BY_TYPE`:
 * `fullName` (Individual Farmer), `representativeName` (Cooperative/FPO and
 * NGO both), `officeName` (Woreda/Kebele Body), `farmerName` (Development
 * Agent — the farmer they're filing on behalf of, the actual submitter of
 * record; the agent's own name is never collected, see `submitsOnBehalfOfOthers`).
 */
export function resolveSubmitterName({ identityValues, userFullName }: WizardIdentitySource): string {
  return (
    identityValues.fullName ||
    identityValues.representativeName ||
    identityValues.officeName ||
    identityValues.farmerName ||
    userFullName ||
    ""
  );
}

export function resolveContactMobile({ identityValues, userMobile }: WizardIdentitySource): string {
  const raw = identityValues.phoneNumber || userMobile || "";
  if (!raw) return "";
  return formatToE164(raw, identityValues.phoneCode || "+251");
}

export function resolveContactEmail({ identityValues, userEmail }: WizardIdentitySource): string {
  return identityValues.email || userEmail || "";
}

export interface BuildSaveDraftPayloadInput extends WizardIdentitySource {
  clientSubmissionUuid: string;
  /** Display label, e.g. "Web Portal" — not the wizard's internal slug. */
  submissionChannelLabel?: string;
  /** Display label, e.g. "Individual Farmer" — not the wizard's internal slug. */
  submitterTypeLabel?: string;
  /** Resolved `area_id`/`path_code` from `findFilingArea` — never a display name. */
  administrativeAreaId?: string;
  kebele?: string;
  /** Display label, e.g. "Inputs" — not the wizard's internal slug. */
  serviceCategoryLabel?: string;
  /** Already a name (see `selectGrievanceTypeOptions`), not an id. */
  grievanceType?: string;
  associatedServiceProvider?: string;
  description?: string;
  desiredOutcome?: string;
}

/**
 * Shapes the wizard's state into `POST /api/v1/drafts`'s body — a flat
 * Grievance-document field set (`SaveDraftRequest`, `extra: "forbid"` on the
 * backend, so an unrecognized key 400s rather than being silently ignored).
 */
export function buildSaveDraftPayload(input: BuildSaveDraftPayloadInput): SaveDraftPayload {
  return {
    client_submission_uuid: input.clientSubmissionUuid,
    submission_channel: input.submissionChannelLabel || undefined,
    submitter_type: input.submitterTypeLabel || undefined,
    submitter_name: resolveSubmitterName(input) || undefined,
    contact_mobile: resolveContactMobile(input) || undefined,
    contact_email: resolveContactEmail(input) || undefined,
    administrative_area: input.administrativeAreaId || undefined,
    administrative_unit: input.kebele?.trim() || undefined,
    service_category: input.serviceCategoryLabel || undefined,
    grievance_type: input.grievanceType || undefined,
    associated_service_provider: input.associatedServiceProvider?.trim() || undefined,
    description: input.description?.trim() || undefined,
    desired_outcome: input.desiredOutcome?.trim() || undefined,
  };
}
