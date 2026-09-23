import { fetchApi } from '@/lib/api/fetchApi';
import { formatToE164 } from '@/lib/validation/phone';

export interface DraftAttachment {
  name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  is_private: number;
}

export interface AdministrativeHierarchy {
  region?: string;
  region_id?: string;
  zone?: string;
  zone_id?: string;
  woreda?: string;
  woreda_id?: string;
  kebele?: string;
  kebele_id?: string;
}

export interface DraftState {
  name?: string;
  ticket_number?: string | null;
  client_submission_uuid?: string;
  client_uuid?: string;
  owner?: string | null;
  submitter_name?: string | null;
  contact_mobile?: string | null;
  contact_email?: string | null;
  submitter_type?: string | null;
  submission_channel?: string | null;
  service_category?: string | null;
  grievance_type?: string | null;
  grievance_type_name?: string | null;
  administrative_area?: string | null;
  administrative_hierarchy?: AdministrativeHierarchy | null;
  location?: string | null;
  administrative_unit?: string | null;
  description?: string | null;
  desired_outcome?: string | null;
  is_anonymous?: boolean | number;
  payload?: Record<string, unknown>;
  attachments?: DraftAttachment[];
  attachment_count?: number;
}

export interface SaveDraftPayload {
  client_submission_uuid?: string;
  submission_channel?: string;
  submitter_type?: string;
  submitter_name?: string;
  contact_mobile?: string;
  contact_email?: string;
  administrative_area?: string;
  administrative_unit?: string;
  service_category?: string;
  grievance_type?: string;
  associated_service_provider?: string;
  description?: string;
  desired_outcome?: string;
  is_anonymous?: number;
}

export interface SubmitDraftPayload extends SaveDraftPayload {
  consent_given?: number | boolean;
  anonymity_justification?: string;
}

export interface SubmitDraftResult {
  ticket_number: string;
  status: string;
  client_submission_uuid?: string;
  routing_rule?: string | null;
}

/**
 * POST /api/v1/drafts — create or update an active draft directly in the backend.
 * Supports typed SaveDraftPayload object as well as legacy signature (clientUuid, payload, stepReached).
 */
export async function saveDraft(
  paramsOrClientUuid: string | SaveDraftPayload,
  legacyPayload?: Record<string, unknown>,
  _stepReached?: number
): Promise<DraftState> {
  let body: SaveDraftPayload;

  if (typeof paramsOrClientUuid === 'string') {
    const p = legacyPayload || {};
    body = {
      client_submission_uuid: paramsOrClientUuid,
      submission_channel: typeof p.submissionChannel === 'string' ? p.submissionChannel : (p.submission_channel as string | undefined),
      submitter_type: typeof p.submitterType === 'string' ? p.submitterType : (p.submitter_type as string | undefined),
      submitter_name: typeof p.submitterName === 'string' ? p.submitterName : (p.submitter_name as string | undefined),
      contact_mobile: typeof p.contactMobile === 'string' ? p.contactMobile : (p.contact_mobile as string | undefined),
      contact_email: typeof p.contactEmail === 'string' ? p.contactEmail : (p.contact_email as string | undefined),
      administrative_area: typeof p.administrativeArea === 'string' ? p.administrativeArea : (p.administrative_area as string | undefined),
      administrative_unit: typeof p.administrativeUnit === 'string' ? p.administrativeUnit : (p.administrative_unit as string | undefined),
      service_category: typeof p.serviceCategory === 'string' ? p.serviceCategory : (p.service_category as string | undefined),
      grievance_type: typeof p.grievanceType === 'string' ? p.grievanceType : (p.grievance_type as string | undefined),
      description: typeof p.description === 'string' ? p.description : undefined,
      desired_outcome: typeof p.desiredOutcome === 'string' ? p.desiredOutcome : (p.desired_outcome as string | undefined),
    };
  } else {
    body = paramsOrClientUuid;
  }

  // Filter out undefined values to keep payload clean
  const cleanBody: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null && v !== '') {
      cleanBody[k] = v;
    }
  }

  if (typeof cleanBody.contact_mobile === 'string' && !cleanBody.contact_mobile.startsWith('+')) {
    cleanBody.contact_mobile = formatToE164(cleanBody.contact_mobile);
  }

  return fetchApi<DraftState>('api/v1/drafts', {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
}

/**
 * POST /api/v1/drafts/submit — submit an existing draft into a registered Grievance case.
 */
export async function submitDraft(payload: SubmitDraftPayload): Promise<SubmitDraftResult> {
  const cleanBody: Record<string, unknown> = { consent_given: 1 };
  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined && v !== null && v !== '') {
      cleanBody[k] = v;
    }
  }

  if (typeof cleanBody.contact_mobile === 'string' && !cleanBody.contact_mobile.startsWith('+')) {
    cleanBody.contact_mobile = formatToE164(cleanBody.contact_mobile);
  }

  return fetchApi<SubmitDraftResult>('api/v1/drafts/submit', {
    method: 'POST',
    body: JSON.stringify(cleanBody),
  });
}

/**
 * GET /api/v1/drafts — the authenticated caller's latest unsubmitted draft, if any.
 */
export async function loadDraft(clientUuid?: string): Promise<DraftState | null> {
  const query = clientUuid ? `?client_submission_uuid=${encodeURIComponent(clientUuid)}` : '';
  return fetchApi<DraftState | null>(`api/v1/drafts${query}`, { method: 'GET' });
}

/**
 * DELETE /api/v1/drafts — discard a draft the submitter abandoned.
 */
export async function discardDraft(clientUuid?: string): Promise<void> {
  const query = clientUuid ? `?client_submission_uuid=${encodeURIComponent(clientUuid)}` : '';
  await fetchApi(`api/v1/drafts${query}`, { method: 'DELETE' });
}
