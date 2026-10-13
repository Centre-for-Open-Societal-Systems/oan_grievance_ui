// Remembers, in this browser, that an account signed up as an NGO or FPO and
// has not yet registered the organisation itself.
//
// The backend cannot hold this: it refuses an organisation type at account
// registration (it demands the organisation's registration number, which is
// only asked later, on the onboarding screen), so until the organisation is
// registered the account's profile type is still "Individual Farmer". This
// note is what sends such a representative to /ngo or /fpo at sign-in instead
// of Submit Grievance.
//
// Deliberately not part of `submitterProfile.ts`: that one holds identity
// details, expires after a day and is wiped on logout — fine for a prefill,
// wrong for this, which must survive signing out and back in until the
// organisation exists. It holds only a type, never a detail. Once the backend
// itself reports an organisation type (the organisation is registered) the
// note is redundant and is removed (`clearOrganisationIntent`).

import type { OrganisationKind } from '@/lib/organisationKind';

const STORAGE_KEY_PREFIX = 'oan_org_intent:';

// Long enough to cover someone who signs up and finishes onboarding days
// later, short enough that an abandoned sign-up does not leave a note on a
// shared device indefinitely.
const INTENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function storageKey(email: string): string {
  return `${STORAGE_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

/** Best-effort: blocked storage just means the fallback is not there. */
export function saveOrganisationIntent(email: string, kind: OrganisationKind): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(email), JSON.stringify({ kind, savedAt: Date.now() }));
  } catch {
    // ignored — see above
  }
}

/** The remembered kind, or null if there is none, it expired, or it is not one this module wrote. */
export function loadOrganisationIntent(email: string): OrganisationKind | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = storageKey(email);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    const { kind, savedAt } = (parsed ?? {}) as { kind?: unknown; savedAt?: unknown };
    const valid = (kind === 'ngo' || kind === 'fpo') && typeof savedAt === 'number';
    if (!valid || Date.now() - savedAt > INTENT_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return kind;
  } catch {
    return null;
  }
}

export function clearOrganisationIntent(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    // ignored — see saveOrganisationIntent
  }
}
