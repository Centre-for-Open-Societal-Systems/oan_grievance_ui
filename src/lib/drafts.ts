import { fetchApi } from '@/lib/api/fetchApi';

// oan_grievance_service's Grievance Draft: working state for a
// still-in-progress submission, keyed by a client-generated UUID. Uploading
// an attachment before the case exists (`uploadAttachment` in attachments.ts
// with a `clientUuid`) requires this draft to already exist server-side —
// see `submit_document`'s docstring on the backend.

export interface DraftSaveResult {
  client_uuid: string;
  step_reached: number;
  expires_on: string;
  attachment_count: number;
  owner_user: string | null;
}

export interface DraftAttachment {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  is_private: number;
}

export interface DraftState {
  name: string;
  client_uuid: string;
  payload: Record<string, unknown>;
  step_reached: number;
  contact_mobile: string | null;
  expires_on: string;
  submitted_as: string | null;
  attachments: DraftAttachment[];
  attachment_count: number;
}

/** POST /api/v1/drafts — create or overwrite the draft for `clientUuid`. Authenticated only. */
export async function saveDraft(
  clientUuid: string,
  payload: Record<string, unknown>,
  stepReached: number
): Promise<DraftSaveResult> {
  return fetchApi<DraftSaveResult>('api/v1/drafts', {
    method: 'POST',
    body: JSON.stringify({ client_uuid: clientUuid, payload, step_reached: stepReached }),
  });
}

/**
 * GET /api/v1/drafts — the authenticated caller's latest unsubmitted draft,
 * if any, looked up by session owner (no client_uuid needed). Not called
 * anywhere in the UI yet — resuming an in-progress wizard across a page
 * reload is a separate feature this PR doesn't wire up, but the client is
 * available for whoever builds that next.
 */
export async function loadDraft(): Promise<DraftState> {
  return fetchApi<DraftState>('api/v1/drafts', { method: 'GET' });
}

/**
 * DELETE /api/v1/drafts?client_uuid=... — discard a draft the submitter
 * abandoned. Not called anywhere in the UI yet, same as `loadDraft`.
 */
export async function discardDraft(clientUuid: string): Promise<void> {
  await fetchApi(`api/v1/drafts?client_uuid=${encodeURIComponent(clientUuid)}`, { method: 'DELETE' });
}
