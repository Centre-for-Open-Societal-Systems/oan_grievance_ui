'use client';

import { Button } from '@/components/ui/Button';
import { FileText, LogOut, Paperclip, RefreshCw } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { formatAttachmentSize } from '../detail-sidebar-panel/components/attachmentDisplay';
import { CommentsAndCommunication } from '../detail-sidebar-panel/components/CommentsAndCommunication';
import type { GuestCase } from './guestApi';
import { guestTimelineData } from './guestCaseData';
import { displayTicket } from './PinScreen';

export interface GuestCaseViewProps {
  data: GuestCase;
  refreshing: boolean;
  /** Set when a refresh failed for a reason that leaves the case on screen (a network error). */
  refreshError: string | null;
  onRefresh: () => void;
  /** Forget the PIN and the case and go back to the PIN screen. */
  onDone: () => void;
}

/**
 * The case, as its submitter opened it by link and PIN (STG-518). Read-only: the case panel's own
 * timeline of public entries, and the names of the files on them, which cannot be opened here.
 * No reply, actions, case management, submitter details or internal notes.
 */
export function GuestCaseView({ data, refreshing, refreshError, onRefresh, onDone }: GuestCaseViewProps) {
  const t = useTranslations('guestAccess.case');
  const format = useFormatter();
  const timelineData = useMemo(() => guestTimelineData(data), [data]);
  const dueDate = data.sla?.sla_due_date ? new Date(data.sla.sla_due_date) : null;

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-gray-900">
            {t('title', { ticket: displayTicket(data.ticket_number) })}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {data.status}
            </span>
            {dueDate && !Number.isNaN(dueDate.getTime()) ? (
              <span>{t('expectedBy', { date: format.dateTime(dueDate, { dateStyle: 'medium' }) })}</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onRefresh} isLoading={refreshing}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('refresh')}
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('done')}
          </Button>
        </div>
      </header>

      <p role="note" className="mx-6 mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
        {t('readOnlyNote')}
      </p>

      {refreshError ? (
        <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {refreshError}
        </p>
      ) : null}

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CommentsAndCommunication canManageCase={false} timelineData={timelineData} />
        </div>
        <section className="flex flex-col overflow-hidden rounded-xl border border-[#F1F3F4] bg-white shadow-sm">
          <h2 className="flex items-center gap-3 border-b border-gray-200 p-5 text-xl font-bold text-[#141F2B]">
            <Paperclip className="h-5 w-5 text-indigo-600" strokeWidth={2.5} aria-hidden="true" />
            {t('files')}
          </h2>
          <div className="px-5 py-3">
            {data.attachments.length === 0 ? (
              <p className="py-4 text-sm text-gray-500">{t('noFiles')}</p>
            ) : (
              <ul>
                {data.attachments.map((file) => (
                  <li key={file.name} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
                    <span className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {file.file_name || file.name}
                      </span>
                      <span className="text-xs text-gray-500">{formatAttachmentSize(file.size_bytes ?? 0)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="pt-2 text-xs text-gray-500">{t('filesNote')}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
