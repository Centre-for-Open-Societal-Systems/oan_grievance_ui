"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Info, Send, Workflow } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StarRating } from "@/components/ui/StarRating";
import { SupportingDocumentsField } from "./SupportingDocumentsField";
import type { GrievanceActionPayload, GrievanceAvailableAction } from "../../types";

/** The action that confirms a resolution; the only one that takes a rating (GrievanceActionRequest.rating). */
export const CLOSE_CASE_ACTION = "Close Case";
/** Offered alongside Close Case on a resolved case; shown as a fallback link rather than a peer choice. */
export const REOPEN_ACTION = "Reopen";

/** Shortest reason the form accepts when the action requires one. */
export const MIN_REASON_LENGTH = 10;

/** Workflow actions with their own guidance copy; any other action gets the generic hint. */
const ACTION_HINT_KEYS: Record<string, string> = {
  "Submitter Reply": "submitterReply",
  Reopen: "reopen",
  [CLOSE_CASE_ACTION]: "closeCase",
};

export interface CaseActionsPanelProps {
  /** The case's `available_actions` for the submitter. */
  actions: GrievanceAvailableAction[];
  isSubmitting: boolean;
  onExecute: (payload: GrievanceActionPayload) => Promise<unknown>;
  /** Uploads supporting documents to the case before the action runs. */
  onUploadFiles: (files: File[]) => Promise<unknown>;
}

/**
 * The submitter's workflow-action form, shown where officers get the
 * department response form: pick one of the case's available actions
 * (Submitter Reply, Reopen, Close Case), give a reason, and run it through
 * POST /grievances/:ticket/action. Closing a resolved case also rates the
 * resolution; any other action can carry supporting documents. With only
 * one action on offer there is nothing to choose, so the picker is skipped;
 * a resolved case (Close Case + Reopen) leads with closing and offers
 * reopening as a link. Whether a reason is required comes from the
 * action's `requires_reason`.
 */
export function CaseActionsPanel({ actions, isSubmitting, onExecute, onUploadFiles }: CaseActionsPanelProps) {
  const t = useTranslations("caseActions");
  const tDocs = useTranslations("supportingDocuments");
  const reasonId = useId();
  const reasonHelpId = useId();

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // The case moves on after an action (here or elsewhere), so a selection
  // that is no longer offered is treated as no selection. A lone action is
  // always selected, and a resolved case starts on Close Case.
  const closeAction = actions.find((a) => a.action === CLOSE_CASE_ACTION) ?? null;
  const reopenAction = actions.find((a) => a.action === REOPEN_ACTION) ?? null;
  const isResolvedChoice = actions.length === 2 && !!closeAction && !!reopenAction;
  const defaultAction = actions.length === 1 ? actions[0] : isResolvedChoice ? closeAction : null;
  const selected = actions.find((a) => a.action === selectedAction) ?? defaultAction;
  const showPicker = actions.length > 1 && !isResolvedChoice;
  const needsRating = selected?.action === CLOSE_CASE_ACTION;
  const takesFiles = !!selected && !needsRating;
  const reasonRequired = selected?.requires_reason ?? true;
  const busy = isSubmitting || isUploading;
  const reasonOk = reasonRequired ? reason.trim().length >= MIN_REASON_LENGTH : true;
  const canSubmit = !!selected && reasonOk && (!needsRating || rating !== null);

  if (actions.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-emerald-600" aria-hidden="true" /> {t("submitterTitle")}
        </h3>
        {success && <SuccessNote>{success}</SuccessNote>}
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          {t("nothingToDo")}
        </p>
      </section>
    );
  }

  const choose = (action: string) => {
    setSelectedAction(action);
    setError(null);
    setSuccess(null);
    if (action !== CLOSE_CASE_ACTION) setRating(null);
    else setFiles([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !canSubmit) return;
    setError(null);
    setSuccess(null);
    try {
      // Upload first so the officer has the documents when the case returns to them.
      if (takesFiles && files.length > 0) {
        setIsUploading(true);
        try {
          await onUploadFiles(files);
        } finally {
          setIsUploading(false);
        }
        setFiles([]);
      }
      await onExecute({
        action: selected.action,
        reason: reason.trim(),
        rating: needsRating ? rating : null,
      });
      setSuccess(t("success", { action: selected.label }));
      setSelectedAction(null);
      setReason("");
      setRating(null);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("failed"));
    }
  };

  const hintKey = selected ? ACTION_HINT_KEYS[selected.action] ?? "generic" : null;
  const isReply = hintKey === "submitterReply";

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <Workflow className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        {t("submitterTitle")}
      </h3>

      {success && <SuccessNote>{success}</SuccessNote>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {showPicker && (
        <div role="group" aria-label={t("chooseAction")} className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const isSelected = a.action === selected?.action;
            return (
              <button
                key={a.action}
                type="button"
                aria-pressed={isSelected}
                onClick={() => choose(a.action)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isSelected
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {isResolvedChoice && !needsRating && hintKey && (
            <p className="text-sm text-gray-600">{t(`hints.${hintKey}`)}</p>
          )}
          {needsRating && (
            <StarRating
              label={t("ratingLabel")}
              optionLabel={(value) => t("ratingOption", { value })}
              value={rating}
              onChange={setRating}
              required
            />
          )}

          <div>
            <label htmlFor={reasonId} className="block text-base font-bold text-gray-800 mb-2">
              {isReply ? t("detailsLabel") : needsRating ? t("commentsLabel") : t("reasonLabel")}{" "}
              {reasonRequired ? (
                <span className="text-red-500" aria-hidden="true">*</span>
              ) : (
                <span className="font-normal text-gray-400">{t("optional")}</span>
              )}
            </label>
            <textarea
              id={reasonId}
              rows={5}
              required={reasonRequired}
              minLength={reasonRequired ? MIN_REASON_LENGTH : undefined}
              aria-describedby={reasonHelpId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isReply ? t("detailsPlaceholder") : needsRating ? t("commentsPlaceholder") : t("reasonPlaceholder")
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50 resize-none"
            />
            <p id={reasonHelpId} className="mt-2 text-xs text-gray-500">
              {reasonRequired && t("minLength", { min: MIN_REASON_LENGTH })} {t("reasonHelp")}
            </p>
          </div>

          {takesFiles && (
            <SupportingDocumentsField
              files={files}
              onChange={(next) => {
                setFiles(next);
                setError(null);
              }}
              onRejected={() => setError(tDocs("rejected"))}
              disabled={busy}
            />
          )}

          <div className="flex flex-col items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              isLoading={busy}
              className="w-full gap-2"
            >
              {!busy &&
                (needsRating ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                ))}
              {busy
                ? t("submitting")
                : isReply
                  ? t("submitReply")
                  : needsRating
                    ? t("confirmClose")
                    : selected.label}
            </Button>
            {isResolvedChoice && needsRating ? (
              <button
                type="button"
                onClick={() => choose(REOPEN_ACTION)}
                disabled={busy}
                className="text-sm font-bold text-red-600 hover:text-red-700 hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {t("reopenLink")}
              </button>
            ) : isResolvedChoice ? (
              <button
                type="button"
                onClick={() => choose(CLOSE_CASE_ACTION)}
                disabled={busy}
                className="text-sm font-semibold text-gray-600 hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {t("backToClose")}
              </button>
            ) : (
              hintKey && <p className="text-sm text-gray-500 text-center">{t(`hints.${hintKey}`)}</p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg font-medium"
    >
      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
