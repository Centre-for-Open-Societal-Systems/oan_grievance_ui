import { describe, expect, it } from 'vitest';
import { organisationKindFor, organisationKindOf, ORGANISATION_ROUTE } from './organisationKind';

describe('organisationKindFor', () => {
  it('maps the backend type names', () => {
    expect(organisationKindFor('NGO')).toBe('ngo');
    expect(organisationKindFor('FPO')).toBe('fpo');
    expect(organisationKindFor('Cooperative')).toBe('fpo');
  });

  it('maps the UI submitter-type keys', () => {
    expect(organisationKindFor('ngo')).toBe('ngo');
    expect(organisationKindFor('cooperative')).toBe('fpo');
  });

  it('maps any cooperative spelling by whole word, but not a type that merely contains the letters', () => {
    for (const fpo of ['Cooperative Society', 'Cooperative / FPO', 'Primary Co-op', 'coop']) {
      expect(organisationKindFor(fpo)).toBe('fpo');
    }
    for (const other of ['Cooper Industries', 'Chickencoops', 'Scooped']) {
      expect(organisationKindFor(other)).toBeNull();
    }
  });

  it('is null for every other type, role and empty value', () => {
    for (const other of [
      'Individual Farmer',
      'individual',
      'Development Agent',
      'Woreda/Kebele Body',
      'Grievance Submitter',
      'Grievance Officer',
      '',
      '  ',
    ]) {
      expect(organisationKindFor(other)).toBeNull();
    }
    expect(organisationKindFor(undefined)).toBeNull();
    expect(organisationKindFor(null)).toBeNull();
  });

  it('gives every kind its own route', () => {
    expect(ORGANISATION_ROUTE.ngo).not.toBe(ORGANISATION_ROUTE.fpo);
  });
});

describe('organisationKindOf', () => {
  it("reads the account's backend type — set at sign-up, so known before the organisation is registered", () => {
    expect(organisationKindOf({ type: 'NGO' })).toBe('ngo');
    expect(organisationKindOf({ type: 'FPO' })).toBe('fpo');
  });

  it('is null for a farmer, an officer, or nobody', () => {
    expect(organisationKindOf({ type: 'Individual Farmer' })).toBeNull();
    expect(organisationKindOf({ type: 'Grievance Officer' })).toBeNull();
    expect(organisationKindOf({})).toBeNull();
    expect(organisationKindOf(null)).toBeNull();
    expect(organisationKindOf(undefined)).toBeNull();
  });
});
