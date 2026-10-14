import { describe, expect, it } from 'vitest';
import { buildInitialOrganisationValues } from './defaults';

describe('buildInitialOrganisationValues', () => {
  it('starts empty but for Ethiopia and the +251 dial code when nobody is signed in', () => {
    const values = buildInitialOrganisationValues(null);
    expect(values.country).toBe('Ethiopia');
    expect(values.phoneCode).toBe('+251');
    expect(values.legalName).toBe('');
    expect(values.email).toBe('');
  });

  it('starts with the registration number the account signed up with, so it is not typed twice', () => {
    expect(buildInitialOrganisationValues({ email: 'rep@ngo.org', registration_number: 'REG-2024-0042' }).taxId).toBe(
      'REG-2024-0042'
    );
    expect(buildInitialOrganisationValues({ email: 'rep@ngo.org' }).taxId).toBe('');
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
