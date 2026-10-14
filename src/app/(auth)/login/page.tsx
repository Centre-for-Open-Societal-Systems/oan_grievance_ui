import LoginPage from '@/features/auth/pages/LoginPage';
import { iamConfig } from '@/lib/iamSession';
import type { Metadata } from 'next';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: 'Sign In | Grievance Management Portal',
  robots: { index: false, follow: false },
};

export default async function Login() {
  // Rendered per request, not at build time: whether staff sign-in is
  // configured is read from the runtime environment. Only the boolean
  // reaches the client — never IAM's address.
  await connection();
  return <LoginPage staffSignInEnabled={!!iamConfig()} />;
}
