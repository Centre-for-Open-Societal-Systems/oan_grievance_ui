import { fetchApi } from '@/lib/api/fetchApi';
import { ApiError } from '@/lib/api/fetchApi';

// Client for oan_grievance_service's attachment REST routes — supporting-
// document upload, listing, download, and deletion for a grievance or an
// open draft. See the backend module's own docstring for the security model
// (type sniffed from bytes, EXIF stripped, withheld until scanned clean);
// this module only carries requests to it, it doesn't re-implement any of
// that.

// fetchApi's 15s default is sized for JSON calls. A multipart file upload
// (up to the backend's documented 10MB limit) can legitimately take longer
// than that on a slow connection — this app targets Ethiopia OpenAgriNet,
// not a fast/reliable link — so uploads get a longer allowance instead of
// aborting a request the backend would otherwise have accepted.
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Mirrors the backend's Grievance Attachment `scan_status` field exactly
 * (SCAN_PENDING/SCAN_CLEAN in grievance_attachment.py) — a shared constant
 * instead of the "Clean"/"Infected" literals this codebase used to repeat
 * across three files, so a future casing change on the backend is a type
 * error here instead of silently disabling every scan-status check that
 * compared against the old spelling.
 */
export const SCAN_STATUS = {
  PENDING: 'Pending',
  CLEAN: 'Clean',
  INFECTED: 'Infected',
} as const;

export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

export interface AttachmentRow {
  name: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  document_type: string | null;
  response: string | null;
  scan_status: ScanStatus;
  scanned_at: string | null;
  uploaded_by_user: string | null;
  uploaded_by_submitter: string | null;
  creation: string;
  /** True once `scan_status` is Clean — the only state `download` will actually serve. */
  servable: boolean;
}

export interface UploadAttachmentResult {
  attachment: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  /** Always Pending fresh off upload — no `file_url` comes back until a scanner clears it (see `download`). */
  scan_status: ScanStatus;
}

export interface AttachmentDownloadInfo {
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
}

/**
 * Either `grievance` or `clientUuid` is required. `grievance` uploads
 * directly to a filed case (POST /api/v1/grievances/<grievance>/attachments);
 * `clientUuid` uploads to an open draft before the case exists
 * (POST /api/v1/drafts/attachments) — see `submit_document` on the backend
 * for why the draft path stays open to a guest and the grievance path
 * doesn't.
 */
export async function uploadAttachment(params: {
  file: File;
  grievance?: string;
  clientUuid?: string;
  documentType?: string;
  response?: string;
}): Promise<UploadAttachmentResult> {
  const form = new FormData();
  form.append('file', params.file);
  if (params.documentType) form.append('document_type', params.documentType);
  if (params.response) form.append('response', params.response);

  const targetId = params.grievance || params.clientUuid;
  if (!targetId) {
    throw new Error('uploadAttachment requires either a grievance or a clientUuid.');
  }

  form.append('grievance', targetId);
  if (params.clientUuid) form.append('client_uuid', params.clientUuid);

  const rawResult = await fetchApi<UploadAttachmentResult | UploadAttachmentResult[]>(
    `api/v1/grievances/${encodeURIComponent(targetId)}/attachments`,
    { method: 'POST', body: form },
    UPLOAD_TIMEOUT_MS
  );

  if (Array.isArray(rawResult)) {
    return rawResult[0] as UploadAttachmentResult;
  }
  return rawResult;
}

/** GET /api/v1/grievances/<grievance>/attachments — every attachment on a case, including pending/infected ones. */
export async function getAttachments(grievance: string): Promise<AttachmentRow[]> {
  return fetchApi<AttachmentRow[]>(`api/v1/grievances/${grievance}/attachments`, { method: 'GET' });
}

/** GET /api/v1/attachments/<attachment>/download — only succeeds once the attachment has scanned Clean. */
export async function getAttachmentDownloadInfo(attachment: string): Promise<AttachmentDownloadInfo> {
  return fetchApi<AttachmentDownloadInfo>(`api/v1/attachments/${attachment}/download`, { method: 'GET' });
}

/** DELETE /api/v1/attachments/<attachment> — only while the case is still open. */
export async function deleteAttachment(attachment: string): Promise<void> {
  await fetchApi(`api/v1/attachments/${attachment}`, { method: 'DELETE' });
}

/**
 * Fetches an attachment's bytes through the auth proxy and returns an object
 * URL. The caller owns it and must `URL.revokeObjectURL` it once done — same
 * lifecycle as the existing local image-preview URLs in `GrievanceDetailsCard`.
 *
 * KNOWN GAP (verified live, not yet fixed): this currently 401s. `file_url`
 * points at Frappe's `/private/files/*`, which `frappe/app.py` routes to
 * `download_private_file` *before* the request ever reaches `frappe.api.handle`
 * — the JWT middleware `oan_auth_service` registers only validates requests
 * whose path matches a registered namespace prefix (see `register_namespace`
 * in that app's `api/middleware.py`), and `/private/files` isn't one. Frappe
 * falls back to its own cookie-session auth for that path, which this app
 * never establishes (it's JWT-only, no `sid` cookie). The metadata calls
 * above (`getAttachments`, `getAttachmentDownloadInfo`) go through the REST
 * router instead, so they work fine — only the raw bytes are blocked. Fixing
 * this needs a backend change (e.g. a whitelisted streaming endpoint that
 * serves the bytes through the already-protected router) — out of scope for
 * this PR.
 *
 * Re-checked after pulling oan_grievance_service 611aee2→185a508 (2026-09-19):
 * still open. That pull's `has_permission` hook on Grievance Attachment closes
 * a different bug (an unscanned/infected file being servable to anyone with a
 * valid Frappe session) — it doesn't register `/private/files` under the JWT
 * middleware, so this app still can't authenticate against it at all.
 */
export async function fetchAttachmentBlobUrl(fileUrl: string): Promise<string> {
  const response = await fetch(`/api/proxy${fileUrl}`);
  if (!response.ok) {
    throw new ApiError('Failed to download the file.', null, response.status);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
