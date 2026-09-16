// Bridges the submitter-identity info collected at registration into Submit
// Grievance's own "Submitter Identity" step, so a returning user isn't asked
// to retype it. This is a frontend-only stand-in: `oan_grievance_service` has
// no endpoint yet to persist this server-side (see the register route, which
// only ever forwards email/password/full_name/phone_number to the auth
// backend) — swap this for a real API call once one exists.

const STORAGE_KEY_PREFIX = 'oan_submitter_profile:';

export interface SubmitterProfile {
  submitterType: string;
  identityValues: Record<string, string>;
}

function storageKey(email: string): string {
  return `${STORAGE_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

/** Best-effort: a private window or blocked storage just means no prefill later, not a hard failure. */
export function saveSubmitterProfile(email: string, profile: SubmitterProfile): void {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(profile));
  } catch {
    // ignored — see comment above
  }
}

export function loadSubmitterProfile(email: string): SubmitterProfile | null {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as SubmitterProfile;
  } catch {
    return null;
  }
}

/** Called on logout — this is PII (name, phone, national ID) and must not outlive the session that collected it. */
export function clearSubmitterProfile(email: string): void {
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    // ignored — see saveSubmitterProfile
  }
}
