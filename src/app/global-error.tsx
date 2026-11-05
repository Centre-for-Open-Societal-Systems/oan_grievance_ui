'use client';

import { useEffect, useState } from 'react';
import { reportClientEvent } from '@/lib/clientLogger';
import { newRequestId } from '@/lib/requestId';
import './globals.css';

// Replaces the root layout when it throws, so there is no i18n provider here:
// the copy is fixed English by necessity. The stylesheet is imported again
// because the layout that normally brings it is the thing that failed; its
// background and text colours follow the light/dark scheme.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reference] = useState(() => error.digest ?? newRequestId());

  useEffect(() => {
    reportClientEvent({ event: 'render.error', requestId: reference, errorName: error.name });
  }, [error, reference]);

  return (
    <html lang="en">
      <body>
        <div role="alert" className="mx-auto mt-16 max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm opacity-80">The portal could not be shown. Please try again.</p>
          <p className="mt-2 text-xs opacity-60">Reference: {reference}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-[12px] bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
