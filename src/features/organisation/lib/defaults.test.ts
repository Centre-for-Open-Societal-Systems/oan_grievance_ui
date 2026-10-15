import { describe, expect, it } from 'vitest';
import { buildInitialOrganisationValues } from './defaults';

describe('buildInitialOrganisationValues', () => {
  it('starts empty but for Ethiopia and the +251 dial code when nobody is signed in', () => {
    const values = buildInitialOrganisationValues(null);
    expect(values.country).toBe('Ethiopia');
    expect(values.phoneCode).toBe('+251');
    expect(values.legalName).toBe('');
    expect(values.email).toBe('');
    expect(values.representativeName).toBe('');
    expect(values.memberCount).toBe('');
  });

  it('starts the authorised representative as the account holder, and leaves the organisation fields to be typed', () => {
    const values = buildInitialOrganisationValues({ email: 'rep@ngo.org', full_name: 'Almaz Tesfaye' });
    expect(values.representativeName).toBe('Almaz Tesfaye');
    expect(values.legalName).toBe('');
    expect(values.taxId).toBe('');
    expect(values.memberCount).toBe('');
  });

  it("pre-fills the contact from the account's email and a combined mobile number", () => {
    const values = buildInitialOrganisationValues({ email: 'rep@ngo.org', mobile_no: '+251911234567' });
    expect(values.email).toBe('rep@ngo.org');
    expect(values.phoneCode).toBe('+251');
    expect(values.phoneNumber).toBe('911234567');
  });

  it('prefers a split phone number when the account has one', () => {
    const values = buildInitialOrganisationValues({
      email: 'rep@ngo.org',
      phone_number: '712345678',
      country_code: '+254',
      mobile_no: '+251911234567',
    });
    expect(values.phoneCode).toBe('+254');
    expect(values.phoneNumber).toBe('712345678');
  });
});
