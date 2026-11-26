// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { GuestApiError, type GuestCase } from './guestApi';
import { GuestAccessPage } from './GuestAccessPage';

const api = vi.hoisted(() => ({
  verifyGuestAccess: vi.fn(),
  fetchGuestCase: vi.fn(),
  postGuestReply: vi.fn(),
  endGuestSession: vi.fn(),
  keepGuestSessionAlive: vi.fn(),
}));
vi.mock('./guestApi', async (original) => ({ ...(await original<typeof import('./guestApi')>()), ...api }));

const CASE: GuestCase = {
  ticket_number: '3-001-002A-0',
  status: 'In Progress',
  description: 'The fertiliser never arrived at our kebele.',
  sla: { sla_due_date: '2027-01-10T12:00:00+03:00' },
  attachments: [],
  timeline: [
    {
      id: 'TL-1',
      entry_type: 'dept_response',
      body: 'We are looking into it.',
      author_type: 'officer',
      created_on: '2026-11-26T10:00:00+03:00',
    },
  ],
};

function renderPage() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GuestAccessPage ticket="3001002A0" />
    </NextIntlClientProvider>
  );
}

async function signIn() {
  fireEvent.change(await screen.findByLabelText('PIN'), { target: { value: '482913' } });
  fireEvent.click(screen.getByRole('button', { name: 'View grievance' }));
  await screen.findByText('We are looking into it.');
}

describe('GuestAccessPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/g/3001002A0#k=Xk3pQ9vT2mLr8WzA1bNc4e');
    api.verifyGuestAccess.mockResolvedValue({ ticket_number: '3-001-002A-0', idle_timeout_seconds: 900 });
    api.fetchGuestCase.mockResolvedValue(CASE);
    api.keepGuestSessionAlive.mockResolvedValue({ idle_timeout_seconds: 900 });
    api.endGuestSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('takes the token out of the address bar and shows only the PIN screen first', async () => {
    renderPage();
    expect(await screen.findByLabelText('PIN')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/g/3001002A0');
    expect(api.fetchGuestCase).not.toHaveBeenCalled();
    expect(screen.queryByText(CASE.description!)).toBeNull();
  });

  it('opens the case once the PIN is verified, with the link token it read', async () => {
    renderPage();
    await signIn();
    expect(api.verifyGuestAccess).toHaveBeenCalledWith('3001002A0', 'Xk3pQ9vT2mLr8WzA1bNc4e', '482913');
    expect(screen.getByText('Grievance 3-001-002A-0')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    // Staff-only panels are not part of the guest view.
    expect(screen.queryByText(/Case Management/i)).toBeNull();
    expect(screen.queryByText(/Submitter Details/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Export/i })).toBeNull();
  });

  it('sends a reply with the session and shows the case again', async () => {
    api.postGuestReply.mockResolvedValue({ name: 'TL-2' });
    renderPage();
    await signIn();
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Here is the receipt.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(api.postGuestReply).toHaveBeenCalledWith('Here is the receipt.', []));
    await waitFor(() => expect(api.fetchGuestCase).toHaveBeenCalledTimes(2));
  });

  it('goes back to the PIN screen when the session ends, keeping the reply being typed', async () => {
    api.postGuestReply.mockRejectedValue(new GuestApiError('GUEST_SESSION_EXPIRED', 401));
    renderPage();
    await signIn();
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'Half a reply' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByText('Your session ended. Enter your PIN again to continue.')).toBeInTheDocument();

    await signIn();
    expect(screen.getByLabelText('Reply')).toHaveValue('Half a reply');
  });

  it('says the case is closed when the session ends because of it', async () => {
    api.fetchGuestCase.mockRejectedValue(new GuestApiError('GUEST_ACCESS_CLOSED', 410));
    renderPage();
    fireEvent.change(await screen.findByLabelText('PIN'), { target: { value: '482913' } });
    fireEvent.click(screen.getByRole('button', { name: 'View grievance' }));
    expect(await screen.findByText(/This grievance is closed/)).toBeInTheDocument();
    expect(screen.queryByLabelText('PIN')).toBeNull();
  });

  it('ends the session on the server when the guest chooses Done', async () => {
    renderPage();
    await signIn();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(api.endGuestSession).toHaveBeenCalled();
    expect(await screen.findByText(/You have left your grievance/)).toBeInTheDocument();
  });

  it('warns a minute before the idle limit and returns to the PIN screen when it lapses', async () => {
    // Installed before the page mounts, so its clock and interval are the fake ones.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await signIn();
    await act(async () => {
      vi.advanceTimersByTime(14 * 60_000 + 1_000);
    });
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Still there?');
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Your session ended. Enter your PIN again to continue.')).toBeInTheDocument();
  });

  it('keeps the session alive when the guest stays', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await signIn();
    await act(async () => {
      vi.advanceTimersByTime(14 * 60_000 + 1_000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(api.keepGuestSessionAlive).toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
