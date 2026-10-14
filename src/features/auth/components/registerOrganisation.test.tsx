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

const REGISTRATION_NUMBER = /^Registration Number/;

describe('registering an NGO or FPO representative', () => {
  // Braces matter: a function returned from beforeEach is run by vitest as cleanup.
  beforeEach(() => {
    registerUser.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it.each([
    ['NGO', 'NGO'],
    ['Cooperative / FPO', 'FPO'],
  ])('asks a %s for its registration number — and nothing about a national ID', async (optionName) => {
    await reachProfileStep();

    fireEvent.click(screen.getByRole('option', { name: optionName }));

    expect(screen.getByLabelText(REGISTRATION_NUMBER)).toBeInTheDocument();
    // Not the old organisation-name / representative / Fayda ID form, and no ID-consent box.
    expect(screen.queryByLabelText(/Organisation Name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Fayda/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/I consent to providing my national ID/)).not.toBeInTheDocument();
    expect(screen.getByText(/we'll ask for the rest of your organisation's registration details/i)).toBeInTheDocument();
  });

  it.each([
    ['NGO', 'NGO'],
    ['Cooperative / FPO', 'FPO'],
  ])('registers a %s under its type with its registration number, and no Fayda ID', async (optionName, backendType) => {
    await reachProfileStep();
    fireEvent.click(screen.getByRole('option', { name: optionName }));
    type(REGISTRATION_NUMBER, 'reg-2024/0042');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));

    expect(registerUser.mock.calls[0]![0]).toEqual({
      email: 'almaz@greenhighlands.org',
      password: VALID_PASSWORD,
      full_name: 'Almaz Tesfaye',
      phone_number: '+251911000000',
      submitter_type: backendType,
      registration_number: 'REG-2024/0042',
    });
    expect(await screen.findByText(/Log in to register your organisation/)).toBeInTheDocument();
  });

  it('will not register without a registration number, or with a malformed one', async () => {
    await reachProfileStep();
    fireEvent.click(screen.getByRole('option', { name: 'NGO' }));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
    expect(document.getElementById('si-registrationNumber')).toHaveFocus();

    type(REGISTRATION_NUMBER, '!!');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Use 3-60 letters or numbers/)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("shows the backend's refusal of the registration number on this step, where it can be fixed", async () => {
    registerUser.mockImplementation(async () => {
      throw new Error("An organization with registration number 'REG-1' is already registered.");
    });
    await reachProfileStep();
    fireEvent.click(screen.getByRole('option', { name: 'NGO' }));
    type(REGISTRATION_NUMBER, 'REG-1');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/);
    // Still on the profile step, with what was typed.
    expect(screen.getByLabelText(REGISTRATION_NUMBER)).toHaveValue('REG-1');
  });

  it('shows the duplicate-number refusal the backend really sends (a dedupe-key message) on this step too', async () => {
    registerUser.mockImplementation(async () => {
      throw new Error("A Submitter Profile with dedupe key 'org:REG-1' is already registered under another account.");
    });
    await reachProfileStep();
    fireEvent.click(screen.getByRole('option', { name: 'NGO' }));
    type(REGISTRATION_NUMBER, 'REG-1');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered under another account/);
    expect(screen.getByLabelText(REGISTRATION_NUMBER)).toHaveValue('REG-1');
  });

  it('still registers an individual farmer with their Fayda ID and no registration number', async () => {
    await reachProfileStep();
    fireEvent.click(screen.getByRole('option', { name: 'Individual Farmer' }));
    expect(screen.queryByLabelText(REGISTRATION_NUMBER)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '1234567890123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    const sent = registerUser.mock.calls[0]![0];
    expect(sent).toMatchObject({ submitter_type: 'Individual Farmer', fayda_id: '1234567890123456' });
    expect(sent).not.toHaveProperty('registration_number');
  });
});
