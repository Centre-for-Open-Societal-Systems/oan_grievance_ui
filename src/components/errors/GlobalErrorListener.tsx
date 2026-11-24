'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { reportClientEvent, resetClientReportBudget } from '@/lib/clientLogger';
import { safePath } from '@/lib/logRedaction';

// Browser noise that is not an app fault: a benign layout-observer notice, an
// opaque cross-origin "Script error." (no detail to act on), and scripts that
// extensions inject.
const IGNORED_MESSAGE = /ResizeObserver loop|^Script error\.?$/i;
const FOREIGN_SCRIPT = /^(chrome|moz|safari|safari-web)-extension:/i;

function isNoise(event: ErrorEvent): boolean {
  if (IGNORED_MESSAGE.test(event.message)) return true;
  return FOREIGN_SCRIPT.test(event.filename ?? '');
}

function locationOf(event: ErrorEvent): string | undefined {
  if (!event.filename) return undefined;
  return `${safePath(event.filename)}:${event.lineno}:${event.colno}`;
}

/**
 * Reports errors React's boundaries never see: a throw inside an event handler
 * or timer, and a promise rejected with nobody awaiting it. Also gives each
 * in-app navigation a fresh report budget. Renders nothing.
 */
export function GlobalErrorListener() {
  const pathname = usePathname();

  useEffect(() => {
    resetClientReportBudget();
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isNoise(event)) return;
      reportClientEvent({
        event: 'window.error',
        errorName: event.error instanceof Error ? event.error.name : undefined,
        location: locationOf(event),
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      reportClientEvent({
        event: 'window.unhandled_rejection',
        errorName: event.reason instanceof Error ? event.reason.name : undefined,
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
