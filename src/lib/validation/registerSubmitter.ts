import { z } from 'zod';
import { registrableSubmitterTypeSchema } from './submitterType';

/**
 * The channel every self-registered account is created with. Registration has
 * no channel selector, and `Web Portal` is a standard channel the backend seeds.
 * It is also what Submit Grievance falls back to for an account with none.
 */
export const DEFAULT_SUBMISSION_CHANNEL = 'Web Portal';

/** A Fayda ID is exactly 16 digits — what the backend's registration check requires too. */
export const FAYDA_ID_PATTERN = /^\d{16}$/;

/**
 * The submitter fields `/api/auth/register` forwards to the backend, besides
 * the account's own. Parsing through this drops every other key the caller
 * sent, so nothing unvetted (a `role`, a `dedupe_key`) reaches the backend.
 *
 * The channel is only checked for shape: which channels exist and are active is
 * the backend's to say, and its message is shown on the register form.
 */
export const registerSubmitterFieldsSchema = z.object({
  submitter_type: registrableSubmitterTypeSchema.optional(),
  fayda_id: z
    .string({ error: 'Fayda ID must be a 16-digit number.' })
    .trim()
    .regex(FAYDA_ID_PATTERN, 'Fayda ID must be a 16-digit number.')
    .optional(),
  submission_channel: z
    .string({ error: 'Submission channel is invalid.' })
    .trim()
    .min(1, 'Submission channel is invalid.')
    .max(140, 'Submission channel is invalid.')
    .optional(),
});

export type RegisterSubmitterFields = z.infer<typeof registerSubmitterFieldsSchema>;
