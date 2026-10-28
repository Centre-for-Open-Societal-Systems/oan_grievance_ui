// Field length ceilings, in one place so an input's `maxLength`, its counter and
// its validator can't drift apart.
//
// "Backend" limits mirror a rule the service enforces (oan_auth_service's
// RegisterUserSchema, oan_grievance_service's organisation schema, Frappe's own
// 140-character Data column). "Product" limits are ours: the backend stores these
// as unbounded Text, so the cap exists to keep a request a person can read, not
// because a longer one would be refused.

/** Frappe's `Data` column — what every short text field (names, places, titles) is stored in. */
export const DATA_FIELD_MAX_LENGTH = 140;

// --- Backend limits ----------------------------------------------------------

/** oan_auth_service: register, reset and set-initial password are all 8-128. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
/** oan_auth_service: officer create/reset `temporary_password`. */
export const TEMPORARY_PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;
export const FULL_NAME_MAX_LENGTH = DATA_FIELD_MAX_LENGTH;

// --- Product limits ----------------------------------------------------------

/** Submit grievance: the description (the backend only sets a minimum, of 20). */
export const DESCRIPTION_MAX_LENGTH = 5000;
/** Submit grievance: the desired outcome. */
export const DESIRED_OUTCOME_MAX_LENGTH = 1000;
/** A reason typed against a case: deferral, reassignment, or a review decision. */
export const REASON_MAX_LENGTH = 1000;
/** A response, internal note or template body written by staff. */
export const RESPONSE_TEXT_MAX_LENGTH = 2000;
