"use client";

import { useId } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { useModalA11y } from '@/components/ui/useModalA11y';
import type { SimilarGrievanceCandidate } from '../api/submitGrievanceApi';

interface SimilarGrievancePromptProps {
  candidates: readonly SimilarGrievanceCandidate[];
  /** The submitter says this one is new: file it, and do not ask again. */
  onFileAnyway: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

/**
 * Shown when the service finds a similar grievance of the submitter's from the last day before filing
 * (`409 POSSIBLE_DUPLICATE`). Nothing has been filed yet: the submitter either confirms this is a new
 * grievance or goes back.
 */
export function SimilarGrievancePrompt({ candidates, onFileAnyway, onClose, isSubmitting }: SimilarGrievancePromptProps) {
  const t = useTranslations('duplicates');
  const titleId = useId();
  // Escape must not close the prompt while the grievance is being filed: the request carries on
  // regardless, and the submitter would be left to press submit again and file a real duplicate.
  const dialogRef = useModalA11y<HTMLDivElement>(true, () => {
    if (!isSubmitting) onClose();
  });

  const levelLabel = (level: string | null | undefined) =>
    level === 'High' ? t('levelHigh') : level === 'Medium' ? t('levelMedium') : level;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" onClick={isSubmitting ? undefined : onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {t('promptTitle')}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{t('promptIntro')}</p>
        </div>

        <ul className="flex flex-col gap-3 px-6 py-4">
          {candidates.map((candidate) => (
            <li key={candidate.ticket_number} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-semibold text-gray-900">{candidate.ticket_number}</span>
                <span className="text-xs text-gray-500">{candidate.status}</span>
              </div>
              {(candidate.service_category || candidate.grievance_type) && (
                <p className="mt-1 text-xs text-gray-600">
                  {[candidate.service_category, candidate.grievance_type].filter(Boolean).join(' · ')}
                </p>
              )}
              {candidate.description && (
                <p className="mt-1 text-gray-800 whitespace-pre-line break-words line-clamp-3">{candidate.description}</p>
              )}
              {candidate.match_level && (
                <p className="mt-1.5 text-xs font-semibold text-amber-700">
                  {t('promptMatch', { level: levelLabel(candidate.match_level) ?? '' })}
                </p>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('promptBack')}
          </button>
          <button
            type="button"
            onClick={onFileAnyway}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#10883c] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {t('promptNew')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
