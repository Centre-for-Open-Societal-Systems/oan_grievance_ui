import type { OrganisationKind } from '@/lib/organisationKind';

export interface EntityTypeOption {
  /** What is sent to the backend as `entity_type` — the English name, so an admin reading the record sees it plainly. */
  value: string;
  /** Key under `organisation.entityTypes` for the translated label. */
  labelKey: string;
}

export interface OrganisationKindConfig {
  /** The backend's organisation type (`org_type`) — see docs/organization_onboarding_flow.md in oan_grievance_service. */
  backendOrgType: string;
  /** The "Entity type" dropdown for this kind. */
  entityTypes: readonly EntityTypeOption[];
}

/**
 * What differs between the NGO and FPO onboarding screens. The form fields are
 * the same for both (the reference design has one set); the screens differ in
 * the organisation type they register as, the entity types offered, and the
 * wording. Both sets of entity types are a starting list drawn from the
 * categories Ethiopian NGOs/CSOs and cooperatives are usually registered
 * under — not a backend master (there is none yet), so confirm the list.
 */
export const ORGANISATION_CONFIG: Record<OrganisationKind, OrganisationKindConfig> = {
  ngo: {
    backendOrgType: 'NGO',
    entityTypes: [
      { value: 'Local NGO', labelKey: 'localNgo' },
      { value: 'International NGO', labelKey: 'internationalNgo' },
      { value: 'Community-Based Organisation', labelKey: 'cbo' },
      { value: 'Civil Society Organisation', labelKey: 'cso' },
    ],
  },
  fpo: {
    backendOrgType: 'FPO',
    entityTypes: [
      { value: 'Farmer Producer Organisation', labelKey: 'fpo' },
      { value: 'Primary Cooperative', labelKey: 'primaryCooperative' },
      { value: 'Cooperative Union', labelKey: 'cooperativeUnion' },
      { value: 'Cooperative Federation', labelKey: 'cooperativeFederation' },
    ],
  },
};

/** The country the registered-address form starts with. */
export const DEFAULT_COUNTRY = 'Ethiopia';
