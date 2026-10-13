// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../messages/en.json';

const registerUser = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/features/auth/api/authApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/api/authApi')>()),
  registerUser: (...args: unknown[]) => registerUser(...args),
}));

import { loadOrganisationIntent } from '@/lib/organisationIntent';
import { loadSubmitterProfile } from '@/lib/submitterProfile';
import { RegisterForm } from './RegisterForm';

const VALID_PASSWORD = 'Str0ng!Passw0rd';
const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function reachProfileStep() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RegisterForm />
    </NextIntlClientProvider>
  );
  type(/^Full Name/, 'Almaz Tesfaye');
  type(/^Email/, 'almaz@greenhighlands.org');
  type(/^Phone Number/, '0911000000');
  type(/^Password/, VALID_PASSWORD);
  type(/^Confirm Password/, VALID_PASSWORD);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Almost done!');
}

describe('registering an NGO or FPO representative', () => {
  beforeEach(() => registerUser.mockResolvedValue(undefined));
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it.each([
    ['NGO', 'ngo'],
    ['Cooperative / FPO', 'cooperative'],
  ])('asks nothing more about a %s here — its details come after sign-in', async (optionName, submitterType) => {
    await reachProfileStep();

    fireEvent.click(screen.getByRole('option', { name: optionName }));

    // No organisation-name / registration-number / Fayda ID form, no ID-consent box…
    expect(screen.queryByLabelText(/Organisation Name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/I consent to providing my national ID/)).not.toBeInTheDocument();
    // …just a note about what happens next, and Continue is immediately usable.
    expect(screen.getByText(/we'll ask for your organisation's registration details/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));

    // Registered as the ordinary account — the backend has no organisation type to register as yet.
    expect(registerUser.mock.calls[0]![0]).not.toHaveProperty('submitter_type');
    // The choice is remembered, which is what sends them to /ngo or /fpo after signing in.
    expect(loadSubmitterProfile('almaz@greenhighlands.org')?.submitterType).toBe(submitterType);
    // …and noted durably (it must outlive a logout), which is what actually does the sending.
    expect(loadOrganisationIntent('almaz@greenhighlands.org')).toBe(submitterType === 'ngo' ? 'ngo' : 'fpo');
    expect(await screen.findByText(/Log in to register your organisation/)).toBeInTheDocument();
  });

  it('still asks an individual farmer for their ID, as before', async () => {
    await reachProfileStep();
    fireEvent.click(screen.getByRole('option', { name: 'Individual Farmer' }));
    expect(screen.getByLabelText(/I consent to providing my national ID/)).toBeInTheDocument();
    expect(screen.queryByText(/we'll ask for your organisation's registration details/i)).not.toBeInTheDocument();
  });
});
