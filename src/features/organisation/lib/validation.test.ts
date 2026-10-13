import { describe, expect, it } from 'vitest';
import {
  normaliseWebsite,
  ORGANISATION_FIELDS,
  validateOrganisation,
  validateOrganisationField,
  type OrganisationValues,
} from './validation';

const ENTITY_TYPES = ['Local NGO', 'Civil Society Organisation'];

const VALID: OrganisationValues = {
  legalName: 'Green Highlands Development Association',
  brandName: '',
  entityType: 'Local NGO',
  taxId: '0012345678',
  streetAddress: 'Bole Road, Block 4',
  kebele: '',
  woreda: '',
  zone: 'Addis Ababa',
  region: 'Addis Ababa',
  country: 'Ethiopia',
  postalCode: '1000',
  website: '',
  email: 'info@greenhighlands.org',
  phoneCode: '+251',
  phoneNumber: '0911234567',
};

const check = (overrides: Partial<OrganisationValues>) =>
  validateOrganisation({ ...VALID, ...overrides }, ENTITY_TYPES);

describe('validateOrganisation', () => {
  it('accepts a complete form, leaving the optional fields empty', () => {
    expect(validateOrganisation(VALID, ENTITY_TYPES)).toEqual({});
  });

  it('requires exactly the fields the reference design marks required', () => {
    const empty = Object.fromEntries(ORGANISATION_FIELDS.map((f) => [f, ''])) as OrganisationValues;
    const problems = validateOrganisation({ ...empty, phoneCode: '+251' }, ENTITY_TYPES);
    expect(Object.keys(problems).sort()).toEqual(
      [
        'legalName',
        'entityType',
        'taxId',
        'streetAddress',
        'zone',
        'region',
        'country',
        'postalCode',
        'email',
        'phoneNumber',
      ].sort()
    );
    for (const problem of Object.values(problems)) expect(problem).toEqual({ code: 'required' });
  });

  it('treats a whitespace-only value as empty', () => {
    expect(check({ legalName: '   ' }).legalName).toEqual({ code: 'required' });
  });

  it('rejects an over-long name or address line', () => {
    expect(check({ legalName: 'x'.repeat(141) }).legalName).toEqual({ code: 'tooLong', max: 140 });
    expect(check({ kebele: 'x'.repeat(141) }).kebele).toEqual({ code: 'tooLong', max: 140 });
    expect(check({ legalName: 'x'.repeat(140) }).legalName).toBeUndefined();
  });
});

describe('entity type', () => {
  it('must be one of the options offered for this kind', () => {
    expect(check({ entityType: 'Cooperative Union' }).entityType).toEqual({ code: 'entityType' });
    expect(check({ entityType: 'Civil Society Organisation' }).entityType).toBeUndefined();
  });
});

describe('tax registration number', () => {
  it('takes 9 or 10 letters or digits', () => {
    expect(check({ taxId: '123456789' }).taxId).toBeUndefined();
    expect(check({ taxId: '0012345678' }).taxId).toBeUndefined();
    expect(check({ taxId: 'ET12345678' }).taxId).toBeUndefined();
  });

  it('rejects the wrong length or other characters', () => {
    for (const taxId of ['12345678', '12345678901', '123-456-789', '1234 56789', '12345678!']) {
      expect(check({ taxId }).taxId).toEqual({ code: 'taxId' });
    }
  });
});

describe('postal code', () => {
  it('accepts Ethiopia-style and longer codes', () => {
    for (const postalCode of ['1000', '12345', 'SW1A 1AA', 'AB-1234']) {
      expect(check({ postalCode }).postalCode).toBeUndefined();
    }
  });

  it('rejects too short, too long and stray punctuation', () => {
    for (const postalCode of ['12', '12345678901', '-1000', '10#00', '10  00']) {
      expect(check({ postalCode }).postalCode).toEqual({ code: 'postalCode' });
    }
  });
});

describe('website', () => {
  it('is optional', () => {
    expect(check({ website: '' }).website).toBeUndefined();
  });

  it('accepts an address with or without a scheme', () => {
    for (const website of ['https://example.org', 'http://example.org/about', 'www.example.org', 'example.et']) {
      expect(check({ website }).website).toBeUndefined();
    }
  });

  it('rejects anything that is not a web address', () => {
    for (const website of ['not a website', 'localhost', 'ftp://example.org', 'javascript://x.y/%0Aalert(1)', 'a@b.c']) {
      expect(check({ website }).website).toEqual({ code: 'website' });
    }
  });
});

describe('normaliseWebsite', () => {
  it('adds https:// to a bare address and leaves a full one alone', () => {
    expect(normaliseWebsite(' example.org ')).toBe('https://example.org');
    expect(normaliseWebsite('http://example.org/a')).toBe('http://example.org/a');
  });

  it('is null for what is not a web address', () => {
    expect(normaliseWebsite('')).toBeNull();
    expect(normaliseWebsite('localhost')).toBeNull();
    expect(normaliseWebsite('mailto://a.b')).toBeNull();
  });
});

describe('contact details', () => {
  it('checks the work email', () => {
    expect(check({ email: 'not-an-email' }).email).toEqual({ code: 'email' });
    expect(check({ email: 'a@b.org' }).email).toBeUndefined();
  });

  it('applies the real Ethiopian mobile rule for +251', () => {
    expect(check({ phoneNumber: '911234567' }).phoneNumber).toBeUndefined();
    expect(check({ phoneNumber: '0711234567' }).phoneNumber).toBeUndefined();
    expect(check({ phoneNumber: '0211234567' }).phoneNumber).toEqual({ code: 'phoneEthiopia' });
    expect(check({ phoneNumber: '91123' }).phoneNumber).toEqual({ code: 'phoneEthiopia' });
  });

  it('applies only the loose check for another country, and re-judges when the dial code changes', () => {
    expect(check({ phoneCode: '+254', phoneNumber: '712345678' }).phoneNumber).toBeUndefined();
    expect(check({ phoneCode: '+254', phoneNumber: '12' }).phoneNumber).toEqual({ code: 'phone' });
    // Valid as an Ethiopian-style number, but the field now says +254 — still passes the loose rule.
    expect(validateOrganisationField('phoneNumber', { ...VALID, phoneCode: '+254' }, ENTITY_TYPES)).toBeNull();
  });
});
