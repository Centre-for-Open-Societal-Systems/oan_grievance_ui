"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { X, Download, FileText, Loader2, Trash2 } from "lucide-react";
import {
  deleteAttachment,
  getAttachmentDownloadInfo,
  fetchAttachmentBlobUrl,
  SCAN_STATUS,
  type AttachmentRow,
} from "@/lib/attachments";
import { logger } from "@/lib/logger";
import {
  ATTACHMENT_BYTES_UNAVAILABLE_REASON,
  ATTACHMENT_DOWNLOAD_DISABLED,
  formatAttachmentSize,
  scanStatusBadge,
} from "./attachmentDisplay";

interface DocumentViewerPopupProps {
  attachment: AttachmentRow;
  onClose: () => void;
  /** Whether Delete is offered at all — hidden for a viewer without case-management rights. */
  canDelete: boolean;
  /** Called after a successful delete, so the caller can drop this row from its own list. */
  onDeleted: (attachmentName: string) => void;
}

export function DocumentViewerPopup({ attachment, onClose, canDelete, onDeleted }: DocumentViewerPopupProps): ReactElement {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isClean = attachment.scan_status === SCAN_STATUS.CLEAN;

  // `onClose` (backdrop/X click, or a successful delete) unmounts this popup
  // immediately — AttachmentsList only renders it while a row is selected.
  // Guards the async handlers below against setting state after that, which
  // React logs a no-op warning for and, for the delete failure path
  // specifically, would otherwise silently swallow the error (the dialog is
  // already gone, so nothing shows it).
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAttachment(attachment.name);
      onDeleted(attachment.name);
      onClose();
    } catch (error) {
      logger.error("Failed to delete attachment:", error);
      if (!mountedRef.current) return;
      // The backend refuses once the case is Closed/Rejected/Resolved — surface
      // its own reason rather than a generic "something went wrong".
      setDeleteError(error instanceof Error ? error.message : "Could not delete this file. Please try again.");
      setIsDeleting(false);
    }
  };

  // Dead while ATTACHMENT_DOWNLOAD_DISABLED is true (the button below stays
  // disabled), but wired to the real APIs now rather than left as an inline
  // comment — flipping that one flag is then the only change needed to bring
  // Download back, instead of also having to rediscover and rewrite this.
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const info = await getAttachmentDownloadInfo(attachment.name);
      const blobUrl = await fetchAttachmentBlobUrl(info.file_url);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = info.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      logger.error("Failed to download attachment:", error);
      if (!mountedRef.current) return;
      setDownloadError("Could not download this file right now.");
    } finally {
      if (mountedRef.current) setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* A misclick here mid-confirmation should read as "I didn't mean that" — cancel the
          confirm step, not silently close the whole dialog as if nothing had been asked. */}
      <button
        type="button"
        aria-label="Close"
        onClick={confirmingDelete ? () => setConfirmingDelete(false) : onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm cursor-default"
      ></button>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{attachment.file_name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {formatAttachmentSize(attachment.size_bytes)}
                </p>
                {scanStatusBadge(attachment)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void handleDownload()}
              disabled={ATTACHMENT_DOWNLOAD_DISABLED || !isClean || isDownloading}
              title={
                ATTACHMENT_DOWNLOAD_DISABLED
                  ? ATTACHMENT_BYTES_UNAVAILABLE_REASON
                  : isClean
                    ? "Download"
                    : "Not available until the scan completes"
              }
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </button>
            {canDelete && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                {confirmingDelete ? (
                  <>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    title="Delete this attachment"
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {(deleteError || downloadError) && (
          <div role="alert" className="px-6 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
            {deleteError || downloadError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex items-center justify-center min-h-[500px]">
          <div className="bg-white w-full max-w-2xl h-[800px] shadow-sm border border-gray-200 rounded flex flex-col items-center justify-center text-gray-400 px-8 text-center">
            <FileText className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Preview unavailable</p>
            <p className="text-sm mt-2 max-w-sm">{ATTACHMENT_BYTES_UNAVAILABLE_REASON}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
