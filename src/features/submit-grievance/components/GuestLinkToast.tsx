'use client';

import { useCopyFeedback } from '@/components/ui/useCopyFeedback';
import { Check, Copy, KeyRound, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export interface GuestLinkToastProps {
  /** The case link, its token after `#k=`. */
  link: string;
  pin: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { isCopied, copy } = useCopyFeedback();
  return (
    <button
      type="button"
      onClick={() => void copy(text)}
      aria-label={label}
      className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {isCopied ? <Check className="h-4 w-4 text-green-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

/**
 * TEMPORARY (STG-518), while SMS and email are not delivering: the link and PIN of the sensitive
 * anonymous case just filed, shown once to the submitter who filed it. The backend sends them only
 * while `guest_access_show_on_submit` is on, so switching that off removes this toast too.
 *
 * It stays until closed: it holds the only copy the submitter gets, so it must not vanish on a timer.
 * Nothing here is stored; leaving the page loses it.
 */
export function GuestLinkToast({ link, pin }: GuestLinkToastProps) {
  const t = useTranslations('guestLinkToast');
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[90] w-[min(28rem,calc(100vw-3rem))] rounded-xl border border-rose-200 bg-white p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <KeyRound className="h-4 w-4 text-rose-600" aria-hidden="true" />
          {t('title')}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t('close')}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{t('linkLabel')}</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="min-w-0 flex-1 break-all rounded-md bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-800">
              {link}
            </span>
            <CopyButton text={link} label={t('copyLink')} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{t('pinLabel')}</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="rounded-md bg-gray-50 px-2 py-1.5 font-mono text-lg font-bold tracking-[0.3em] text-gray-900">
              {pin}
            </span>
            <CopyButton text={pin} label={t('copyPin')} />
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-rose-800">{t('warning')}</p>
    </div>
  );
}
