import { callGrievanceApi } from '@/lib/grievanceApi';

// `oan_grievance_service`'s Grievance Draft: working state for a
// still-in-progress submission, keyed by a client-generated UUID. Uploading
// an attachment before the case exists (`attachment.submit_document` with a
// `client_uuid`) requires this draft to already exist server-side — see
// `submit_document`'s docstring on the backend.

export interface DraftSaveResult {
  client_uuid: string;
  step_reached: number;
  expires_on: string;
  attachment_count: number;
}

export async function saveDraft(
  clientUuid: string,
  payload: Record<string, unknown>,
  stepReached: number
): Promise<DraftSaveResult> {
  return callGrievanceApi<DraftSaveResult>('draft.save', {
    client_uuid: clientUuid,
    payload,
    step_reached: stepReached,
  });
}
