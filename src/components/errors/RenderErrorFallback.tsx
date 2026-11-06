'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { homeRouteForUser } from '@/features/auth/rbac';
import { reportClientEvent } from '@/lib/clientLogger';
import { organisationKindOf } from '@/lib/organisationKind';
import { newRequestId } from '@/lib/requestId';
import { useAppSelector } from '@/store/hooks';

interface RenderErrorFallbackProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/**
 * What a route shows when it throws while rendering: reports the failure with a
 * reference id (also printed here, for the user to quote) and offers a retry
 * and a way back to the signed-in user's own home.
 */
export function RenderErrorFallback({ error, reset }: RenderErrorFallbackProps) {
  const t = useTranslations('errorBoundary');
  const user = useAppSelector((state) => state.auth?.user);
  const [reference] = useState(() => error.digest ?? newRequestId());

  useEffect(() => {
    reportClientEvent({ event: 'render.error', requestId: reference, errorName: error.name });
  }, [error, reference]);

  const home = user ? homeRouteForUser(user.roles ?? [], organisationKindOf(user), Boolean(user.organisation)) : '/login';

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-lg bg-white p-6 text-center shadow">
      <h1 className="text-lg font-semibold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('body')}</p>
      <p className="mt-2 text-xs text-gray-500">{t('reference', { id: reference })}</p>
      <div className="mt-4 flex justify-center gap-3">
        <Button type="button" onClick={reset}>
          {t('retry')}
        </Button>
        <Link
          href={home}
          className="inline-flex h-11 items-center justify-center rounded-[12px] border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
