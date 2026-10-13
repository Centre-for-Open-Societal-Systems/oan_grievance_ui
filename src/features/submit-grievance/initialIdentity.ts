import { normalizeSubmitterType } from "@/features/metadata";
import type { User } from "@/features/auth/store/authSlice";
import { submitsOnBehalfOfOthers } from "@/components/submitter-identity/fields";
import { organisationKindFor } from "@/lib/organisationKind";
import { splitPhoneNumber } from "@/lib/validation/phone";
import type { SubmitterProfile } from "@/lib/submitterProfile";

const KNOWN_TYPES = ["individual", "cooperative", "ngo", "woreda_kebele", "development_agent"];

/**
 * Step 1's starting submitter type: the signed-in account's own type if it maps
 * to one the wizard knows, otherwise whatever was saved at registration.
 */
export function resolveInitialSubmitterType(user: User | null, savedProfile: SubmitterProfile | null): string {
  const normalized = user?.type ? normalizeSubmitterType(user.type) : "";
  if (KNOWN_TYPES.includes(normalized)) return normalized;
  return savedProfile?.submitterType ?? "";
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
    // An NGO / FPO has no Fayda ID. A registration snapshot saved before that field was
    // removed may still hold one, and the account's own would belong to a person, not to
    // the organisation — neither goes into the organisation's Step 1.
    delete initial.representativeFaydaId;
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
 * Empty unless the user has a registered organisation *and* Step 1 is on an
 * organisation type: an NGO representative who switches the form to another
 * type is not filing as the organisation. There is no Fayda ID to fill: an
 * organisation has none.
 */
function organisationIdentityValues(user: User | null, submitterType: string): Record<string, string> {
  const organisation = user?.organisation;
  if (!organisation || organisationKindFor(submitterType) === null) return {};
  const representative = organisation.representativeName ?? user?.full_name;
  return {
    orgName: organisation.legalName,
    ...(organisation.registrationNumber ? { registrationNumber: organisation.registrationNumber } : {}),
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
