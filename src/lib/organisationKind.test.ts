// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearOrganisationIntent, loadOrganisationIntent, saveOrganisationIntent } from './organisationIntent';
import { clearSubmitterProfile, saveSubmitterProfile } from './submitterProfile';
import { organisationKindFor, ORGANISATION_ROUTE } from './organisationKind';
import { resolveOrganisationKind } from './resolveOrganisationKind';

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

describe('resolveOrganisationKind', () => {
  afterEach(() => localStorage.clear());

  it('is null with no user', () => {
    expect(resolveOrganisationKind(null)).toBeNull();
  });

  it("prefers the backend's type over the registration choice saved on this device", () => {
    saveSubmitterProfile('rep@ngo.org', { submitterType: 'cooperative', identityValues: {} });
    expect(resolveOrganisationKind({ email: 'rep@ngo.org', type: 'NGO' })).toBe('ngo');
  });

  it('falls back to the registration choice while the backend still reports the default type', () => {
    saveSubmitterProfile('rep@fpo.org', { submitterType: 'cooperative', identityValues: {} });
    expect(resolveOrganisationKind({ email: 'rep@fpo.org', type: 'Individual Farmer' })).toBe('fpo');
  });

  it('is null for a farmer with nothing saved', () => {
    expect(resolveOrganisationKind({ email: 'farmer@example.com', type: 'Individual Farmer' })).toBeNull();
  });

  it('still finds the sign-up choice after a logout, which wipes the registration prefill', () => {
    saveSubmitterProfile('rep@ngo.org', { submitterType: 'ngo', identityValues: {} });
    saveOrganisationIntent('rep@ngo.org', 'ngo');

    clearSubmitterProfile('rep@ngo.org'); // what performLogout does

    expect(resolveOrganisationKind({ email: 'rep@ngo.org', type: 'Individual Farmer' })).toBe('ngo');
  });

  it("puts the backend's type ahead of the sign-up note", () => {
    saveOrganisationIntent('rep@ngo.org', 'ngo');
    expect(resolveOrganisationKind({ email: 'rep@ngo.org', type: 'FPO' })).toBe('fpo');
  });
});

describe('organisation intent', () => {
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('round-trips, ignoring email case and surrounding spaces', () => {
    saveOrganisationIntent(' Rep@NGO.org ', 'fpo');
    expect(loadOrganisationIntent('rep@ngo.org')).toBe('fpo');
  });

  it('is gone once cleared', () => {
    saveOrganisationIntent('rep@ngo.org', 'ngo');
    clearOrganisationIntent('rep@ngo.org');
    expect(loadOrganisationIntent('rep@ngo.org')).toBeNull();
  });

  it('expires after 30 days, and is removed when found expired', () => {
    vi.useFakeTimers();
    saveOrganisationIntent('rep@ngo.org', 'ngo');

    vi.advanceTimersByTime(29 * 24 * 60 * 60 * 1000);
    expect(loadOrganisationIntent('rep@ngo.org')).toBe('ngo');

    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(loadOrganisationIntent('rep@ngo.org')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('ignores a value this module did not write', () => {
    for (const junk of ['not json', '{"kind":"farmer","savedAt":1}', '{"kind":"ngo"}', 'null']) {
      localStorage.setItem('oan_org_intent:rep@ngo.org', junk);
      expect(loadOrganisationIntent('rep@ngo.org')).toBeNull();
    }
  });
});
