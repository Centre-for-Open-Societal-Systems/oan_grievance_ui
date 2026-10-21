"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { X, Download, FileText, Loader2 } from "lucide-react";
import {
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
}

export function DocumentViewerPopup({ attachment, onClose }: DocumentViewerPopupProps): ReactElement {
  const t = useTranslations("attachmentViewer");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isClean = attachment.scan_status === SCAN_STATUS.CLEAN;

  // `onClose` (backdrop/X click) unmounts this popup immediately.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Inline preview (incl. voice recordings) streams through the backend's
  // `/view` endpoint, which only serves attachments that scanned Clean.
  // The result is tagged with the attachment it belongs to, so a different attachment (or one that stops
  // being Clean) never shows the previous file's — by then revoked — address or its failure.
  const [preview, setPreview] = useState<{ name: string; url: string | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!isClean) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    Promise.resolve(fetchAttachmentBlobUrl(attachment.name, false))
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url ?? null;
        setPreview({ name: attachment.name, url: objectUrl, failed: false });
      })
      .catch((error) => {
        logger.error("Failed to load attachment preview:", error);
        if (!cancelled) setPreview({ name: attachment.name, url: null, failed: true });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.name, isClean]);
  const current = isClean && preview?.name === attachment.name ? preview : null;
  const previewUrl = current?.url ?? null;
  const previewFailed = current?.failed ?? false;
  // The backend sends a mime type for every attachment, but a missing one must fall back to "unavailable", not throw.
  const mimeType = attachment.mime_type ?? "";

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
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
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
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button onClick={onClose} aria-label="Close dialog" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div role="alert" className="px-6 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
            {downloadError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex items-center justify-center min-h-[500px]">
          {previewUrl && mimeType.startsWith("audio/") ? (
            <audio controls src={previewUrl} aria-label={attachment.file_name} className="w-full max-w-xl" />
          ) : previewUrl && mimeType === "application/pdf" ? (
            <iframe src={previewUrl} title={attachment.file_name} className="w-full max-w-2xl h-[70vh] bg-white rounded border border-gray-200" />
          ) : previewUrl && mimeType.startsWith("image/") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={previewUrl} alt={attachment.file_name} className="max-w-full max-h-[70vh] object-contain rounded border border-gray-200" />
          ) : (
            <div className="bg-white w-full max-w-2xl h-[800px] shadow-sm border border-gray-200 rounded flex flex-col items-center justify-center text-gray-400 px-8 text-center">
              {isClean && !previewFailed && !previewUrl ? (
                <Loader2 className="h-10 w-10 animate-spin text-gray-300" aria-label={t("loadingPreview")} />
              ) : (
                <>
                  <FileText className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-500">{t("previewUnavailable")}</p>
                  {/* Loaded but not a type that can be shown inline: the heading alone says it. */}
                  {!previewUrl && (
                    <p className="text-sm mt-2 max-w-sm">{isClean ? t("previewLoadFailed") : t("scanPending")}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
