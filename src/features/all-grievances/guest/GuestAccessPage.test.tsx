// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { GuestApiError, type GuestCase } from './guestApi';
import { GuestAccessPage } from './GuestAccessPage';

const viewGuestCase = vi.hoisted(() => vi.fn());
vi.mock('./guestApi', async (original) => ({ ...(await original<typeof import('./guestApi')>()), viewGuestCase }));

const TOKEN = 'Xk3pQ9vT2mLr8WzA1bNc4e';
const CASE: GuestCase = {
  ticket_number: '3-001-002A-0',
  status: 'In Progress',
  description: 'The fertiliser never arrived at our kebele.',
  sla: { sla_due_date: '2027-01-10T12:00:00+03:00' },
  attachments: [{ name: 'att-1', file_name: 'receipt.jpg', size_bytes: 2048, scan_status: 'Clean' }],
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

async function openCase() {
  fireEvent.change(await screen.findByLabelText('PIN'), { target: { value: '482913' } });
  fireEvent.click(screen.getByRole('button', { name: 'View grievance' }));
  await screen.findByText('We are looking into it.');
}

describe('GuestAccessPage', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', `/g/3001002A0#k=${TOKEN}`);
    viewGuestCase.mockResolvedValue(CASE);
  });

  afterEach(() => {
    cleanup();
    viewGuestCase.mockReset();
  });

  it('takes the token out of the address bar and shows only the PIN screen first', async () => {
    renderPage();
    expect(await screen.findByLabelText('PIN')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/g/3001002A0');
    expect(viewGuestCase).not.toHaveBeenCalled();
    expect(screen.queryByText(CASE.description!)).toBeNull();
  });

  it('shows the case read-only once the PIN is right', async () => {
    renderPage();
    await openCase();
    expect(viewGuestCase).toHaveBeenCalledWith('3001002A0', TOKEN, '482913');
    expect(screen.getByText('Grievance 3-001-002A-0')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    // Files are named, not opened.
    expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /receipt\.jpg/ })).toBeNull();
    // Nothing to write or act on, and no staff panels.
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText(/Case Management/i)).toBeNull();
    expect(screen.queryByText(/Submitter Details/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Export/i })).toBeNull();
  });

  it('refreshes by sending the token and PIN again, kept in memory', async () => {
    renderPage();
    await openCase();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(viewGuestCase).toHaveBeenCalledTimes(2));
    expect(viewGuestCase).toHaveBeenLastCalledWith('3001002A0', TOKEN, '482913');
  });

  it('keeps the case on screen when a refresh only fails to connect', async () => {
    renderPage();
    await openCase();
    viewGuestCase.mockRejectedValueOnce(new GuestApiError('NETWORK', 0));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh');
    expect(screen.getByText('We are looking into it.')).toBeInTheDocument();
  });

  it('says the case is closed when a refresh finds it closed', async () => {
    renderPage();
    await openCase();
    viewGuestCase.mockRejectedValueOnce(new GuestApiError('GUEST_ACCESS_CLOSED', 410));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(/This grievance is closed/)).toBeInTheDocument();
    expect(screen.queryByLabelText('PIN')).toBeNull();
  });

  it('forgets the PIN when the guest chooses Done', async () => {
    renderPage();
    await openCase();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText(/You have left your grievance/)).toBeInTheDocument();
    expect(screen.getByLabelText('PIN')).toHaveValue('');
    expect(screen.queryByText('We are looking into it.')).toBeNull();
  });
});
