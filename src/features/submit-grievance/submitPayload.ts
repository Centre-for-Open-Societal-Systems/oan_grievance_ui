import { submitsOnBehalfOfOthers } from "@/components/submitter-identity/fields";
import { MIN_DESCRIPTION_LENGTH } from "@/lib/validation/fieldRules";
import { splitPhoneNumber } from "@/lib/validation/phone";

/**
 * The grievance fields of `POST /api/v1/grievances` — everything except
 * `consent_given`, which only the review step adds. `client_submission_uuid`
 * is the wizard session's idempotency key, so a retried submit is recognised
 * rather than filed twice.
 */
export interface SubmitFields {
  client_submission_uuid: string;
  submission_channel?: string;
  submitter_type?: string;
  submitter_name?: string;
  country_code?: string;
  phone_number?: string;
  contact_email?: string;
  /** `area_id` or `path_code` of the woreda or kebele filed against — never a display name (the wizard holds areas as `AreaRef`s). */
  administrative_area?: string;
  administrative_unit?: string;
  service_category?: string;
  grievance_type?: string;
  associated_service_provider?: string;
  description?: string;
  desired_outcome?: string;
  is_anonymous?: number;
  can_request_more_info?: number;
}

/**
 * `submitter_name`/`country_code`+`phone_number`/`contact_email` never reach the backend
 * any other way for a Cooperative/NGO/Woreda-Kebele/Development-Agent
 * submission: RegisterForm.tsx's Profile step only persists those fields to
 * `localStorage` (see `saveSubmitterProfile`), never to the backend, so the
 * signed-in account's own session has no way to know a representative's name
 * or a cooperative's contact details. They must be sent explicitly here.
 */
export interface WizardIdentitySource {
  /** The wizard's own slug (e.g. "development_agent"), not a display label — only used to gate the account-profile fallback below. */
  submitterType?: string;
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
 * record).
 *
 * The account-profile fallback (`userFullName`/`userMobile`/`userEmail`) is
 * skipped for a Development Agent specifically: that type's own identity is
 * never collected (see `submitsOnBehalfOfOthers`), so if the farmer's own
 * fields are still empty — Step 1's fields can be empty on a direct
 * jump to a later step — falling back to the *agent's* signed-in profile
 * would misattribute the grievance to the agent instead of leaving it blank.
 */
export function resolveSubmitterName({ identityValues, userFullName, submitterType }: WizardIdentitySource): string {
  const ownProfileFallback = submitsOnBehalfOfOthers(submitterType ?? "") ? "" : userFullName || "";
  return (
    identityValues.fullName ||
    identityValues.representativeName ||
    identityValues.officeName ||
    identityValues.farmerName ||
    ownProfileFallback
  );
}

/**
 * The mobile number as the backend takes it: the dial code and the local number
 * separately. `contact_mobile` is deliberately not sent — the backend builds it
 * from these two, so sending it as well produced a doubled prefix
 * ("+251251...") that failed its phone validation.
 */
export function resolveContactPhone({
  identityValues,
  userMobile,
  submitterType,
}: WizardIdentitySource): { country_code: string; phone_number: string } {
  if (identityValues.phoneNumber) {
    return { country_code: identityValues.phoneCode || "+251", phone_number: identityValues.phoneNumber };
  }
  const ownProfileFallback = submitsOnBehalfOfOthers(submitterType ?? "") ? "" : userMobile || "";
  if (!ownProfileFallback) return { country_code: identityValues.phoneCode || "+251", phone_number: "" };
  const { phoneCode, phoneNumber } = splitPhoneNumber(ownProfileFallback);
  return { country_code: phoneCode, phone_number: phoneNumber };
}

export function resolveContactEmail({ identityValues, userEmail, submitterType }: WizardIdentitySource): string {
  const ownProfileFallback = submitsOnBehalfOfOthers(submitterType ?? "") ? "" : userEmail || "";
  return identityValues.email || ownProfileFallback;
}

export interface BuildSubmitFieldsInput extends WizardIdentitySource {
  clientSubmissionUuid: string;
  /** Display label, e.g. "Web Portal" — not the wizard's internal slug. */
  submissionChannelLabel?: string;
  /** Display label, e.g. "Individual Farmer" — not the wizard's internal slug. */
  submitterTypeLabel?: string;
  /** `area_id` of the selected kebele, else the woreda — never a display name. Omitted (not sent as "") when neither is selected yet, so saving an early step can't wipe a previously-saved value. */
  administrativeAreaId?: string;
  kebele?: string;
  /** Display label, e.g. "Inputs" — not the wizard's internal slug. */
  serviceCategoryLabel?: string;
  /**
   * `grievance_type_id` (e.g. "GTYPE-00001"), not the type's display name —
   * see `selectGrievanceTypeOptions`'s own doc comment. Unlike submission
   * channel/submitter type/service category, Grievance Type autonames on a
   * generated id, not its own name field, so the Link field this becomes
   * needs the id.
   */
  grievanceType?: string;
  associatedServiceProvider?: string;
  description?: string;
  desiredOutcome?: string;
  /** A voice recording is attached in place of a typed description. */
  hasVoiceNote?: boolean;
}

/**
 * The backend requires a description of at least 20 characters, so a case
 * described by voice alone sends this line; the recording is the real content.
 * It is stored as case data (what officers read), not UI copy, so it is not translated.
 */
export const VOICE_NOTE_DESCRIPTION = "Voice grievance - please listen to the attached audio recording.";

/**
 * The description to send. With a recording attached the typed text is optional: a
 * long enough note is sent as typed; a shorter one (which the backend would refuse)
 * keeps what the submitter wrote and gains the standard line after it; none at all
 * sends the standard line alone.
 */
export function resolveDescription(typed: string | undefined, hasVoiceNote: boolean | undefined): string {
  const text = typed?.trim() ?? "";
  if (!hasVoiceNote || text.length >= MIN_DESCRIPTION_LENGTH) return text;
  return text ? `${text} - ${VOICE_NOTE_DESCRIPTION}` : VOICE_NOTE_DESCRIPTION;
}

/**
 * Shapes the wizard's state into the flat field set of
 * `POST /api/v1/grievances` (extra keys 400 on the backend rather than being
 * silently ignored). Text fields are sent as their current trimmed value,
 * blank or not; `administrative_area` is omitted until an area is selected.
 */
export function buildSubmitFields(input: BuildSubmitFieldsInput): SubmitFields {
  return {
    client_submission_uuid: input.clientSubmissionUuid,
    submission_channel: input.submissionChannelLabel ?? "",
    submitter_type: input.submitterTypeLabel ?? "",
    submitter_name: resolveSubmitterName(input),
    ...resolveContactPhone(input),
    contact_email: resolveContactEmail(input),
    administrative_area: input.administrativeAreaId || undefined,
    administrative_unit: input.kebele?.trim() ?? "",
    service_category: input.serviceCategoryLabel ?? "",
    grievance_type: input.grievanceType ?? "",
    associated_service_provider: input.associatedServiceProvider?.trim() ?? "",
    description: resolveDescription(input.description, input.hasVoiceNote),
    desired_outcome: input.desiredOutcome?.trim() ?? "",
  };
}
