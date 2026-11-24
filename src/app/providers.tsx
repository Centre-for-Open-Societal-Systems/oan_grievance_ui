'use client';

import { useState } from 'react';
import { GlobalErrorListener } from '@/components/errors/GlobalErrorListener';
import { AuthBootstrapGate } from '@/features/auth/components/AuthBootstrapGate';
import type { User } from '@/features/auth/store/authSlice';
import { makeStore } from '@/store';
import { Provider as ReduxProvider } from 'react-redux';

export function Providers({ children, initialUser = null }: { children: React.ReactNode; initialUser?: User | null }) {
  const [store] = useState(() => makeStore(initialUser));

  return (
    <ReduxProvider store={store}>
      <GlobalErrorListener />
      <AuthBootstrapGate>{children}</AuthBootstrapGate>
    </ReduxProvider>
  );
}
