/** Local mobile number digits, excluding any country/dial code prefix. */
export const PHONE_NUMBER_LENGTH = 10;

export const PHONE_NUMBER_REGEX = /^\d{10}$/;

/**
 * General E.164 — matches `E164_PHONE_REGEX` in
 * `src/app/api/auth/register/route.ts` exactly (same 8-15 digit allowance,
 * not pinned to a specific country's length). Deliberately loose rather
 * than "+251 plus exactly 9 digits": a live account's own phone number
 * (`user.mobile_no`, prefilled straight into Submit Grievance's Step 1
 * without the user retyping it) already comes from a trusted backend
 * source, normalized however that backend normalizes it — this repo's own
 * authApi.test.ts fixture for a real getMe() response is
 * "+2519344012394" as one concrete example, 10 digits after +251, not 9. A
 * stricter length check would reject a real, already-valid number the
 * app itself produced, on a field the user never touched.
 */
export const PHONE_NUMBER_E164_REGEX = /^\+\d{8,15}$/;

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
