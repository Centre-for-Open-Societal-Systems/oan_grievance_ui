'use client';

import { AuthBootstrapGate } from '@/features/auth/components/AuthBootstrapGate';
import { store } from '@/store';
import { Provider as ReduxProvider } from 'react-redux';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <AuthBootstrapGate>{children}</AuthBootstrapGate>
    </ReduxProvider>
  );
}
