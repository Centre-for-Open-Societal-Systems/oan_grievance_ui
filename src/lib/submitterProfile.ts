// A short-lived, same-browser fallback for Submit Grievance's "Submitter
// Identity" step. The account itself is the source of truth now: registration
// sends the submitter type, Fayda ID and submission channel to the backend,
// and `/auth/me` returns them (see `getMe`), so Step 1's type, Fayda ID and
// channel come from there on any browser, at any time. What this still carries
// is what the backend has no field for — the other per-type details typed on
// the register profile step (organisation name, representative, and so on) —
// and it never holds a national ID (RegisterForm drops those before saving).
// Expires on its own (`PROFILE_TTL_MS`) so it doesn't outlive every exit path
// that isn't an explicit logout (closing the tab, a cookie expiring,
// registering and never signing in) — `clearSubmitterProfile` on logout is
// defence in depth, not the only thing standing between this and indefinite
// retention.

import { z } from 'zod';

const STORAGE_KEY_PREFIX = 'oan_submitter_profile:';

// One hour. Enough for someone who registers and signs straight in to still
// get the extra details prefilled; short enough that a shared/kiosk device
// isn't carrying someone's data around, now that the account is what remembers
// them.
const PROFILE_TTL_MS = 60 * 60 * 1000;

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
 * later, not a hard failure.
 */
export function saveSubmitterProfile(email: string, profile: SubmitterProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const toStore: z.infer<typeof storedProfileSchema> = {
      submitterType: profile.submitterType,
      identityValues: profile.identityValues,
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
