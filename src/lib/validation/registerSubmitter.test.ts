import { describe, expect, it } from 'vitest';
import { registerSubmitterFieldsSchema } from './registerSubmitter';

describe('registerSubmitterFieldsSchema', () => {
  it('accepts a type and a 16-digit Fayda ID', () => {
    const input = { submitter_type: 'Individual Farmer', fayda_id: '6557092147530500' };
    expect(registerSubmitterFieldsSchema.parse(input)).toEqual(input);
  });

  it('treats both as optional', () => {
    expect(registerSubmitterFieldsSchema.parse({})).toEqual({});
  });

  it('drops any other key instead of passing it through', () => {
    const parsed = registerSubmitterFieldsSchema.parse({
      fayda_id: '6557092147530500',
      dedupe_key: 'x',
      role: 'Grievance Admin',
      submission_channel: 'Web Portal',
    });
    expect(parsed).toEqual({ fayda_id: '6557092147530500' });
  });

  it('rejects a Fayda ID that is not exactly 16 digits, or not text', () => {
    for (const fayda_id of [
      '12345',
      '65570921475305001',
      '6557-0921-4753-0500',
      'ET-FAYDA-344012394',
      '',
      6557092147530500,
    ]) {
      const result = registerSubmitterFieldsSchema.safeParse({ fayda_id });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Fayda ID must be a 16-digit number.');
    }
  });

  it('accepts an NGO / FPO with its registration number, trimmed', () => {
    for (const submitter_type of ['NGO', 'FPO']) {
      expect(registerSubmitterFieldsSchema.parse({ submitter_type, registration_number: '  REG-2024/0042 ' })).toEqual({
        submitter_type,
        registration_number: 'REG-2024/0042',
      });
    }
  });

  it('requires an NGO / FPO to have a registration number and forbids it a Fayda ID', () => {
    const missing = registerSubmitterFieldsSchema.safeParse({ submitter_type: 'NGO' });
    expect(missing.error?.issues[0]?.message).toBe('Registration number is required.');

    const withFayda = registerSubmitterFieldsSchema.safeParse({
      submitter_type: 'FPO',
      registration_number: 'REG-1',
      fayda_id: '6557092147530500',
    });
    expect(withFayda.error?.issues[0]?.message).toBe('An organisation has no Fayda ID.');
  });

  it('forbids a registration number for every other type', () => {
    for (const submitter_type of ['Individual Farmer', 'Development Agent', undefined]) {
      const result = registerSubmitterFieldsSchema.safeParse({ submitter_type, registration_number: 'REG-1' });
      expect(result.error?.issues[0]?.message).toBe('Only an NGO or FPO registers with a registration number.');
    }
  });

  it('applies the backend’s registration-number rule: 3-60 letters/digits, single - or / between groups', () => {
    for (const registration_number of ['123', 'REG-2024-0042', 'COOP/XX/1', 'a'.repeat(60)]) {
      expect(registerSubmitterFieldsSchema.safeParse({ submitter_type: 'NGO', registration_number }).success).toBe(true);
    }
    for (const registration_number of ['12', 'a'.repeat(61), 'AB 12', 'AB--12', '-AB12', 'AB12-', '', 1234567]) {
      expect(registerSubmitterFieldsSchema.safeParse({ submitter_type: 'NGO', registration_number }).success).toBe(false);
    }
  });

  it('rejects an unsupported type', () => {
    expect(registerSubmitterFieldsSchema.safeParse({ submitter_type: 'Cooperative' }).success).toBe(false);
  });
});
