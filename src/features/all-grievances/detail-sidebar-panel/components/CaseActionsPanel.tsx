"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Info, Send, Workflow } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StarRating } from "@/components/ui/StarRating";
import type { GrievanceActionPayload, GrievanceAvailableAction } from "../../types";

/** The action that confirms a resolution; the only one that takes a rating (GrievanceActionRequest.rating). */
export const CLOSE_CASE_ACTION = "Close Case";

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
}

/**
 * The submitter's workflow-action form, shown where officers get the
 * department response form: pick one of the case's available actions
 * (Submitter Reply, Reopen, Close Case), give a reason, and run it through
 * POST /grievances/:ticket/action. Closing a resolved case also rates the
 * resolution.
 */
export function CaseActionsPanel({ actions, isSubmitting, onExecute }: CaseActionsPanelProps) {
  const t = useTranslations("caseActions");
  const reasonId = useId();
  const reasonHelpId = useId();

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // The case moves on after an action (here or elsewhere), so a selection
  // that is no longer offered is treated as no selection.
  const selected = actions.find((a) => a.action === selectedAction) ?? null;
  const needsRating = selected?.action === CLOSE_CASE_ACTION;
  const canSubmit = !!selected && reason.trim() !== "" && (!needsRating || rating !== null);

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
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !canSubmit) return;
    setError(null);
    setSuccess(null);
    try {
      await onExecute({
        action: selected.action,
        reason: reason.trim(),
        rating: needsRating ? rating : null,
      });
      setSuccess(t("success", { action: selected.label }));
      setSelectedAction(null);
      setReason("");
      setRating(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("failed"));
    }
  };

  const hintKey = selected ? ACTION_HINT_KEYS[selected.action] ?? "generic" : null;

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <Workflow className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        {t("submitterTitle")}
      </h3>

      {success && <SuccessNote>{success}</SuccessNote>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

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

      {selected && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {hintKey && <p className="text-sm text-gray-600">{t(`hints.${hintKey}`)}</p>}

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
            <label htmlFor={reasonId} className="block text-sm font-bold text-gray-700 mb-1.5">
              {t("reasonLabel")} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <textarea
              id={reasonId}
              rows={4}
              required
              aria-describedby={reasonHelpId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white resize-none"
            />
            <p id={reasonHelpId} className="mt-1 text-xs text-gray-500">
              {t("reasonHelp")}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              className="gap-2"
            >
              {!isSubmitting && <Send className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? t("submitting") : selected.label}
            </Button>
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
