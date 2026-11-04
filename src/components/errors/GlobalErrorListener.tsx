'use client';

import { useEffect } from 'react';
import { reportClientEvent } from '@/lib/clientLogger';

/**
 * Reports errors React's boundaries never see: a throw inside an event handler
 * or timer, and a promise rejected with nobody awaiting it. Renders nothing.
 */
export function GlobalErrorListener() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientEvent({ event: 'window.error', message: event.message });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: unknown } | null;
      reportClientEvent({
        event: 'window.unhandled_rejection',
        message: typeof reason?.message === 'string' ? reason.message : 'Unhandled promise rejection',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
