'use client';

import { useEffect, useState } from 'react';
import { reportClientEvent } from '@/lib/clientLogger';
import { newRequestId } from '@/lib/requestId';

// Replaces the root layout when it throws, so there is no i18n provider here:
// the copy is fixed English by necessity.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reference] = useState(() => error.digest ?? newRequestId());

  useEffect(() => {
    reportClientEvent({ event: 'render.error', requestId: reference, message: error.message });
  }, [error, reference]);

  return (
    <html lang="en">
      <body>
        <div role="alert" style={{ maxWidth: 420, margin: '4rem auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <p>The portal could not be shown. Please try again.</p>
          <p style={{ fontSize: 12, color: '#6b7280' }}>Reference: {reference}</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
