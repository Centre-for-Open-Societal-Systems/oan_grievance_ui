"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText, Loader2, Table } from "lucide-react";
import { logger } from "@/lib/logger";
import { ApiError, ApiErrorCode, classifyError } from "@/lib/api";
import {
  exportGrievance,
  type GrievanceExportFormat,
  type GrievanceExportLang,
} from "../../api/grievanceApi";

export interface ExportMenuProps {
  ticketNumber: string;
}

/** Long enough for the browser to start reading the blob before its URL is released. */
const REVOKE_DELAY_MS = 1000;

/**
 * "Export" button of the case view: downloads the case and its timeline as the
 * SOW Annexure complaint form, as a PDF or a CSV. The form's own wording follows
 * the portal language where the backend has it (English, Amharic), else English.
 *
 * A disclosure rather than an ARIA menu: the two choices are ordinary buttons,
 * reached by Tab, and Escape closes the list and returns focus to the trigger.
 */
export function ExportMenu({ ticketNumber }: ExportMenuProps) {
  const t = useTranslations("caseExport");
  const locale = useLocale();
  const lang: GrievanceExportLang = locale === "am" ? "am" : "en";

  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorKey, setErrorKey] = useState<"failed" | "notFound" | "forbidden" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // A running export belongs to the case it was started on: leaving the case
  // (or the page) cancels it, so it neither downloads nor reports late.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setIsExporting(false);
      setErrorKey(null);
    };
  }, [ticketNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleExport = async (format: GrievanceExportFormat) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    setErrorKey(null);
    setIsExporting(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { blob, fileName } = await exportGrievance(ticketNumber, format, lang, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
    } catch (err) {
      if (controller.signal.aborted) return;
      logger.error("Failed to export the grievance:", err);
      if (err instanceof ApiError && err.status === 404) setErrorKey("notFound");
      else if (classifyError(err) === ApiErrorCode.Forbidden) setErrorKey("forbidden");
      else setErrorKey("failed");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsExporting(false);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setErrorKey(null);
          setIsOpen((open) => !open);
        }}
        disabled={isExporting}
        aria-expanded={isOpen}
        aria-label={t("menuLabel")}
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gray-300/50"
      >
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {isExporting ? t("exporting") : t("title")}
      </button>

      {isExporting && (
        <span role="status" className="sr-only">
          {t("exporting")}
        </span>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-left"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t("pdf")}
          </button>
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-left"
          >
            <Table className="h-4 w-4" aria-hidden="true" />
            {t("csv")}
          </button>
        </div>
      )}

      {errorKey && (
        <p role="alert" className="absolute right-0 mt-2 w-72 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 z-10">
          {t(errorKey)}
        </p>
      )}
    </div>
  );
}
