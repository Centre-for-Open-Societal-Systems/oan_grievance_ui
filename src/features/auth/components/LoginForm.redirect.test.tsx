// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';

const push = vi.fn();
const loginUser = vi.fn();
const getMe = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/features/auth/api/authApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/api/authApi')>()),
  loginUser: (...args: unknown[]) => loginUser(...args),
  getMe: (...args: unknown[]) => getMe(...args),
}));

import { makeStore } from '@/store';
import { LoginForm } from './LoginForm';

const SUBMITTER = 'Grievance Submitter';

async function signInAs(user: { email: string; roles: string[]; type?: string }) {
  loginUser.mockResolvedValue(user);
  getMe.mockResolvedValue(user);
  render(
    <Provider store={makeStore()}>
      <NextIntlClientProvider locale="en" messages={en}>
        <LoginForm staffSignInEnabled={false} />
      </NextIntlClientProvider>
    </Provider>
  );
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Whatever1!' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  return push.mock.calls[0]![0] as string;
}

describe('where signing in lands', () => {
  beforeEach(() => window.history.replaceState({}, '', '/login'));
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sends an NGO representative to /ngo and an FPO representative to /fpo, by the type the backend reports', async () => {
    expect(await signInAs({ email: 'rep@ngo.org', roles: [SUBMITTER], type: 'NGO' })).toBe('/ngo');
    cleanup();
    push.mockClear();
    expect(await signInAs({ email: 'rep@fpo.org', roles: [SUBMITTER], type: 'FPO' })).toBe('/fpo');
  });

  it('lands a newly signed-up NGO on /ngo at its first sign-in, before any organisation is registered, on any browser', async () => {
    // Nothing in localStorage: the type comes from the account (registered as NGO at sign-up).
    expect(localStorage.length).toBe(0);
    expect(await signInAs({ email: 'new@ngo.org', roles: [SUBMITTER], type: 'NGO' })).toBe('/ngo');
  });

  it('keeps farmers on Submit Grievance', async () => {
    expect(await signInAs({ email: 'farmer@example.com', roles: [SUBMITTER], type: 'Individual Farmer' })).toBe(
      '/submit-grievance'
    );
  });

  it('keeps staff on their own home, whatever their profile type says', async () => {
    expect(await signInAs({ email: 'admin@example.com', roles: ['Grievance Admin'], type: 'NGO' })).toBe('/dashboard');
  });
});
