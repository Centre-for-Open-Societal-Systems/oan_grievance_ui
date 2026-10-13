import { organisationKindFor, type OrganisationKind } from '@/lib/organisationKind';
import { loadOrganisationIntent } from '@/lib/organisationIntent';
import { loadSubmitterProfile } from '@/lib/submitterProfile';

/**
 * The organisation kind of a signed-in user. In order:
 *  1. the type the backend reports for the account, once it is an organisation
 *     type — set when the organisation is registered, and the only source that
 *     follows the account to another browser;
 *  2. the intent noted at sign-up (`organisationIntent.ts`), which covers the
 *     time between creating the account and registering the organisation,
 *     when the backend still reports the default type;
 *  3. the type in the registration prefill, for accounts that signed up before
 *     the intent note existed.
 *
 * Browser-only — it reads localStorage — so call it from event handlers and
 * effects, not during server rendering.
 */
export function resolveOrganisationKind(user: { email: string; type?: string | null } | null): OrganisationKind | null {
  if (!user) return null;
  return (
    organisationKindFor(user.type) ??
    loadOrganisationIntent(user.email) ??
    organisationKindFor(loadSubmitterProfile(user.email)?.submitterType)
  );
}
