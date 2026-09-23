import { describe, expect, it } from 'vitest';
import { getFieldFormatErrors, getMissingRequiredFields } from './fields';
import { formatToE164, splitPhoneNumber } from '@/lib/validation/phone';

describe('getMissingRequiredFields', () => {
  it('lists labels of required fields left empty', () => {
    const missing = getMissingRequiredFields('individual', { fullName: 'A Farmer' });
    expect(missing).toContain('Fayda ID');
    expect(missing).toContain('Contact Number');
    expect(missing).not.toContain('Full Name');
  });

  it('skips a field named in hiddenFields even when empty', () => {
    const missing = getMissingRequiredFields('individual', {}, ['fullName']);
    expect(missing).not.toContain('Full Name');
  });

  it('treats a whitespace-only value the same as empty', () => {
    const missing = getMissingRequiredFields('individual', { fullName: '   ' });
    expect(missing).toContain('Full Name');
  });

  it('returns nothing for an unknown submitter type', () => {
    expect(getMissingRequiredFields('not-a-real-type', {})).toEqual([]);
  });
});

describe('getFieldFormatErrors', () => {
  it('accepts a well-formed Fayda ID', () => {
    expect(getFieldFormatErrors('individual', { faydaId: '1234-5678-9012' })).toEqual([]);
  });

  it('rejects a Fayda ID shorter than the backend minimum', () => {
    const errors = getFieldFormatErrors('individual', { faydaId: 'ab' });
    expect(errors.some((e) => e.includes('Fayda ID'))).toBe(true);
  });

  it('rejects a Fayda ID with disallowed characters', () => {
    const errors = getFieldFormatErrors('individual', { faydaId: '1234 5678!!' });
    expect(errors.some((e) => e.includes('Fayda ID'))).toBe(true);
  });

  it('checks representativeFaydaId / officialFaydaId under the same rule as faydaId', () => {
    expect(getFieldFormatErrors('cooperative', { representativeFaydaId: 'ab' }).length).toBe(1);
    expect(getFieldFormatErrors('woreda_kebele', { officialFaydaId: 'valid-id-123' }).length).toBe(0);
  });

  it('validates registrationNumber only for the types that collect it', () => {
    expect(getFieldFormatErrors('cooperative', { registrationNumber: '!!' }).length).toBe(1);
    expect(getFieldFormatErrors('cooperative', { registrationNumber: 'COOP-2024-001' }).length).toBe(0);
    // individual has no registrationNumber field at all - an arbitrary value under that key is ignored, not validated
    expect(getFieldFormatErrors('individual', { registrationNumber: '!!' })).toEqual([]);
  });

  it('validates email format when a value is present', () => {
    expect(getFieldFormatErrors('individual', { email: 'not-an-email' }).length).toBe(1);
    expect(getFieldFormatErrors('individual', { email: 'farmer@example.com' })).toEqual([]);
  });

  it('validates phoneNumber against 9-digit (subscriber) or 10-digit (domestic) rules', () => {
    expect(getFieldFormatErrors('individual', { phoneNumber: '123' }).length).toBe(1);
    expect(getFieldFormatErrors('individual', { phoneNumber: '0912345678' })).toEqual([]);
    expect(getFieldFormatErrors('individual', { phoneNumber: '912345678' })).toEqual([]);
  });

  it('also accepts phoneNumber in E.164 form, the shape a live account prefills it in', () => {
    // Submit Grievance Step 1 seeds phoneNumber straight from user.mobile_no
    // for a signed-in user - rejecting that shape would block every
    // returning user on a field they never typed. Deliberately not pinned
    // to exactly 9 digits after +251: authApi.test.ts's own fixture for a
    // real getMe() response is "+2519344012394" (10 digits after +251) -
    // an earlier, stricter version of this check rejected that exact,
    // real, already-valid value.
    expect(getFieldFormatErrors('individual', { phoneNumber: '+251912345678' })).toEqual([]);
    expect(getFieldFormatErrors('individual', { phoneNumber: '+2519344012394' })).toEqual([]);
    expect(getFieldFormatErrors('individual', { phoneNumber: '+1234' }).length).toBe(1);
  });

  it('skips an empty optional field rather than reporting it as invalid', () => {
    expect(getFieldFormatErrors('individual', { email: '' })).toEqual([]);
    expect(getFieldFormatErrors('individual', {})).toEqual([]);
  });

  it('skips a field named in hiddenFields even if its value is malformed', () => {
    expect(getFieldFormatErrors('individual', { faydaId: 'ab' }, ['faydaId'])).toEqual([]);
  });

  it('returns nothing for an unknown submitter type', () => {
    expect(getFieldFormatErrors('not-a-real-type', { faydaId: 'ab' })).toEqual([]);
  });
});

describe('splitPhoneNumber', () => {
  it('splits +251 E.164 phone into dial code and subscriber digits', () => {
    expect(splitPhoneNumber('+251911234567')).toEqual({
      phoneCode: '+251',
      phoneNumber: '911234567',
    });
  });

  it('splits +1 US phone into dial code and subscriber digits', () => {
    expect(splitPhoneNumber('+12025550123')).toEqual({
      phoneCode: '+1',
      phoneNumber: '2025550123',
    });
  });

  it('handles domestic numbers without country code', () => {
    expect(splitPhoneNumber('0911234567')).toEqual({
      phoneCode: '+251',
      phoneNumber: '0911234567',
    });
  });

  it('handles empty or undefined phone', () => {
    expect(splitPhoneNumber('')).toEqual({
      phoneCode: '+251',
      phoneNumber: '',
    });
    expect(splitPhoneNumber(undefined)).toEqual({
      phoneCode: '+251',
      phoneNumber: '',
    });
  });
});

describe('formatToE164', () => {
  it('combines domestic number with leading zero and +251 country code', () => {
    expect(formatToE164('0911234567', '+251')).toBe('+251911234567');
  });

  it('combines 9-digit subscriber number with +251 country code', () => {
    expect(formatToE164('911234567', '+251')).toBe('+251911234567');
  });

  it('leaves already valid E.164 number untouched', () => {
    expect(formatToE164('+251911234567', '+251')).toBe('+251911234567');
  });

  it('handles country code typed into number input', () => {
    expect(formatToE164('251911234567', '+251')).toBe('+251911234567');
  });

  it('returns empty string for empty input', () => {
    expect(formatToE164('')).toBe('');
    expect(formatToE164(undefined)).toBe('');
  });
});
