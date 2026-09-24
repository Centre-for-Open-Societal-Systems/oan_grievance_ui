"use client";

import { useEffect, useState } from "react";
import { Paperclip, Download, Loader2, AlertTriangle, FileText } from "lucide-react";
import {
  getAttachments,
  fetchAttachmentBlobUrl,
  SCAN_STATUS,
  type AttachmentRow,
} from "@/lib/attachments";
import { logger } from "@/lib/logger";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scanBadge(row: AttachmentRow) {
  if (row.scan_status === SCAN_STATUS.CLEAN) {
    return <span className="text-[11px] font-semibold text-[#16A34A] bg-green-50 px-2 py-0.5 rounded-full">Clean</span>;
  }
  if (row.scan_status === SCAN_STATUS.INFECTED) {
    return <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Infected</span>;
  }
  return <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Scanning…</span>;
}

/**
 * Real attachment list + download, wired to the backend's REST routes
 * (GET /api/v1/grievances/<id>/attachments, GET /api/v1/attachments/<id>/view).
 * `grievance` is the real backend document name — the surrounding detail
 * sidebar is backend-driven too (see `mapGrievance.ts`'s `id: item.name`),
 * not mock data, so this is live against production data as soon as it
 * mounts.
 */
export function AttachmentsList({ grievance }: { grievance: string }) {
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Resets to "loading" when `grievance` changes so a stale ready/error
    // state from the previous id doesn't flash while the new fetch is in
    // flight — not derivable from render since the reset must happen once
    // per identity change, not on every render.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setStatus("loading");
    getAttachments(grievance)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        logger.error("Failed to load attachments:", error);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [grievance]);

  const handleDownload = async (row: AttachmentRow) => {
    setDownloadingId(row.name);
    setDownloadError(null);
    try {
      const blobUrl = await fetchAttachmentBlobUrl(row.name);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = row.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      logger.error("Failed to download attachment:", error);
      setDownloadError("Could not download this file right now.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-5 border-b border-gray-200 bg-white">
        <div className="w-6 flex justify-center">
          <Paperclip className="h-5 w-5 text-indigo-600" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-bold text-[#141F2B]">Attachments</h3>
      </div>

      <div className="px-5 py-3">
        {status === "loading" && (
          <div role="status" className="flex items-center gap-2 py-4 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading attachments…
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="flex items-center gap-2 py-4 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Could not load attachments for this case.
          </div>
        )}

        {status === "ready" && rows.length === 0 && (
          <p role="status" className="py-4 text-sm text-gray-500">No attachments on this case.</p>
        )}

        {downloadError && (
          <div role="alert" className="flex items-center gap-2 py-2 text-red-600 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            {downloadError}
          </div>
        )}

        {status === "ready" &&
          rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{row.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{formatSize(row.size_bytes)}</span>
                    {scanBadge(row)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownload(row)}
                disabled={!row.servable || downloadingId === row.name}
                title={
                  row.servable
                    ? "Download"
                    : "Not available until the scan completes"
                }
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {downloadingId === row.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
