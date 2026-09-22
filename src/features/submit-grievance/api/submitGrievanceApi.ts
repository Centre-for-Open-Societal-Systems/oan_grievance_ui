import { fetchApi } from '@/lib/api/fetchApi';
import { ApiErrorCode, classifyError } from '@/lib/api/apiErrors';

/**
 * The body of `POST /api/v1/grievances` (oan_grievance_service's `submit`).
 *
 * Deliberately absent: the submitter's own name, mobile, email and type. For a
 * signed-in submitter the backend fills those from their profile and ignores
 * any client-supplied copy (`CLIENT_IMMUTABLE_FIELDS`), so sending them would
 * only suggest they were honoured.
 */
export interface SubmitGrievancePayload {
  /** Display name of a Grievance Submission Type, e.g. "Web Portal". */
  submission_channel: string;
  /** Display name of a Grievance Service Category, e.g. "Inputs". */
  service_category: string;
  /** Type name, e.g. "Fertilizer Shortage". The backend resolves it to the type's ID. */
  grievance_type: string;
  description: string;
  /** What the submitter would like done about it. Empty when they left it blank. */
  desired_outcome: string;
  /** The store, cooperative, bank or market the grievance is about. Empty when left blank. */
  associated_service_provider: string;
  /** `area_id` of the woreda or kebele filed against — never a display name (see `findFilingArea`). */
  administrative_area: string;
  /**
   * The kebele's display name, kept on the case as its `administrative_unit`
   * label — or "" when none was chosen. Always sent, even when empty: the
   * backend merges the saved draft underneath this body and only lets a
   * non-null request value overwrite it, so omitting the key would let a
   * kebele picked and later cleared (but not re-saved) resurface from the draft.
   */
  kebele: string;
  consent_given: 1;
  /** The wizard's draft: the backend moves the files uploaded against it onto the new case. */
  client_uuid: string;
  /**
   * Idempotency key. A retry carrying the same value gets the original ticket
   * back instead of lodging a second case, which is what makes it safe for
   * `fetchApi` to replay this POST after a token refresh, or for the user to
   * press Submit again after a dropped connection.
   */
  client_submission_uuid: string;
}

export interface SubmitGrievanceResult {
  ticket_number: string;
  status: string;
  /** Absent on a `duplicate_submission` reply, which only carries the original ticket and status. */
  assigned_department?: string | null;
  auto_routed?: boolean;
  sla_due_date?: string | null;
  possible_duplicates?: string[];
  area_path_code?: string | null;
  attachments?: number;
  duplicate_submission?: boolean;
}

interface BuildPayloadInput {
  submissionChannel: string;
  serviceCategory: string;
  grievanceType: string;
  description: string;
  desiredOutcome?: string;
  serviceProvider?: string;
  areaId: string;
  kebele?: string;
  /** Identifies this wizard's draft; also reused as the idempotency key. */
  clientUuid: string;
}

/**
 * Shapes the wizard's state into the request body. Pure, so the mapping the
 * backend depends on (labels not slugs, an area ID not a name, trimmed text)
 * can be tested without rendering the wizard.
 */
export function buildSubmitGrievancePayload(input: BuildPayloadInput): SubmitGrievancePayload {
  return {
    submission_channel: input.submissionChannel,
    service_category: input.serviceCategory,
    grievance_type: input.grievanceType,
    description: input.description.trim(),
    // Always sent, blank or not, like `kebele`: the backend lets a non-null
    // request value overwrite the saved draft's, so a blank is a real answer.
    desired_outcome: input.desiredOutcome?.trim() ?? '',
    associated_service_provider: input.serviceProvider?.trim() ?? '',
    administrative_area: input.areaId,
    kebele: input.kebele?.trim() ?? '',
    consent_given: 1,
    client_uuid: input.clientUuid,
    client_submission_uuid: input.clientUuid,
  };
}

/** POST /api/v1/grievances — files the case and returns its ticket number. Authenticated submitters only. */
export async function submitGrievance(payload: SubmitGrievancePayload): Promise<SubmitGrievanceResult> {
  return fetchApi<SubmitGrievanceResult>('api/v1/grievances', {
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
