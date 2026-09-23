"use client";

import { useEffect, useState } from "react";
import { Paperclip, Loader2, AlertTriangle, FileText } from "lucide-react";
import { getAttachments, type AttachmentRow } from "@/lib/attachments";
import { logger } from "@/lib/logger";
import { formatAttachmentSize, scanStatusBadge } from "./attachmentDisplay";
import { DocumentViewerPopup } from "./DocumentViewerPopup";

/**
 * Real attachment list, wired to the backend's REST routes
 * (GET /api/v1/grievances/<id>/attachments). `grievance` is the real backend
 * document name — the surrounding detail sidebar is backend-driven too (see
 * `mapGrievance.ts`'s `id: item.name`), not mock data, so this is live
 * against production data as soon as it mounts. Clicking a row opens
 * `DocumentViewerPopup`, which carries preview/download/delete — see its own
 * doc comment for why download and preview are still disabled there.
 */
export function AttachmentsList({ grievance, canManageCase }: { grievance: string; canManageCase: boolean }) {
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentRow | null>(null);

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

  const handleDeleted = (attachmentName: string) => {
    setRows((prev) => prev.filter((row) => row.name !== attachmentName));
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

        {/* One click target per row (opens DocumentViewerPopup, which offers Download/Delete)
            rather than a second, separately-clickable download icon inside it — a button
            nested inside a button isn't valid, and the download action lives just as well
            one click deeper, in the popup that already carries it. */}
        {status === "ready" &&
          rows.map((row) => (
            <button
              key={row.name}
              type="button"
              onClick={() => setSelectedAttachment(row)}
              className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0 text-left hover:bg-gray-50 rounded-lg transition-colors -mx-2 px-2"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{row.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{formatAttachmentSize(row.size_bytes)}</span>
                  {scanStatusBadge(row)}
                </div>
              </div>
            </button>
          ))}
      </div>

      {selectedAttachment && (
        <DocumentViewerPopup
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
          canDelete={canManageCase}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
