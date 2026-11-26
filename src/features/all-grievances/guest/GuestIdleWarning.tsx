'use client';

import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export interface GuestIdleWarningProps {
  secondsRemaining: number;
  onStay: () => void;
  onDone: () => void;
}

/** Shown a minute before a guest session's idle limit: stay, or leave now. */
export function GuestIdleWarning({ secondsRemaining, onStay, onDone }: GuestIdleWarningProps) {
  const t = useTranslations('guestAccess.idle');
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="guest-idle-title"
      aria-describedby="guest-idle-body"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="guest-idle-title" className="text-lg font-bold text-gray-900">
          {t('title')}
        </h2>
        <p id="guest-idle-body" className="mt-2 text-sm text-gray-600">
          {t('body', { countdown: formatCountdown(secondsRemaining) })}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onDone}>
            {t('done')}
          </Button>
          <Button type="button" onClick={onStay}>
            {t('stay')}
          </Button>
        </div>
      </div>
    </div>
  );
}
