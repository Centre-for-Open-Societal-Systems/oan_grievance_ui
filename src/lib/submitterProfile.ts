// Bridges the submitter-identity info collected at registration into Submit
// Grievance's own "Submitter Identity" step, so a returning user isn't asked
// to retype it. This is a frontend-only stand-in: `oan_grievance_service` has
// no endpoint yet to persist this server-side (see the register route, which
// only ever forwards email/password/full_name/phone_number to the auth
// backend) — swap this for a real API call once one exists.
//
// Deliberately NOT a general-purpose store for `identityValues`: national ID
// fields (Fayda ID and its per-type variants) are stripped before anything
// touches localStorage, never round-tripped, and never written in the first
// place — see `stripSensitiveFields`. Everything that IS stored expires on
// its own (`PROFILE_TTL_MS`) so it doesn't outlive every exit path that isn't
// an explicit logout (closing the tab, a cookie expiring, registering and
// never signing in) — `clearSubmitterProfile` on logout is defence in depth,
// not the only thing standing between this and indefinite retention.

import { z } from 'zod';

const STORAGE_KEY_PREFIX = 'oan_submitter_profile:';

// One working day. Long enough that a user who registers and returns the
// same afternoon still gets the prefill; short enough that a shared/kiosk
// device isn't carrying someone's data around for weeks.
const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Keys that must never reach localStorage, whatever submitter type they came
 * from — every national-ID-variant field across the SI-*Form components.
 * Listed explicitly (not inferred) so a future SI-*Form adding another ID
 * field is invisible to this list, not silently trusted by it.
 */
const SENSITIVE_FIELD_KEYS = ['faydaId', 'representativeFaydaId', 'officialFaydaId'];

function stripSensitiveFields(identityValues: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(identityValues).filter(([key]) => !SENSITIVE_FIELD_KEYS.includes(key)));
}

const storedProfileSchema = z.object({
  submitterType: z.string(),
  identityValues: z.record(z.string(), z.string()),
  savedAt: z.number(),
});

export interface SubmitterProfile {
  submitterType: string;
  identityValues: Record<string, string>;
}

function storageKey(email: string): string {
  return `${STORAGE_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

/**
 * Best-effort: a private window or blocked storage just means no prefill
 * later, not a hard failure. `identityValues` is expected to still include
 * whatever sensitive fields the caller collected — stripping happens here,
 * once, so every caller gets the same guarantee regardless of whether it
 * remembered to filter first.
 */
export function saveSubmitterProfile(email: string, profile: SubmitterProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const toStore: z.infer<typeof storedProfileSchema> = {
      submitterType: profile.submitterType,
      identityValues: stripSensitiveFields(profile.identityValues),
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(email), JSON.stringify(toStore));
  } catch {
    // ignored — see comment above
  }
}

/**
 * Returns null for: no stored profile, an expired one (cleared as a side
 * effect), or one that doesn't parse as the shape this module writes —
 * `JSON.parse` alone would trust attacker- or extension-writable localStorage
 * content as a typed object, so this validates the parsed shape with Zod
 * before returning it rather than asserting it.
 */
export function loadSubmitterProfile(email: string): SubmitterProfile | null {
  // Explicit, not just caught: a Server Component (or a Client Component's
  // server-side render pass) has no localStorage at all. Relying on the
  // catch block below to turn that into "no prefill" would make this safe
  // by accident of what ReferenceError happens to do, not by design.
  if (typeof window === 'undefined') return null;
  try {
    const key = storageKey(email);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const result = storedProfileSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - result.data.savedAt > PROFILE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return { submitterType: result.data.submitterType, identityValues: result.data.identityValues };
  } catch {
    return null;
  }
}

/** Called on logout — defence in depth on top of the TTL above, for the common case where a session ends cleanly. */
export function clearSubmitterProfile(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    // ignored — see saveSubmitterProfile
  }
}
