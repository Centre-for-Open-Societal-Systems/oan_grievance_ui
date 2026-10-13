// Which organisation onboarding screen (NGO or FPO) a user belongs to. Plain
// module (no React, no Redux, no browser APIs) so `features/auth/rbac.ts` —
// which `proxy.ts` imports — can use the route table without pulling client
// code into it. The browser-only half is `resolveOrganisationKind.ts`.

export type OrganisationKind = 'ngo' | 'fpo';

/** Where each kind lands after sign-in, and the route its onboarding screen lives at. */
export const ORGANISATION_ROUTE: Record<OrganisationKind, string> = {
  ngo: '/ngo',
  fpo: '/fpo',
};

export const ORGANISATION_KINDS = Object.keys(ORGANISATION_ROUTE) as OrganisationKind[];

/**
 * The kind a submitter type or organisation type names, or null for anything
 * else (farmer, Development Agent, Woreda/Kebele Body, an officer role...).
 *
 * Accepts both spellings in play: the backend's own names ("NGO", "FPO",
 * "Cooperative" — see `SUBMITTER_TYPES` in oan_grievance_service) and the UI's
 * keys ("ngo", "cooperative" — see `submitterTypeOptions`). The UI's single
 * "Cooperative / FPO" option and the backend's separate Cooperative and FPO
 * types all land on the FPO screen, the same grouping `normalizeSubmitterType`
 * (features/metadata) already makes.
 */
export function organisationKindFor(type: string | null | undefined): OrganisationKind | null {
  const lower = type?.toLowerCase().trim();
  if (!lower) return null;
  if (/\bngo\b/.test(lower)) return 'ngo';
  if (/\bfpo\b/.test(lower) || lower.includes('coop')) return 'fpo';
  return null;
}
