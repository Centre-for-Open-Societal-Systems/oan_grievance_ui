'use client';

import { RenderErrorFallback } from '@/components/errors/RenderErrorFallback';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RenderErrorFallback error={error} reset={reset} />;
}
