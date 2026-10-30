import { fetchApi } from '@/lib/api/fetchApi';
import { ApiErrorCode, classifyError } from '@/lib/api/apiErrors';
import { buildSubmitFields, type BuildSubmitFieldsInput, type SubmitFields } from '../submitPayload';

/**
 * The body of `POST /api/v1/grievances` (oan_grievance_service's `submit`):
 * the wizard's fields plus consent. Identity fields ARE forwarded here,
 * unlike a signed-in individual's own profile fields: a
 * Cooperative/NGO/Woreda-Kebele/Development-Agent submission's
 * representative details never reach the backend any other way (see
 * `submitPayload.ts`'s `WizardIdentitySource` doc comment).
 */
export interface SubmitGrievancePayload extends SubmitFields {
  consent_given: number;
}

/**
 * What `POST /api/v1/grievances` actually returns. Everything below `routing_rule` is speculative (not in the
 * current response) and kept only so GrievanceSubmittedCard.tsx's richer
 * display degrades gracefully — those rows simply won't render — rather
 * than breaking the type the day the backend adds them for real.
 */
export interface SubmitGrievanceResult {
  ticket_number: string;
  status: string;
  workflow_state?: string;
  client_submission_uuid?: string;
  routing_rule?: string | null;
  assigned_department?: string | null;
  auto_routed?: boolean;
  sla_due_date?: string | null;
  possible_duplicates?: string[];
  area_path_code?: string | null;
  attachments?: number;
  duplicate_submission?: boolean;
  /** Set client-side when the case was filed but its staged attachments failed to upload. */
  attachment_upload_failed?: boolean;
}

/**
 * Shapes the wizard's state into the request body. Pure, so the mapping the
 * backend depends on (labels not slugs, an area ID not a name, trimmed text)
 * can be tested without rendering the wizard.
 */
export function buildSubmitGrievancePayload(input: BuildSubmitFieldsInput): SubmitGrievancePayload {
  return {
    ...buildSubmitFields(input),
    consent_given: 1,
  };
}

/** POST /api/v1/grievances — files the case and returns its ticket number. Authenticated submitters only. */
export async function submitGrievance(payload: SubmitGrievancePayload): Promise<SubmitGrievanceResult> {
  return fetchApi<SubmitGrievanceResult>('/api/v1/grievances', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Copy for a failed submit. A validation failure already carries a usable
 * per-field message from the backend, so that passes through; the sentinel
 * codes `fetchApi` throws for auth/permission/server failures don't, and would
 * otherwise reach the screen as a bare "FORBIDDEN".
 */
export function submitErrorMessage(error: unknown): string {
  switch (classifyError(error)) {
    case ApiErrorCode.Auth:
      return 'Your session has expired. Please sign in again to submit your grievance.';
    case ApiErrorCode.Forbidden:
      return 'Your account is not permitted to file grievances. Please contact your administrator.';
    case ApiErrorCode.Connection:
      return 'We could not reach the server. Please try again in a moment.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'We could not submit your grievance. Please try again.';
  }
}
