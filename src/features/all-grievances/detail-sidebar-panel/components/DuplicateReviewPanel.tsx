"use client";

import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Copy, ExternalLink, ScanSearch, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { CharacterCounter } from '@/components/ui/CharacterCounter';
import { useModalA11y } from '@/components/ui/useModalA11y';
import { REASON_MAX_LENGTH } from '@/lib/validation/lengthLimits';
import type { ConfirmDuplicatePayload, DismissDuplicatePayload, PossibleDuplicate } from '../../types';

interface DuplicateReviewPanelProps {
  ticketNumber: string;
  /** The flag awaiting a ruling (staff only), if any. */
  possibleDuplicate?: PossibleDuplicate | null;
  /** The main ticket, once this case is confirmed as a duplicate. */
  duplicateOf?: string | null;
  onConfirm: (payload: ConfirmDuplicatePayload) => Promise<void>;
  onDismiss: (payload: DismissDuplicatePayload) => Promise<void>;
  onOpenTicket: (ticketNumber: string) => void;
}

type Ruling = 'confirm' | 'dismiss' | null;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * The duplicate ruling on the ticket detail: for a flagged case, what matched and the choice to
 * confirm or dismiss it; for a confirmed duplicate, a banner pointing at the main ticket. Only an
 * officer's ruling changes the ticket, and a confirmed duplicate can't be undone.
 */
export function DuplicateReviewPanel({
  ticketNumber,
  possibleDuplicate,
  duplicateOf,
  onConfirm,
  onDismiss,
  onOpenTicket,
}: DuplicateReviewPanelProps) {
  const t = useTranslations('duplicates');
  const [ruling, setRuling] = useState<Ruling>(null);

  if (duplicateOf) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-100 p-4"
      >
        <div className="flex items-start gap-3">
          <Copy className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-800">{t('bannerTitle')}</p>
            <p className="text-sm text-slate-600">{t('bannerBody', { ticket: duplicateOf })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenTicket(duplicateOf)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t('openMain')}
        </button>
      </div>
    );
  }

  if (!possibleDuplicate) return null;

  const matchLevel = possibleDuplicate.match_level;
  // The service leaves details out for a main ticket the officer can't read; a field it sends as null counts as absent.
  const hasDetails = Boolean(
    possibleDuplicate.description ||
      possibleDuplicate.status ||
      possibleDuplicate.service_category ||
      possibleDuplicate.grievance_type
  );
  const sameFacts = [
    possibleDuplicate.same_submitter ? t('sameFarmer') : null,
    possibleDuplicate.same_category ? t('sameCategory') : null,
    possibleDuplicate.same_type ? t('sameType') : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <section
      aria-label={t('flaggedTitle')}
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ScanSearch className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">{t('flaggedTitle')}</h3>
            <p className="text-sm text-amber-800">{t('flaggedIntro')}</p>
          </div>
        </div>
        {matchLevel && (
          <span className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {t('matchLevel', { level: matchLevel === 'High' ? t('levelHigh') : matchLevel === 'Medium' ? t('levelMedium') : matchLevel })}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="font-semibold text-gray-600">{t('mainTicket')}</dt>
        <dd className="font-mono text-gray-900">{possibleDuplicate.ticket_number}</dd>
        {hasDetails ? (
          <>
            {possibleDuplicate.status && (
              <>
                <dt className="font-semibold text-gray-600">{t('status')}</dt>
                <dd className="text-gray-900">{possibleDuplicate.status}</dd>
              </>
            )}
            {(possibleDuplicate.service_category || possibleDuplicate.grievance_type) && (
              <>
                <dt className="font-semibold text-gray-600">{t('categoryAndType')}</dt>
                <dd className="text-gray-900">
                  {[possibleDuplicate.service_category, possibleDuplicate.grievance_type].filter(Boolean).join(' · ')}
                </dd>
              </>
            )}
            {possibleDuplicate.description && (
              <>
                <dt className="font-semibold text-gray-600">{t('description')}</dt>
                <dd className="text-gray-900 whitespace-pre-line break-words line-clamp-4">
                  {possibleDuplicate.description}
                </dd>
              </>
            )}
          </>
        ) : (
          <>
            <dt className="sr-only">{t('details')}</dt>
            <dd className="col-span-2 text-gray-600">{t('detailsUnavailable')}</dd>
          </>
        )}
      </dl>

      {sameFacts.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('whatMatched')}>
          {sameFacts.map((fact) => (
            <li
              key={fact}
              className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-amber-800"
            >
              {fact}
            </li>
          ))}
        </ul>
      )}

      {possibleDuplicate.can_review ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setRuling('confirm')}>
            {t('confirmButton')}
          </Button>
          <Button type="button" variant="outline" onClick={() => setRuling('dismiss')}>
            {t('dismissButton')}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-amber-800">{t('cannotReview')}</p>
      )}

      {ruling && (
        <RulingDialog
          ruling={ruling}
          ticketNumber={ticketNumber}
          defaultMainTicket={possibleDuplicate.ticket_number}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
          onClose={() => setRuling(null)}
        />
      )}
    </section>
  );
}

interface RulingDialogProps {
  ruling: Exclude<Ruling, null>;
  ticketNumber: string;
  defaultMainTicket: string;
  onConfirm: (payload: ConfirmDuplicatePayload) => Promise<void>;
  onDismiss: (payload: DismissDuplicatePayload) => Promise<void>;
  onClose: () => void;
}

function RulingDialog({ ruling, ticketNumber, defaultMainTicket, onConfirm, onDismiss, onClose }: RulingDialogProps) {
  const t = useTranslations('duplicates');
  const titleId = useId();
  const mainId = useId();
  const noteId = useId();
  const [mainTicket, setMainTicket] = useState(defaultMainTicket);
  const [note, setNote] = useState('');
  const [mainError, setMainError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isConfirm = ruling === 'confirm';
  // A ruling in flight can't be undone, so the dialog stays open until the service has answered:
  // closing early would hide a failure the officer needs to see.
  const close = () => {
    if (!isSaving) onClose();
  };
  const dialogRef = useModalA11y<HTMLDivElement>(true, close);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMain = mainTicket.trim();
    if (isConfirm && !trimmedMain) {
      setMainError(t('mainTicketRequired'));
      return;
    }
    if (isConfirm && trimmedMain.toLowerCase() === ticketNumber.toLowerCase()) {
      setMainError(t('mainTicketSame'));
      return;
    }
    setMainError(undefined);
    setIsSaving(true);
    setError(null);
    try {
      const trimmedNote = note.trim();
      if (isConfirm) {
        await onConfirm({ main_ticket: trimmedMain, ...(trimmedNote ? { note: trimmedNote } : {}) });
      } else {
        await onDismiss(trimmedNote ? { note: trimmedNote } : {});
      }
      // The dialog unmounts with this call, so there is no saving state left to reset.
      onClose();
    } catch (err) {
      setError(errorMessage(err, t('saveFailed')));
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {isConfirm ? t('confirmTitle') : t('dismissTitle')}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            aria-label={t('close')}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6" noValidate>
          {error && <ErrorAlert>{error}</ErrorAlert>}

          {isConfirm ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={mainId} className="text-sm font-semibold text-gray-700">
                  {t('mainTicket')} <span className="text-red-600">*</span>
                </label>
                <input
                  id={mainId}
                  value={mainTicket}
                  onChange={(e) => {
                    setMainTicket(e.target.value);
                    if (mainError) setMainError(undefined);
                  }}
                  aria-invalid={!!mainError}
                  aria-describedby={mainError ? `${mainId}-error` : undefined}
                  className={`w-full rounded-lg border px-3 py-2.5 font-mono text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    mainError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-emerald-600 focus:ring-emerald-600'
                  }`}
                />
                {mainError && (
                  <p id={`${mainId}-error`} className="text-xs text-red-600">
                    {mainError}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">{t('effectsTitle')}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>{t('effectStatus')}</li>
                  <li>{t('effectMessage')}</li>
                  <li>{t('effectReadOnly')}</li>
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700">{t('dismissBody')}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={noteId} className="text-sm font-semibold text-gray-700">
              {t('noteLabel')}
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              maxLength={REASON_MAX_LENGTH}
              aria-describedby={`${noteId}-count`}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <CharacterCounter id={`${noteId}-count`} count={note.length} max={REASON_MAX_LENGTH} className="text-right" />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="outline" onClick={close} disabled={isSaving} className="text-gray-700">
              {t('cancel')}
            </Button>
            <Button type="submit" variant={isConfirm ? 'danger' : 'primary'} isLoading={isSaving}>
              {isConfirm ? t('confirmSubmit') : t('dismissSubmit')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
