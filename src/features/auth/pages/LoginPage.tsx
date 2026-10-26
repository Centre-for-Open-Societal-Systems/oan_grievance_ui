'use client';

import { PortalShell } from '@/components/auth/PortalShell';
import type { LoginOptionButton } from '@/features/auth/components/LoginForm';
import { RoleChooser } from '@/features/auth/components/RoleChooser';

export default function LoginPage({ providers }: { providers?: LoginOptionButton[] | null } = {}) {
  return (
    <PortalShell badge="Grievance Portal">
      <RoleChooser providers={providers} />
    </PortalShell>
  );
}
