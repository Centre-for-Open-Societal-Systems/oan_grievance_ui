'use client';

import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { SupportingDocumentsField } from '../detail-sidebar-panel/components/SupportingDocumentsField';
import { GuestApiError, postGuestReply } from './guestApi';

export interface GuestReplyDraft {
  body: string;
  files: File[];
}

export interface GuestReplyFormProps {
  /** Held by the page, so a reply being typed survives the session ending and the PIN being entered again. */
  draft: GuestReplyDraft;
  onDraftChange: (draft: GuestReplyDraft) => void;
  onSent: () => void;
  /** The session is over; the page goes back to the PIN screen. */
  onSessionEnded: (error: GuestApiError) => void;
}

/** A public reply on the case, with files, from the submitter. */
export function GuestReplyForm({ draft, onDraftChange, onSent, onSessionEnded }: GuestReplyFormProps) {
  const t = useTranslations('guestAccess.reply');
  const fieldId = useId();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = draft.body.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await postGuestReply(body, draft.files);
      onDraftChange({ body: '', files: [] });
      onSent();
    } catch (failure) {
      if (failure instanceof GuestApiError && failure.endsSession) {
        onSessionEnded(failure);
        return;
      }
      setError(t('failed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4 rounded-xl border border-[#F1F3F4] bg-white p-6 shadow-sm"
    >
      <label htmlFor={fieldId} className="text-lg font-bold text-gray-900">
        {t('title')}
      </label>
      <textarea
        id={fieldId}
        rows={4}
        value={draft.body}
        onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
        placeholder={t('placeholder')}
        disabled={sending}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <SupportingDocumentsField
        files={draft.files}
        onChange={(files) => onDraftChange({ ...draft, files })}
        onRejected={() => setError(t('filesRejected'))}
        disabled={sending}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" isLoading={sending} disabled={!draft.body.trim() || sending}>
          {t('send')}
        </Button>
      </div>
    </form>
  );
}
