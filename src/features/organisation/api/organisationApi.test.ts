import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildInitialOrganisationValues } from '../lib/defaults';
import { extractFieldErrors } from '@/lib/api/fetchApi';
import {
  BACKEND_FIELD_TO_FORM_FIELD,
  cleanBackendMessage,
  getMyOrganisation,
  isDuplicateRegistration,
  parseOrganisation,
  registerOrganisation,
  toRegistrationPayload,
} from './organisationApi';

const originalFetch = global.fetch;

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe('parseOrganisation', () => {
  it('reads an organisation and normalises its status', () => {
    expect(
      parseOrganisation({
        name: 'ORG-1',
        legal_name: 'Acme',
        org_type: 'FPO',
        entity_type: 'Cooperative Union',
        registration_number: 'ET12345678',
        status: 'Active',
        status_reason: null,
        // the rest of the backend's record is ignored
        contact_email: 'a@b.org',
        verified_by: 'admin@example.com',
      })
    ).toEqual({
      id: 'ORG-1',
      legalName: 'Acme',
      brandName: null,
      orgType: 'FPO',
      entityType: 'Cooperative Union',
      registrationNumber: 'ET12345678',
      status: 'Active',
      statusReason: null,
    });
  });

  it("keeps the administrator's reason for a suspended organisation", () => {
    const org = parseOrganisation({ legal_name: 'Acme', status: 'Suspended', status_reason: 'Certificate could not be confirmed' });
    expect(org).toMatchObject({ status: 'Suspended', statusReason: 'Certificate could not be confirmed' });
  });

  it('treats a missing or unrecognised status as In Review, never as Active', () => {
    expect(parseOrganisation({ legal_name: 'Acme' })?.status).toBe('In Review');
    expect(parseOrganisation({ legal_name: 'Acme', status: 'approved?' })?.status).toBe('In Review');
    expect(parseOrganisation({ legal_name: 'Acme', status: 'suspended' })?.status).toBe('Suspended');
  });

  it('is null for a body that is not an organisation', () => {
    expect(parseOrganisation(null)).toBeNull();
    expect(parseOrganisation({})).toBeNull();
    expect(parseOrganisation({ legal_name: '' })).toBeNull();
  });
});

describe('toRegistrationPayload', () => {
  const values = {
    ...buildInitialOrganisationValues({ email: 'rep@acme.org' }),
    legalName: '  Acme Farmers  ',
    brandName: ' Acme ',
    entityType: 'Primary Cooperative',
    taxId: 'et12345678',
    streetAddress: 'Main St',
    zone: 'Z',
    region: 'R',
    postalCode: '1000',
    website: 'acme.org',
    phoneNumber: '0911234567',
  };

  it('trims, upper-cases the tax number, adds a scheme to the website and builds an E.164 phone', () => {
    expect(toRegistrationPayload('fpo', values)).toEqual({
      legal_name: 'Acme Farmers',
      org_type: 'FPO',
      entity_type: 'Primary Cooperative',
      brand_name: 'Acme',
      tax_registration_number: 'ET12345678',
      street_address: 'Main St',
      zone: 'Z',
      region: 'R',
      country: 'Ethiopia',
      postal_code: '1000',
      website: 'https://acme.org',
      contact_email: 'rep@acme.org',
      contact_phone: '+251911234567',
    });
  });

  it('omits empty optional fields rather than sending blanks', () => {
    const payload = toRegistrationPayload('ngo', { ...values, brandName: '', website: '' });
    expect(payload).not.toHaveProperty('brand_name');
    expect(payload).not.toHaveProperty('website');
    expect(payload).not.toHaveProperty('kebele');
    expect(payload.org_type).toBe('NGO');
  });
});

describe('getMyOrganisation', () => {
  it('GETs the caller\'s organisation through the proxy', async () => {
    const fetchMock = mockFetch(200, { status: 'success', data: { legal_name: 'Acme', status: 'In Review' } });
    const org = await getMyOrganisation();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/proxy/api/v1/orgs/me');
    expect(init.method).toBe('GET');
    expect(org?.legalName).toBe('Acme');
  });

  it('is null when the user has no organisation yet (404)', async () => {
    mockFetch(404, { message: 'No organisation' });
    expect(await getMyOrganisation()).toBeNull();
  });

  it('lets any other failure through', async () => {
    mockFetch(500, { message: 'boom' });
    await expect(getMyOrganisation()).rejects.toThrow();
  });
});

describe('registerOrganisation', () => {
  it('POSTs the payload to /orgs and returns the record the backend answers with', async () => {
    // Shape captured from a live POST /api/v1/orgs.
    const fetchMock = mockFetch(200, {
      status: 'success',
      message: 'Organization registered and awaiting verification',
      data: { name: 'ORG-02209', legal_name: 'Acme', org_type: 'NGO', registration_number: 'ET01878767', status: 'In Review' },
    });
    const org = await registerOrganisation({ legal_name: 'Acme' } as Parameters<typeof registerOrganisation>[0]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/proxy/api/v1/orgs');
    expect(url).not.toContain('/orgs/me');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ legal_name: 'Acme' });
    expect(org).toMatchObject({ id: 'ORG-02209', status: 'In Review', registrationNumber: 'ET01878767' });
  });

  it('surfaces a 409 as an ApiError carrying the status', async () => {
    mockFetch(409, { code: 'DUPLICATE_ENTRY', message: 'Your account already represents a registered organization.' });
    const error = await registerOrganisation({} as Parameters<typeof registerOrganisation>[0]).catch((e: unknown) => e);
    expect(isDuplicateRegistration(error)).toBe(true);
  });

  it('carries a 400\'s per-field details, keyed by the request field', async () => {
    mockFetch(400, { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { postal_code: 'Value error, Postal code is not valid.' } });
    const error = await registerOrganisation({} as Parameters<typeof registerOrganisation>[0]).catch((e: unknown) => e);
    expect(extractFieldErrors(error)).toEqual({ postal_code: 'Value error, Postal code is not valid.' });
  });
});

describe('error helpers', () => {
  it('strips the "Value error," prefix the backend puts on a rule\'s message', () => {
    expect(cleanBackendMessage('Value error, Postal code is not valid.')).toBe('Postal code is not valid.');
    expect(cleanBackendMessage('Validation failed')).toBe('Validation failed');
  });

  it('maps both names of the registration number, and every contact field, onto the form', () => {
    expect(BACKEND_FIELD_TO_FORM_FIELD.tax_registration_number).toBe('taxId');
    expect(BACKEND_FIELD_TO_FORM_FIELD.registration_number).toBe('taxId');
    expect(BACKEND_FIELD_TO_FORM_FIELD.contact_email).toBe('email');
    expect(BACKEND_FIELD_TO_FORM_FIELD.contact_phone).toBe('phoneNumber');
  });
});
