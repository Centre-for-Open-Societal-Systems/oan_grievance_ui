"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Mic, Play } from "lucide-react";
import { fetchAttachmentBlobUrl, SCAN_STATUS } from "@/lib/attachments";
import { logger } from "@/lib/logger";
import type { GrievanceTimelineAttachment } from "../../types";

/** The case's voice recordings: audio attachments, which the submitter's recording is stored as. */
export function audioAttachments(
  attachments: GrievanceTimelineAttachment[] | null | undefined
): GrievanceTimelineAttachment[] {
  return (attachments ?? []).filter((a) => (a.mime_type ?? "").startsWith("audio/") && Boolean(a.name || a.id));
}

/**
 * A voice recording shown next to the description it came with. Nothing is downloaded until the
 * officer asks: "Play recording" fetches it and reveals a player, and they press play themselves.
 * The backend streams a file only once it has scanned Clean, so a recording still being scanned
 * (or one that failed) says so instead of offering a player that cannot play.
 */
export function VoiceNotePlayer({ attachment }: { attachment: GrievanceTimelineAttachment }): ReactElement {
  const t = useTranslations("attachmentViewer");
  const id = (attachment.name || attachment.id) as string;
  const isClean = attachment.scan_status === SCAN_STATUS.CLEAN;
  // Tagged with the recording it belongs to, so a different one never shows the previous one's address or failure.
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!isClean || !requested) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    Promise.resolve(fetchAttachmentBlobUrl(id, false))
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url ?? null;
        setLoaded({ id, url: objectUrl });
      })
      .catch((error) => {
        logger.error("Failed to load voice recording:", error);
        if (!cancelled) setLoaded({ id, url: null });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, isClean, requested]);

  const current = isClean && requested && loaded?.id === id ? loaded : null;
  const label = t("voiceNote");
  const message = !isClean
    ? attachment.scan_status === SCAN_STATUS.INFECTED
      ? t("scanInfected")
      : attachment.scan_status === SCAN_STATUS.FAILED
        ? t("scanFailed")
        : t("scanPending")
    : !requested
      ? null
      : current && !current.url
        ? t("previewLoadFailed")
        : !current
          ? t("loadingPreview")
          : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="flex items-center gap-1 text-xs font-semibold text-gray-600">
        <Mic className="h-3.5 w-3.5 text-[#0b8535]" aria-hidden="true" />
        {label}
      </span>
      {current?.url ? (
        <audio controls src={current.url} aria-label={label} className="h-8 w-56 max-w-full" />
      ) : message ? (
        <span role="status" className="text-xs text-gray-500">
          {message}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setRequested(true)}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Play className="h-3 w-3 text-[#0b8535]" aria-hidden="true" />
          {t("playRecording")}
        </button>
      )}
    </div>
  );
}
