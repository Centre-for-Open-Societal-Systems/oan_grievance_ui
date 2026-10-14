import { z } from 'zod';
import { ORGANISATION_SUBMITTER_TYPES, registrableSubmitterTypeSchema } from './submitterType';

/**
 * The channel Submit Grievance starts on for an account with none. Registration
 * doesn't send a channel: it has no selector, and the backend registers every
 * account under `Web Portal` itself, which is the same default.
 */
export const DEFAULT_SUBMISSION_CHANNEL = 'Web Portal';

/** A Fayda ID is exactly 16 digits — what the backend's registration check requires too. */
export const FAYDA_ID_PATTERN = /^\d{16}$/;

/**
 * An organisation registration number: 3-60 letters and digits, with single `-` or `/` between
 * groups. The same rule as the backend's (`REGISTRATION_PATTERN` in oan_grievance_service's
 * services/identity.py), so a number it would refuse is caught here with a reason.
 */
export const REGISTRATION_NUMBER_PATTERN = /^(?=.{3,60}$)[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*$/;
const REGISTRATION_NUMBER_MESSAGE =
  'Registration number must be 3-60 letters or numbers; hyphens or slashes are allowed between them.';

/**
 * The submitter fields `/api/auth/register` forwards to the backend, besides
 * the account's own. Parsing through this drops every other key the caller
 * sent, so nothing unvetted (a `role`, a `dedupe_key`, a `submission_channel`)
 * reaches the backend.
 */
export const registerSubmitterFieldsSchema = z
  .object({
    submitter_type: registrableSubmitterTypeSchema.optional(),
    fayda_id: z
      .string({ error: 'Fayda ID must be a 16-digit number.' })
      .trim()
      .regex(FAYDA_ID_PATTERN, 'Fayda ID must be a 16-digit number.')
      .optional(),
    registration_number: z
      .string({ error: REGISTRATION_NUMBER_MESSAGE })
      .trim()
      .regex(REGISTRATION_NUMBER_PATTERN, REGISTRATION_NUMBER_MESSAGE)
      .optional(),
  })
  .superRefine((fields, context) => {
    // An NGO / FPO is identified by its registration number and has no Fayda ID; everyone else has no
    // registration number. Sending the wrong one would only be refused by the backend, with a worse message.
    const isOrganisation = (ORGANISATION_SUBMITTER_TYPES as readonly string[]).includes(fields.submitter_type ?? '');
    if (isOrganisation && !fields.registration_number) {
      context.addIssue({ code: 'custom', path: ['registration_number'], message: 'Registration number is required.' });
    }
    if (isOrganisation && fields.fayda_id) {
      context.addIssue({ code: 'custom', path: ['fayda_id'], message: 'An organisation has no Fayda ID.' });
    }
    if (!isOrganisation && fields.registration_number) {
      context.addIssue({
        code: 'custom',
        path: ['registration_number'],
        message: 'Only an NGO or FPO registers with a registration number.',
      });
    }
  });

export type RegisterSubmitterFields = z.infer<typeof registerSubmitterFieldsSchema>;
