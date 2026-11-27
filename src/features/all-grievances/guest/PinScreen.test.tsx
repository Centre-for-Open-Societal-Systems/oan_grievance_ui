// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { GuestApiError } from './guestApi';
import { displayTicket, PinScreen, type PinScreenProps } from './PinScreen';

const viewGuestCase = vi.hoisted(() => vi.fn());
vi.mock('./guestApi', async (original) => ({ ...(await original<typeof import('./guestApi')>()), viewGuestCase }));

const CASE = { ticket_number: '3-001-002A-0', status: 'Submitted', attachments: [], timeline: [] };

function renderPin(props: Partial<PinScreenProps> = {}) {
  const onVerified = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PinScreen ticket="3001002A0" token="Xk3pQ9vT2mLr8WzA1bNc4e" onVerified={onVerified} {...props} />
    </NextIntlClientProvider>
  );
  return { onVerified };
}

function enterPin(pin: string) {
  fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
  fireEvent.click(screen.getByRole('button', { name: 'View grievance' }));
}

describe('PinScreen', () => {
  afterEach(() => {
    cleanup();
    viewGuestCase.mockReset();
  });

  it('shows the ticket and asks for the PIN only', () => {
    renderPin();
    expect(screen.getByText('Grievance 3-001-002A-0')).toBeInTheDocument();
    expect(screen.getByLabelText('PIN')).toHaveAttribute('inputmode', 'numeric');
  });

  it('opens the case with the link token and PIN and hands both on', async () => {
    viewGuestCase.mockResolvedValue(CASE);
    const { onVerified } = renderPin();
    enterPin('482913');
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith(CASE, '482913'));
    expect(viewGuestCase).toHaveBeenCalledWith('3001002A0', 'Xk3pQ9vT2mLr8WzA1bNc4e', '482913');
  });

  it('says to check the message for a wrong PIN', async () => {
    viewGuestCase.mockRejectedValue(new GuestApiError('GUEST_ACCESS_INVALID', 401));
    renderPin();
    enterPin('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the SMS/Email for the correct PIN.');
    expect(screen.getByLabelText('PIN')).toHaveAttribute('aria-invalid', 'true');
  });

  it('says how long a locked link stays locked', async () => {
    viewGuestCase.mockRejectedValue(new GuestApiError('GUEST_ACCESS_LOCKED', 429, 600));
    renderPin();
    enterPin('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 10 minutes.');
  });

  it('says a closed case can no longer be opened and offers no PIN field', async () => {
    viewGuestCase.mockRejectedValue(new GuestApiError('GUEST_ACCESS_CLOSED', 410));
    renderPin();
    enterPin('482913');
    expect(await screen.findByRole('alert')).toHaveTextContent('This grievance is closed');
    expect(screen.queryByLabelText('PIN')).toBeNull();
  });

  it('reports a network failure', async () => {
    viewGuestCase.mockRejectedValue(new GuestApiError('NETWORK', 0));
    renderPin();
    enterPin('482913');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('asks for the link again when it came without a token, and calls nothing', () => {
    renderPin({ token: null });
    expect(screen.getByRole('alert')).toHaveTextContent('This link is incomplete');
    expect(screen.queryByLabelText('PIN')).toBeNull();
    expect(viewGuestCase).not.toHaveBeenCalled();
  });

  it('says why it is shown again after Done', () => {
    renderPin({ notice: 'signedOut' });
    expect(screen.getByRole('status')).toHaveTextContent('You have left your grievance.');
  });
});

describe('displayTicket', () => {
  it('groups a flat ticket number as the SMS prints it', () => {
    expect(displayTicket('3001002A0')).toBe('3-001-002A-0');
    expect(displayTicket('3-001-002A-0')).toBe('3-001-002A-0');
    expect(displayTicket('odd')).toBe('odd');
  });
});
