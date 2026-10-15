// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
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

import { IndividualFarmerForm } from '@/components/submitter-identity/SI-IndividualFarmerForm';
import { makeStore } from '@/store';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

afterEach(cleanup);

function renderRegister() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RegisterForm />
    </NextIntlClientProvider>
  );
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const VALID_PASSWORD = 'Str0ng!Passw0rd';

/** Fills the register account step with valid values and continues to the profile step. */
async function completeAccountStep() {
  type(/^Full Name/, 'Abebe Bikila');
  type(/^Email/, 'abebe@example.com');
  type(/^Phone Number/, '0911000000');
  type(/^Password/, VALID_PASSWORD);
  type(/^Confirm Password/, VALID_PASSWORD);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Almost done!');
}

describe('LoginForm after a staff sign-in with no access here', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/login?reason=staff_no_access');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  const renderLogin = () =>
    render(
      <Provider store={makeStore()}>
        <NextIntlClientProvider locale="en" messages={en}>
          <LoginForm staffSignInEnabled />
        </NextIntlClientProvider>
      </Provider>
    );

  it('offers to end the single sign-on session, and says so when it cannot', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, redirectTo: null })));
    global.fetch = fetchMock;
    renderLogin();

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out and use a different account' }));

    expect(
      await screen.findByText('Could not sign you out of the staff account. Sign out from the registry, then try again.')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', body: JSON.stringify({ returnTo: '/login' }) }));
    expect(screen.queryByRole('button', { name: 'Sign out and use a different account' })).not.toBeInTheDocument();
  });

  it('does not offer it for other sign-in failures', () => {
    window.history.replaceState(null, '', '/login?reason=staff_failed');
    renderLogin();
    expect(screen.queryByRole('button', { name: 'Sign out and use a different account' })).not.toBeInTheDocument();
  });
});

describe('LoginForm inline validation', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  const renderLogin = () =>
    render(
      <Provider store={makeStore()}>
        <NextIntlClientProvider locale="en" messages={en}>
          <LoginForm staffSignInEnabled={false} />
        </NextIntlClientProvider>
      </Provider>
    );

  it('shows a message under each empty field on submit, focuses the first, and sends nothing', () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(document.getElementById('login-email')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('login-password')).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('login-email')).toHaveFocus();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ties each message to its input for assistive tech', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const email = document.getElementById('login-email')!;
    const described = document.getElementById(email.getAttribute('aria-describedby')!);
    expect(described).toHaveTextContent('Enter your email address.');
  });

  it('checks an email when it loses focus, and clears the message as soon as it is fixed', () => {
    renderLogin();
    const email = document.getElementById('login-email')!;

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);
    expect(screen.getByText('Enter a valid email address, e.g. name@example.com.')).toBeInTheDocument();

    fireEvent.change(email, { target: { value: 'abebe@example.com' } });
    expect(screen.queryByText('Enter a valid email address, e.g. name@example.com.')).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid');
  });

  it('turns off the browser’s own validation bubbles so these messages are the ones shown', () => {
    const { container } = renderLogin();
    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });
});

describe('Register — account step', () => {
  beforeEach(() => {
    registerUser.mockReset();
  });

  it('reports every invalid field at once, focuses the first, and does not move on', () => {
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your phone number.')).toBeInTheDocument();
    expect(screen.getByText('Enter a password.')).toBeInTheDocument();
    expect(screen.getByText('Re-enter your password to confirm it.')).toBeInTheDocument();
    expect(document.getElementById('register-full-name')).toHaveFocus();
    expect(screen.queryByText('Almost done!')).not.toBeInTheDocument();
  });

  it('rejects a name that is only spaces, and one over the backend’s 140-character limit', () => {
    renderRegister();
    const name = document.getElementById('register-full-name')!;

    fireEvent.change(name, { target: { value: '     ' } });
    fireEvent.blur(name);
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();

    fireEvent.change(name, { target: { value: 'A'.repeat(141) } });
    expect(screen.getByText('Full name must be 140 characters or fewer.')).toBeInTheDocument();

    fireEvent.change(name, { target: { value: 'A'.repeat(140) } });
    expect(screen.queryByText(/140 characters or fewer/)).not.toBeInTheDocument();
  });

  it('shows a password mismatch under the confirmation, and clears it when the password is changed to match', () => {
    renderRegister();

    type(/^Password/, VALID_PASSWORD);
    fireEvent.change(document.getElementById('register-confirm-password')!, { target: { value: 'different' } });
    fireEvent.blur(document.getElementById('register-confirm-password')!);
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    // Editing the *password* to match re-checks the confirmation too.
    fireEvent.change(document.getElementById('register-password')!, { target: { value: 'different' } });
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
  });

  it('shows the first unmet password rule under the password', () => {
    renderRegister();
    const password = document.getElementById('register-password')!;

    fireEvent.change(password, { target: { value: 'short' } });
    fireEvent.blur(password);
    expect(screen.getByText('Password must be between 8 and 64 characters long.')).toBeInTheDocument();
  });

  it('creates no account on this step — that happens at the end of the profile step', async () => {
    renderRegister();
    await completeAccountStep();
    expect(registerUser).not.toHaveBeenCalled();
  });
});

describe('Register — profile step', () => {
  beforeEach(() => {
    registerUser.mockReset();
  });

  it('asks for a submitter type before continuing, under the dropdown', async () => {
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Select a submitter type to continue.')).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('shows required and malformed ID messages under the field itself, and creates no account until they are fixed', async () => {
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Individual Farmer' }));
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('This field is required.')).toBeInTheDocument();
    expect(document.getElementById('si-faydaId')).toHaveFocus();
    expect(registerUser).not.toHaveBeenCalled();

    const fayda = document.getElementById('si-faydaId')!;
    fireEvent.change(fayda, { target: { value: 'ab' } });
    expect(screen.getByText('Enter a valid Fayda ID: exactly 16 digits.')).toBeInTheDocument();

    fireEvent.change(fayda, { target: { value: '1234567890123456' } });
    expect(screen.queryByText(/Enter a valid Fayda ID/)).not.toBeInTheDocument();
  });

  it('shows no fields for a Development Agent, and registers them with that type', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Development Agent (on behalf)' }));

    expect(document.getElementById('si-faydaId')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/I consent to providing my national ID/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'abebe@example.com', submitter_type: 'Development Agent' })
    );
    expect(await screen.findByText('Account Created!')).toBeInTheDocument();
  });

  it('registers an individual farmer with that type and their Fayda ID', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Individual Farmer' }));
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '1234567890123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ submitter_type: 'Individual Farmer', fayda_id: '1234567890123456' })
    );
  });

  it('sends no Fayda ID for a Development Agent, who has none to give', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Development Agent (on behalf)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    expect(registerUser.mock.calls[0]![0]).not.toHaveProperty('fayda_id');
  });

  it('registers an organisation under the default type, with its representative’s Fayda ID', async () => {
    registerUser.mockResolvedValue(undefined);
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'NGO' }));
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-orgName')!, { target: { value: 'Green NGO' } });
    fireEvent.change(document.getElementById('si-registrationNumber')!, { target: { value: 'NGO-123' } });
    fireEvent.change(document.getElementById('si-representativeName')!, { target: { value: 'Tigist Bekele' } });
    fireEvent.change(document.getElementById('si-representativeFaydaId')!, { target: { value: '6557092147530500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
    const fields = registerUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(fields).not.toHaveProperty('submitter_type');
    expect(fields.fayda_id).toBe('6557092147530500');
  });

  it('stays on the profile step with the backend’s message when the Fayda ID is already registered, keeping what was typed', async () => {
    const message = "A Submitter Profile with dedupe key 'fayda:6557…' is already registered under another account.";
    registerUser.mockImplementation(async () => {
      throw new Error(message);
    });
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Individual Farmer' }));
    fireEvent.click(screen.getByLabelText(/I consent to providing my national ID/));
    fireEvent.change(document.getElementById('si-faydaId')!, { target: { value: '6557092147530500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByText('Almost done!')).toBeInTheDocument();
    expect(document.getElementById('si-faydaId')).toHaveValue('6557092147530500');
  });

  it('clears that message once the next attempt goes through', async () => {
    registerUser.mockRejectedValueOnce(new Error("Submitter Type 'Development Agent' does not exist."));
    registerUser.mockResolvedValueOnce(undefined);
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Development Agent (on behalf)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Submitter Type/);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Account Created!')).toBeInTheDocument();
  });

  it('returns to the account step with the backend’s message if registration is rejected', async () => {
    // Rejects when called (not up front), the way the real request does.
    registerUser.mockImplementation(async () => {
      throw new Error('An account with this email already exists.');
    });
    renderRegister();
    await completeAccountStep();

    fireEvent.click(screen.getByRole('option', { name: 'Development Agent (on behalf)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Full Name/)).toHaveValue('Abebe Bikila');
  });
});

describe('Submitter identity form fields', () => {
  it('shows a field’s message under it and marks it invalid for assistive tech', () => {
    render(
      <IndividualFarmerForm
        values={{}}
        setValue={vi.fn()}
        errors={{ faydaId: 'Enter a valid Fayda ID: exactly 16 digits.' }}
      />
    );

    const fayda = document.getElementById('si-faydaId')!;
    expect(fayda).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(fayda.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Enter a valid Fayda ID'
    );
    // Fields without an error are untouched.
    expect(document.getElementById('si-fullName')).not.toHaveAttribute('aria-invalid');
  });

  it('reports a field when it loses focus, so the caller can validate it', () => {
    const onFieldBlur = vi.fn();
    render(<IndividualFarmerForm values={{}} setValue={vi.fn()} onFieldBlur={onFieldBlur} />);

    fireEvent.blur(document.getElementById('si-fullName')!);
    fireEvent.blur(document.getElementById('si-faydaId')!);

    expect(onFieldBlur).toHaveBeenNthCalledWith(1, 'fullName');
    expect(onFieldBlur).toHaveBeenNthCalledWith(2, 'faydaId');
  });
});
