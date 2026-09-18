import { callGrievanceApi } from '@/lib/grievanceApi';
import { ApiError } from '@/lib/api/fetchApi';

// Client for `oan_grievance_service.api.v1.attachment` — supporting-document
// upload, listing, download, and deletion for a grievance or an open draft.
// See the backend module's own docstring for the security model (type
// sniffed from bytes, EXIF stripped, withheld until scanned clean); this
// module only carries requests to it, it doesn't re-implement any of that.

export interface AttachmentRow {
  name: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  document_type: string | null;
  response: string | null;
  scan_status: string;
  scanned_at: string | null;
  uploaded_by_user: string | null;
  uploaded_by_submitter: string | null;
  creation: string;
  /** True once `scan_status` is Clean — the only state `download` will actually serve. */
  servable: boolean;
}

export interface UploadAttachmentResult {
  attachment: string | null;
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  scan_status: string;
}

export interface AttachmentDownloadInfo {
  file_name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
}

/** Either `grievance` or `clientUuid` is required — see `submit_document` on the backend. */
export async function uploadAttachment(params: {
  file: File;
  grievance?: string;
  clientUuid?: string;
  documentType?: string;
  response?: string;
}): Promise<UploadAttachmentResult> {
  const form = new FormData();
  form.append('file', params.file);
  if (params.grievance) form.append('grievance', params.grievance);
  if (params.clientUuid) form.append('client_uuid', params.clientUuid);
  if (params.documentType) form.append('document_type', params.documentType);
  if (params.response) form.append('response', params.response);

  return callGrievanceApi<UploadAttachmentResult>('attachment.submit_document', form);
}

export async function getAttachments(grievance: string): Promise<AttachmentRow[]> {
  return callGrievanceApi<AttachmentRow[]>('attachment.get_attachments', { grievance });
}

export async function getAttachmentDownloadInfo(attachment: string): Promise<AttachmentDownloadInfo> {
  return callGrievanceApi<AttachmentDownloadInfo>('attachment.download', { attachment });
}

export async function deleteAttachment(attachment: string): Promise<void> {
  await callGrievanceApi('attachment.delete', { attachment });
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
 * above (`getAttachments`, `getAttachmentDownloadInfo`) go through
 * `/api/method/*` instead, so they work fine — only the raw bytes are
 * blocked. Fixing this needs a backend change (e.g. a whitelisted streaming
 * endpoint in `oan_grievance_service` that serves the bytes through the
 * already-protected `/api/method/*` path) — out of scope for this PR.
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
