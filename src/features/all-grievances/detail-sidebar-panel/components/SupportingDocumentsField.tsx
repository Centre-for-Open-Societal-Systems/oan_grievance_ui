"use client";

import { useFormatter, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { FileDropzone, FileRow } from "@/components/ui/FileDropzone";

/** Mirrors the backend's per-file upload limit (attachment.py). */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png";

export interface SupportingDocumentsFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** Called when a pick or drop included files that were skipped for type or size. */
  onRejected: () => void;
  disabled?: boolean;
}

/**
 * Documents attached to a case action, shared by the officer response form
 * and the submitter's action panel. Only holds the picked files; the form
 * that owns it uploads them on submit.
 */
export function SupportingDocumentsField({ files, onChange, onRejected, disabled }: SupportingDocumentsFieldProps) {
  const t = useTranslations("supportingDocuments");
  const format = useFormatter();

  const addFiles = (picked: File[]) => {
    const accepted = picked.filter((f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_BYTES);
    onChange([...files, ...accepted.filter((f) => !files.some((p) => p.name === f.name && p.size === f.size))]);
    // After onChange, so a caller that clears its error on change still shows this one.
    if (accepted.length < picked.length) onRejected();
  };

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
      ? format.number(bytes / (1024 * 1024), { style: "unit", unit: "megabyte", maximumFractionDigits: 1 })
      : format.number(Math.max(1, Math.round(bytes / 1024)), { style: "unit", unit: "kilobyte" });

  return (
    <FileDropzone
      label={t("label")}
      prompt={t.rich("prompt", {
        strong: (chunks) => <span className="font-bold text-emerald-700">{chunks}</span>,
      })}
      hint={t("hint")}
      inputLabel={t("label")}
      accept={ACCEPT_ATTR}
      disabled={disabled}
      onFiles={addFiles}
    >
      {files.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {files.map((file) => (
            <FileRow
              key={`${file.name}-${file.size}`}
              name={file.name}
              detail={formatSize(file.size)}
              actions={
                <button
                  type="button"
                  onClick={() => onChange(files.filter((f) => f !== file))}
                  aria-label={t("remove", { name: file.name })}
                  disabled={disabled}
                  className="rounded p-1 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              }
            />
          ))}
        </ul>
      )}
    </FileDropzone>
  );
}
