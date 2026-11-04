'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { reportClientEvent } from '@/lib/clientLogger';
import { newRequestId } from '@/lib/requestId';

interface RenderErrorFallbackProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * What a route shows when it throws while rendering: reports the failure with a
 * reference id (also printed here, for the user to quote) and offers a retry.
 */
export function RenderErrorFallback({ error, reset }: RenderErrorFallbackProps) {
  const t = useTranslations('errorBoundary');
  const [reference] = useState(() => error.digest ?? newRequestId());

  useEffect(() => {
    reportClientEvent({ event: 'render.error', requestId: reference, message: error.message });
  }, [error, reference]);

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-lg bg-white p-6 text-center shadow">
      <h1 className="text-lg font-semibold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('body')}</p>
      <p className="mt-2 text-xs text-gray-500">{t('reference', { id: reference })}</p>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" onClick={reset} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          {t('retry')}
        </button>
        <a href="/dashboard" className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700">
          {t('home')}
        </a>
      </div>
    </div>
  );
}
