// Verification status of an organisation (NGO / FPO / Cooperative), as the
// backend reports it on `/orgs/me` and inside `/auth/me`. Plain module so the
// auth feature (which reads `/auth/me`) and the organisation feature (which
// reads `/orgs/me`) share one definition.

/** Registered In Review, then an administrator activates (or suspends) it. */
export const ORGANISATION_STATUSES = ['In Review', 'Active', 'Suspended'] as const;
export type OrganisationStatus = (typeof ORGANISATION_STATUSES)[number];

/** An unrecognised or missing status is treated as still In Review, never guessed to be Active. */
export function toOrganisationStatus(raw: string | null | undefined): OrganisationStatus {
  return ORGANISATION_STATUSES.find((status) => status.toLowerCase() === raw?.trim().toLowerCase()) ?? 'In Review';
}
