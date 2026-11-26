'use client';

import { Button } from '@/components/ui/Button';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttachmentSourceContext, type AttachmentSource } from '../detail-sidebar-panel/attachmentSource';
import { AttachmentsList } from '../detail-sidebar-panel/components/AttachmentsList';
import { CommentsAndCommunication } from '../detail-sidebar-panel/components/CommentsAndCommunication';
import { fetchGuestCase, GuestApiError, guestAttachmentViewUrl, type GuestCase, type GuestErrorCode } from './guestApi';
import { guestTimelineData } from './guestCaseData';
import { GuestIdleWarning } from './GuestIdleWarning';
import { GuestReplyForm, type GuestReplyDraft } from './GuestReplyForm';
import { displayTicket } from './PinScreen';
import { useGuestIdleTimer } from './useGuestIdleTimer';

const GUEST_ATTACHMENTS: AttachmentSource = { viewUrl: guestAttachmentViewUrl };

export interface GuestCaseViewProps {
  idleSeconds: number;
  draft: GuestReplyDraft;
  onDraftChange: (draft: GuestReplyDraft) => void;
  /** The session ended (idle, absolute limit, or the case closed): back to the PIN screen. */
  onSessionEnded: (code: GuestErrorCode) => void;
  /** The guest chose Done; the session has been ended on the server. */
  onDone: () => void;
}

/**
 * The case, as its submitter opened it by link and PIN (STG-518): the case panel's own timeline
 * and attachments, in guest mode, plus a reply form. No case management, submitter details,
 * duplicate review, reassignment or deferral, export or internal notes: the backend sends none
 * of what they show, and they are not mounted here.
 */
export function GuestCaseView({ idleSeconds, draft, onDraftChange, onSessionEnded, onDone }: GuestCaseViewProps) {
  const t = useTranslations('guestAccess.case');
  const format = useFormatter();
  const [data, setData] = useState<GuestCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleFailure = useCallback(
    (failure: unknown) => {
      if (failure instanceof GuestApiError && failure.endsSession) {
        onSessionEnded(failure.code);
        return;
      }
      setError(t('loadFailed'));
    },
    [onSessionEnded, t]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGuestCase());
    } catch (failure) {
      handleFailure(failure);
    } finally {
      setLoading(false);
    }
  }, [handleFailure]);

  useEffect(() => {
    // The first load of the case; later ones follow a reply or a retry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const { warning, secondsRemaining, stayActive } = useGuestIdleTimer({ idleSeconds, onExpire: onSessionEnded });
  const timelineData = useMemo(() => (data ? guestTimelineData(data) : null), [data]);
  const dueDate = data?.sla?.sla_due_date ? new Date(data.sla.sla_due_date) : null;

  return (
    <AttachmentSourceContext.Provider value={GUEST_ATTACHMENTS}>
      <main className="min-h-screen bg-[#F8F9FA]">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900">
              {t('title', { ticket: displayTicket(data?.ticket_number ?? '') })}
            </h1>
            {data ? (
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {data.status}
                </span>
                {dueDate && !Number.isNaN(dueDate.getTime()) ? (
                  <span>{t('expectedBy', { date: format.dateTime(dueDate, { dateStyle: 'medium' }) })}</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={onDone}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('done')}
          </Button>
        </header>

        {loading && !data ? (
          <div role="status" className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t('loading')}
          </div>
        ) : error && !data ? (
          <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="text-sm font-medium text-red-800">{error}</p>
            <Button type="button" variant="outline" onClick={() => void load()}>
              {t('retry')}
            </Button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <CommentsAndCommunication
                canManageCase={false}
                timelineData={timelineData}
                isLoading={loading}
                error={error}
                onRetry={() => void load()}
              />
              <GuestReplyForm
                draft={draft}
                onDraftChange={onDraftChange}
                onSent={() => void load()}
                onSessionEnded={(failure) => onSessionEnded(failure.code)}
              />
            </div>
            <div className="flex flex-col gap-6">
              <AttachmentsList attachments={timelineData?.attachments} isLoading={loading && !data} error={null} />
            </div>
          </div>
        )}
      </main>
      {warning ? <GuestIdleWarning secondsRemaining={secondsRemaining} onStay={stayActive} onDone={onDone} /> : null}
    </AttachmentSourceContext.Provider>
  );
}
