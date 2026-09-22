/** Local mobile number digits, excluding any country/dial code prefix. */
export const PHONE_NUMBER_LENGTH = 10;

/**
 * A local Ethiopian mobile number as typed in the phone box: a leading trunk
 * `0` followed by a 9-digit subscriber number starting with `7` or `9`.
 *
 * Mirrors the backend's own rule exactly — `oan_grievance_service`'s
 * `normalise_mobile` / `MOBILE_PATTERN` (services/submission.py) strips a
 * leading `0` (or `+251`) and then requires exactly `^[79]\d{8}$` on what's
 * left. Before this matched that check, any 10 digits passed here (e.g.
 * "5454444444", no leading 0, first digit 5) — accepted at registration,
 * concatenated with the country code into a number the backend would only
 * ever reject, and surfacing only as a confusing field error the first time
 * a grievance was submitted, nowhere near where the bad number was typed.
 */
export const PHONE_NUMBER_REGEX = /^0[79]\d{8}$/;

/** The dial code this app has an actual, backend-confirmed local-number rule for. */
export const ETHIOPIA_DIAL_CODE = '+251';

export function isEthiopianDialCode(dialCode: string): boolean {
  return dialCode === ETHIOPIA_DIAL_CODE;
}

/**
 * The local-number check for every country the backend doesn't (yet) have a
 * real rule for. The phone-country picker already offers Kenya, Tanzania,
 * Uganda, Rwanda, Somalia, Djibouti, Mozambique and the US alongside
 * Ethiopia, but `oan_grievance_service`'s `normalise_mobile` only actually
 * validates Ethiopian numbers today (it explicitly rejects Tanzania/Kenya/
 * Somalia/Sudan codes as "confusable", and has no rule for the rest at all).
 * Inventing a per-country length/leading-digit rule here would just be a
 * second guess sitting next to the backend's real one and drifting from it
 * the moment that work ships — this only rules out what's clearly not a
 * phone number (too short, too long, non-digits), the same tolerance this
 * module already gives a trusted, backend-prefilled E.164 value.
 */
export const GENERIC_LOCAL_PHONE_REGEX = /^\d{4,14}$/;

/**
 * True for a local number that's valid for whichever dial code is selected:
 * the real Ethiopian rule for +251, or the generic sanity check above for
 * every other country until the backend has one of its own.
 */
export function isValidLocalPhoneForCountry(digits: string, dialCode: string): boolean {
  return isEthiopianDialCode(dialCode) ? PHONE_NUMBER_REGEX.test(digits) : GENERIC_LOCAL_PHONE_REGEX.test(digits);
}

/**
 * General E.164 — shared by this module and `src/app/api/auth/register/
 * route.ts` (which imports this constant rather than keeping its own copy,
 * since the form there sends a number already combined with a country/dial
 * code, the same shape this one accepts alongside the bare local form).
 * Deliberately loose (8-15 digits, not pinned to a specific country's
 * length) rather than "+251 plus exactly 9 digits": a live account's own phone number
 * (`user.mobile_no`, prefilled straight into Submit Grievance's Step 1
 * without the user retyping it) already comes from a trusted backend
 * source, normalized however that backend normalizes it — this repo's own
 * authApi.test.ts fixture for a real getMe() response is
 * "+2519344012394" as one concrete example, 10 digits after +251, not 9. A
 * stricter length check would reject a real, already-valid number the
 * app itself produced, on a field the user never touched.
 */
export const PHONE_NUMBER_E164_REGEX = /^\+\d{8,15}$/;

/**
 * True for either the bare local form a user types — valid for whichever
 * `dialCode` is currently selected, see `isValidLocalPhoneForCountry` — or
 * the E.164 form a live profile already comes in as. `dialCode` defaults to
 * Ethiopia so an existing caller that hasn't been updated to pass one yet
 * keeps today's (Ethiopia-only) behaviour rather than silently loosening.
 */
export function isValidPhoneNumber(value: string, dialCode: string = ETHIOPIA_DIAL_CODE): boolean {
  return isValidLocalPhoneForCountry(value, dialCode) || PHONE_NUMBER_E164_REGEX.test(value);
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
