// The submitter types registration can create, and the names the backend knows
// them by. Plain module (no React) so the register API route can import it too.
//
// The backend profile's `submitter_type` is what `/auth/me` returns as the
// user's type — it drives the header badge, the Profile page and Submit
// Grievance's starting type — and it can only be set when the account is
// registered; there is no endpoint to change it afterwards.
//
// Only types the backend can register from the fields this form collects are
// listed. Individual Farmer needs a Fayda ID, which the profile step collects.
// The organisation types (Cooperative, FPO, NGO, Woreda/Kebele Body)
// additionally need a registration number, which registration doesn't send, so
// asking for one of them would make the backend reject the sign-up outright;
// they have no entry here and register with the backend's default type.
import { z } from 'zod';

/** The backend type names registration may request — the register route refuses anything else. */
export const REGISTRABLE_SUBMITTER_TYPES = ['Individual Farmer', 'Development Agent'] as const;

export const registrableSubmitterTypeSchema = z.enum(REGISTRABLE_SUBMITTER_TYPES, {
  error: 'Unsupported submitter type.',
});

const BACKEND_TYPE_BY_SUBMITTER_TYPE: Record<string, (typeof REGISTRABLE_SUBMITTER_TYPES)[number]> = {
  individual: 'Individual Farmer',
  development_agent: 'Development Agent',
};

/** The backend type name to register `submitterType` as, or undefined to leave it to the backend's default. */
export function backendSubmitterTypeFor(submitterType: string): string | undefined {
  return BACKEND_TYPE_BY_SUBMITTER_TYPE[submitterType];
}
