'use client';

import { createContext, useContext } from 'react';

/**
 * Where the case panel's components fetch an attachment's bytes from.
 *
 * By default (`viewUrl: null`) they go through `/api/proxy` with the signed-in user's session, as
 * they always have. The guest view of a case opened by link and PIN (STG-518) has no such session:
 * it provides `viewUrl`, which names its own route for the same file.
 */
export interface AttachmentSource {
  viewUrl: ((attachmentId: string) => string) | null;
}

export const AttachmentSourceContext = createContext<AttachmentSource>({ viewUrl: null });

export function useAttachmentSource(): AttachmentSource {
  return useContext(AttachmentSourceContext);
}

/** What `fetchAttachmentBlobUrl` is given for an attachment: its id, or the source's own URL for it. */
export function attachmentTarget(source: AttachmentSource, attachmentId: string): string {
  return source.viewUrl ? source.viewUrl(attachmentId) : attachmentId;
}
