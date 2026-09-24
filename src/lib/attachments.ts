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
  /**
   * Fail-closed result when the scanner itself couldn't be reached or errored
   * (`scanning.py`'s `SCAN_FAILED` — a self-hosted ClamAV sidecar that's down
   * or unconfigured, not a verdict about the file). Same as Infected from this
   * app's side: `is_servable()` on the backend only ever passes on Clean, so a
   * Failed file is just as unusable as evidence and needs the same "remove
   * and retry" treatment, not a message implying the file itself is suspect.
   */
  FAILED: 'Failed',
} as const;

export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

/**
 * A row from `GET /api/v1/grievances/<id>/attachments` — exactly the field
 * list `get_attachments`'s `frappe.get_all(..., fields=[...])` selects on the
 * backend, no more. In particular there's no `servable`/similar boolean here:
 * `is_servable()` (Clean-only) is enforced server-side, on `download` and on
 * read permission for the row itself — a Clean check has to be done here by
 * comparing `scan_status` against `SCAN_STATUS.CLEAN`, not by trusting an
 * extra field the list endpoint doesn't actually send.
 */
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
 * Returns the authenticated proxy URL to stream an attachment's bytes inline or as download.
 * Backend route: GET /api/v1/attachments/<id>/view(?download=1)
 */
export function getAttachmentViewUrl(attachment: string, download = false): string {
  const enc = encodeURIComponent(attachment);
  return `/api/proxy/api/v1/attachments/${enc}/view${download ? '?download=1' : ''}`;
}

/**
 * Fetches an attachment's bytes through the auth proxy and returns an object
 * URL for download or inline preview.
 */
export async function fetchAttachmentBlobUrl(attachmentOrUrl: string, download = true): Promise<string> {
  const url = attachmentOrUrl.startsWith('/api/proxy')
    ? attachmentOrUrl
    : attachmentOrUrl.startsWith('/')
      ? `/api/proxy${attachmentOrUrl}`
      : getAttachmentViewUrl(attachmentOrUrl, download);

  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError('Failed to download the file.', null, response.status);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
