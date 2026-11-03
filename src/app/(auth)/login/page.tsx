import LoginPage from '@/features/auth/pages/LoginPage';
import { UNKNOWN_CLIENT_IP } from '@/lib/clientIp';
import { fetchLoginProviders } from '@/lib/iamSession';
import type { Metadata } from 'next';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Sign In | Grievance Management Portal',
  robots: { index: false, follow: false },
};

export default async function Login() {
  // Rendered per request, not at build time: the login options are
  // oan_auth_service's (`/api/v1/auth/iam/providers`), enabled and disabled
  // there at runtime. Only their keys and display fields reach the client.
  await connection();
  return <LoginPage providers={await fetchLoginProviders(UNKNOWN_CLIENT_IP)} />;
}
