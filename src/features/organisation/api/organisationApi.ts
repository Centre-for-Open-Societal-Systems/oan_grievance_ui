import { ApiError, fetchApi } from '@/lib/api/fetchApi';
import { stripLeadingZero } from '@/lib/validation/phone';
import { z } from 'zod';
import { ORGANISATION_CONFIG } from '../config';
import { normaliseWebsite, type OrganisationField, type OrganisationValues } from '../lib/validation';
import type { OrganisationKind } from '@/lib/organisationKind';
import { toOrganisationStatus, type OrganisationStatus } from '@/lib/organisationStatus';

// The organisation endpoints of `oan_grievance_service`
// (api/v1/organization.py; contract in its docs/organization-registration-api.md).
// A representative has one organisation: `GET /orgs/me` is 404 until they
// register it with `POST /orgs`, and it stays In Review until an administrator
// activates it.

export type { OrganisationStatus };

const organisationSchema = z.object({
  name: z.string().nullish(),
  legal_name: z.string().min(1),
  brand_name: z.string().nullish(),
  org_type: z.string().nullish(),
  entity_type: z.string().nullish(),
  registration_number: z.string().nullish(),
  status: z.string().nullish(),
  status_reason: z.string().nullish(),
});

export interface Organisation {
  /** The backend's id, e.g. `ORG-00012`. */
  id: string | null;
  legalName: string;
  brandName: string | null;
  /** The backend's organisation type ("NGO" / "FPO" / "Cooperative"). */
  orgType: string | null;
  entityType: string | null;
  registrationNumber: string | null;
  status: OrganisationStatus;
  /** Why it is not Active, or the last decision's note — what a Suspended organisation shows. */
  statusReason: string | null;
}

/** The organisation in a response, or null when the body is not one. */
export function parseOrganisation(data: unknown): Organisation | null {
  const parsed = organisationSchema.safeParse(data);
  if (!parsed.success) return null;
  const org = parsed.data;
  return {
    id: org.name ?? null,
    legalName: org.legal_name,
    brandName: org.brand_name || null,
    orgType: org.org_type || null,
    entityType: org.entity_type || null,
    registrationNumber: org.registration_number || null,
    status: toOrganisationStatus(org.status),
    statusReason: org.status_reason || null,
  };
}

export interface OrganisationRegistrationPayload {
  legal_name: string;
  org_type: string;
  entity_type: string;
  brand_name?: string;
  /** Sent under the name the registration screen uses; the backend stores it as `registration_number`. */
  tax_registration_number: string;
  /** The authorised representative; the backend defaults it to the account's name when omitted. */
  representative_name?: string;
  /** Members affected — Cooperative / FPO only, a whole number from 0. */
  members_affected?: number;
  street_address: string;
  kebele?: string;
  woreda?: string;
  zone: string;
  region: string;
  country: string;
  postal_code: string;
  website?: string;
  contact_email: string;
  /** E.164, e.g. +251911234567. */
  contact_phone: string;
  /** The representative's confirmation that they may register the organisation and accept the Privacy Policy. The backend requires `true`. */
  consent_given: true;
}

/** Drops an empty optional value so it is omitted, not sent as "". */
function optional<K extends string>(key: K, value: string): { [P in K]?: string } {
  const trimmed = value.trim();
  return trimmed ? ({ [key]: trimmed } as { [P in K]: string }) : {};
}

/**
 * The body for `POST /orgs`. Only called once the consent box is ticked (the form
 * does not submit without it), which is why `consent_given` is always `true` here.
 */
export function toRegistrationPayload(kind: OrganisationKind, values: OrganisationValues): OrganisationRegistrationPayload {
  const website = values.website.trim() ? normaliseWebsite(values.website) : null;
  return {
    legal_name: values.legalName.trim(),
    org_type: ORGANISATION_CONFIG[kind].backendOrgType,
    entity_type: values.entityType.trim(),
    ...optional('brand_name', values.brandName),
    tax_registration_number: values.taxId.trim().toUpperCase(),
    ...optional('representative_name', values.representativeName),
    // Only an FPO has a member count; an NGO's form doesn't show it, so it is never sent for one.
    ...(kind === 'fpo' && values.memberCount.trim() ? { members_affected: Number(values.memberCount.trim()) } : {}),
    street_address: values.streetAddress.trim(),
    ...optional('kebele', values.kebele),
    ...optional('woreda', values.woreda),
    zone: values.zone.trim(),
    region: values.region.trim(),
    country: values.country.trim(),
    postal_code: values.postalCode.trim(),
    ...(website ? { website } : {}),
    contact_email: values.email.trim(),
    contact_phone: `${values.phoneCode}${stripLeadingZero(values.phoneNumber)}`,
    consent_given: true,
  };
}

/** The signed-in user's organisation, or null if they have not registered one (404). */
export async function getMyOrganisation(): Promise<Organisation | null> {
  try {
    return parseOrganisation(await fetchApi('/api/v1/orgs/me', { method: 'GET' }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Registers the organisation. The backend puts it In Review and answers with
 * the record itself; null only if it answered with something unreadable, in
 * which case the registration still went through.
 */
export async function registerOrganisation(payload: OrganisationRegistrationPayload): Promise<Organisation | null> {
  return parseOrganisation(await fetchApi('/api/v1/orgs', { method: 'POST', body: JSON.stringify(payload) }));
}

/**
 * Backend field names in an error's `details` (keyed by the request field, or
 * by the stored name for the registration number), mapped to this form's
 * fields so each message lands under its input.
 */
export const BACKEND_FIELD_TO_FORM_FIELD: Record<string, OrganisationField> = {
  legal_name: 'legalName',
  brand_name: 'brandName',
  entity_type: 'entityType',
  tax_registration_number: 'taxId',
  registration_number: 'taxId',
  representative_name: 'representativeName',
  members_affected: 'memberCount',
  street_address: 'streetAddress',
  kebele: 'kebele',
  woreda: 'woreda',
  zone: 'zone',
  region: 'region',
  country: 'country',
  postal_code: 'postalCode',
  website: 'website',
  contact_email: 'email',
  contact_phone: 'phoneNumber',
};

/** The backend wraps a pydantic rule's message as "Value error, <message>"; the person only needs the message. */
export function cleanBackendMessage(message: string): string {
  return message.replace(/^Value error,\s*/i, '').trim();
}

/** True for the 409 DUPLICATE_ENTRY the backend answers with when the account or registration number is already registered. */
export function isDuplicateRegistration(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
