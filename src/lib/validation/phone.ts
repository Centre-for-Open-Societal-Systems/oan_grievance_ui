/** Local mobile number digits, excluding any country/dial code prefix. Accepts 9 digits (national subscriber) or 10 digits (with domestic trunk 0). */
export const PHONE_NUMBER_LENGTH = 10;

export const PHONE_NUMBER_REGEX = /^\d{9,10}$/;

/**
 * General E.164 — shared by this module and `src/app/api/auth/register/
 * route.ts` (which imports this constant rather than keeping its own copy,
 * since the form there sends a number already combined with a country/dial
 * code, the same shape this one accepts alongside the bare local form).
 */
export const PHONE_NUMBER_E164_REGEX = /^\+\d{8,15}$/;

export const KNOWN_COUNTRY_CODES = ['+251', '+254', '+255', '+256', '+250', '+252', '+253', '+258', '+1'];

/** True for either the bare local form (9 or 10 digits) a user types, or the E.164 form a live profile already comes in as. */
export function isValidPhoneNumber(value: string): boolean {
  return PHONE_NUMBER_REGEX.test(value) || PHONE_NUMBER_E164_REGEX.test(value);
}
/** Strips every non-digit character (spaces, dashes, parens, `+`, letters). */
export function toDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Drops a single leading trunk `0` from a local number before it's
 * concatenated with a country/dial code (e.g. domestic "0911000000" ->
 * "911000000" so "+251" + result is valid E.164, not "+2510911000000").
 */
export function stripLeadingZero(digits: string): string {
  return digits.replace(/^0/, '');
}

export interface ParsedPhone {
  phoneCode: string;
  phoneNumber: string;
}

/**
 * Splits an E.164 or raw phone string into its dial code and local subscriber digits.
 * e.g. "+251911234567" -> { phoneCode: "+251", phoneNumber: "911234567" }
 * e.g. "0911234567" -> { phoneCode: "+251", phoneNumber: "0911234567" }
 */
export function splitPhoneNumber(rawPhone?: string | null): ParsedPhone {
  if (!rawPhone || !rawPhone.trim()) {
    return { phoneCode: '+251', phoneNumber: '' };
  }
  const trimmed = rawPhone.trim();

  if (trimmed.startsWith('+')) {
    const matched = KNOWN_COUNTRY_CODES.find((code) => trimmed.startsWith(code));
    if (matched) {
      const rest = toDigitsOnly(trimmed.slice(matched.length));
      return { phoneCode: matched, phoneNumber: rest };
    }
    const generic = trimmed.match(/^(\+\d{1,3})(\d+)$/);
    if (generic && generic[1] && generic[2]) {
      return { phoneCode: generic[1], phoneNumber: generic[2] };
    }
  }

  const digits = toDigitsOnly(trimmed);
  if (digits.startsWith('251') && digits.length >= 12) {
    return { phoneCode: '+251', phoneNumber: digits.slice(3) };
  }

  return { phoneCode: '+251', phoneNumber: digits };
}

/**
 * Normalizes a phone number and country code into canonical E.164 format (+<code><digits>).
 * Handles:
 * - Already in E.164 form: "+251911234567" -> "+251911234567"
 * - Domestic form with trunk 0: "0911234567", "+251" -> "+251911234567"
 * - Bare subscriber digits: "911234567", "+251" -> "+251911234567"
 * - Country code accidentally typed in local box: "251911234567", "+251" -> "+251911234567"
 */
export function formatToE164(phoneNumber?: string | null, phoneCode: string = '+251'): string {
  if (!phoneNumber) return '';
  const trimmed = phoneNumber.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = toDigitsOnly(trimmed);
  if (!digits) return '';

  const codeDigits = toDigitsOnly(phoneCode);
  if (codeDigits && digits.startsWith(codeDigits) && digits.length > codeDigits.length + 6) {
    return `+${digits}`;
  }

  const cleanCode = phoneCode.startsWith('+') ? phoneCode : `+${phoneCode}`;
  const localDigits = stripLeadingZero(digits);
  return `${cleanCode}${localDigits}`;
}
