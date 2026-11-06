'use client';

import { useState } from 'react';
import { GlobalErrorListener } from '@/components/errors/GlobalErrorListener';
import { AuthBootstrapGate } from '@/features/auth/components/AuthBootstrapGate';
import { makeStore } from '@/store';
import { Provider as ReduxProvider } from 'react-redux';

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => makeStore());

  return (
    <ReduxProvider store={store}>
      <GlobalErrorListener />
      <AuthBootstrapGate>{children}</AuthBootstrapGate>
    </ReduxProvider>
  );
}
