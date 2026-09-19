/** Local mobile number digits, excluding any country/dial code prefix. */
export const PHONE_NUMBER_LENGTH = 10;

export const PHONE_NUMBER_REGEX = /^\d{10}$/;

/**
 * E.164 Ethiopian mobile — the form a live account's own phone number
 * already comes in as (e.g. `user.mobile_no`, prefilled straight into
 * Submit Grievance's Step 1 without the user retyping it). A validator that
 * only accepted `PHONE_NUMBER_REGEX`'s bare local form would reject every
 * returning signed-in user's own, already-valid, prefilled number.
 */
export const PHONE_NUMBER_E164_REGEX = /^\+251\d{9}$/;

/** True for either the bare local form a user types, or the E.164 form a live profile already comes in as. */
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
