import { normalizeSubmissionChannel, normalizeSubmitterType } from "@/features/metadata";
import type { User } from "@/features/auth/store/authSlice";
import { submitsOnBehalfOfOthers } from "@/components/submitter-identity/fields";
import { organisationKindFor } from "@/lib/organisationKind";
import { splitPhoneNumber } from "@/lib/validation/phone";
import { DEFAULT_SUBMISSION_CHANNEL } from "@/lib/validation/registerSubmitter";
import type { SubmitterProfile } from "@/lib/submitterProfile";

const KNOWN_TYPES = ["individual", "cooperative", "ngo", "woreda_kebele", "development_agent"];

/**
 * Step 1's starting submitter type: the signed-in account's own type
 * (`submitter_type` from `/auth/me`, or `type` while a backend without it is
 * still in use) if it maps to one the wizard knows, otherwise whatever was
 * saved at registration.
 */
export function resolveInitialSubmitterType(user: User | null, savedProfile: SubmitterProfile | null): string {
  const backendType = user?.submitter_type || user?.type;
  const normalized = backendType ? normalizeSubmitterType(backendType) : "";
  if (KNOWN_TYPES.includes(normalized)) return normalized;
  return savedProfile?.submitterType ?? "";
}

/**
 * Step 1's starting submission channel: the account's own, or Web Portal when
 * the profile has none. Empty with no signed-in account.
 *
 * Goes through `normalizeSubmissionChannel`, the same normalisation the
 * channel options' values come from (`code || name`), so the profile's
 * channel name ("Web Portal") lands on the matching option ("web"). The
 * field stays editable per grievance either way.
 */
export function resolveInitialSubmissionChannel(user: User | null): string {
  if (!user) return "";
  return normalizeSubmissionChannel(user.submission_channel || DEFAULT_SUBMISSION_CHANNEL);
}

/**
 * What Step 1 keeps once a grievance has been filed and the wizard starts over
 * for the next one. Step 1 describes the submitter, not the case, so it carries
 * over — a returning submitter isn't made to retype who they are.
 *
 * The exception is a type that files on behalf of others (a Development
 * Agent): its fields are the *farmer's* details, and the next grievance is
 * likely for someone else, so they start blank rather than quietly reusing the
 * last farmer's name, Fayda ID and phone.
 */
export function identityAfterReset(
  submitterType: string,
  identityValues: Record<string, string>
): Record<string, string> {
  return submitsOnBehalfOfOthers(submitterType) ? {} : identityValues;
}

/**
 * Step 1's starting identity fields, so a returning user isn't asked for the
 * same details twice. The saved registration profile fills in what the account
 * doesn't carry; the live account wins on overlap.
 *
 * Empty for a type that files on behalf of others (a Development Agent): its
 * form's name, Fayda ID, phone and email belong to the farmer being filed for,
 * so seeding them from the agent's own account would record the agent's
 * details as the farmer's.
 */
export function buildInitialIdentityValues(
  user: User | null,
  savedProfile: SubmitterProfile | null,
  submitterType: string
): Record<string, string> {
  if (submitsOnBehalfOfOthers(submitterType)) return {};

  const initial: Record<string, string> = { ...savedProfile?.identityValues };
  if (user) {
    if (user.full_name) initial.fullName = user.full_name;
    if (user.fayda_id) initial.faydaId = user.fayda_id;
    if (user.phone_number) {
      initial.phoneNumber = user.phone_number;
      initial.phoneCode = user.country_code || "+251";
    } else if (user.mobile_no) {
      const parsed = splitPhoneNumber(user.mobile_no);
      initial.phoneCode = parsed.phoneCode;
      initial.phoneNumber = parsed.phoneNumber;
    }
    if (user.email) initial.email = user.email;
  }
  Object.assign(initial, organisationIdentityValues(user, submitterType));
  if (organisationKindFor(submitterType) !== null) {
    // The Fayda ID an NGO / FPO's account holds is its representative's, given at sign-up,
    // and the organisation form calls that field `representativeFaydaId` (not `faydaId`).
    if (user?.fayda_id) initial.representativeFaydaId = user.fayda_id;
    delete initial.faydaId;
  }
  return initial;
}

/**
 * The NGO / FPO fields Step 1 shares with the registered organisation: its
 * legal name, registration number and authorised representative, straight from
 * `/auth/me`'s `organization` — what the representative typed on the onboarding
 * screen, so the same facts are not asked a second time. Overrides the
 * registration snapshot, since the backend's record is the verified one.
 *
 * Empty unless Step 1 is on an organisation type: an NGO representative who
 * switches the form to another type is not filing as the organisation. Without a
 * registered organisation yet, only a registration number the backend already
 * holds is known. (The representative's Fayda ID is filled in above.)
 */
function organisationIdentityValues(user: User | null, submitterType: string): Record<string, string> {
  if (!user || organisationKindFor(submitterType) === null) return {};
  const organisation = user.organisation;
  // Before the organisation is registered the registration number is still known: it is what
  // the account signed up with.
  const registrationNumber = organisation?.registrationNumber ?? user.registration_number;
  if (!organisation) return registrationNumber ? { registrationNumber } : {};

  const representative = organisation.representativeName ?? user.full_name;
  return {
    orgName: organisation.legalName,
    ...(registrationNumber ? { registrationNumber } : {}),
    ...(representative ? { representativeName: representative } : {}),
  };
}

/**
 * Whether Step 1's submitter type is fixed by the account. A registered
 * organisation files as itself — its type came from the verified registration —
 * so the dropdown is not offered; anyone else may still pick.
 */
export function isSubmitterTypeLocked(user: User | null): boolean {
  return Boolean(user?.organisation && organisationKindFor(user.type) !== null);
}
