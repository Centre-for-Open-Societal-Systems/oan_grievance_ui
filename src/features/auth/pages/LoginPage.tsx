'use client';

import { PortalShell } from '@/components/auth/PortalShell';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage({ staffSignInEnabled }: { staffSignInEnabled: boolean }) {
  return (
    <PortalShell badge="Grievance Portal">
      <LoginForm staffSignInEnabled={staffSignInEnabled} />
    </PortalShell>
  );
}
