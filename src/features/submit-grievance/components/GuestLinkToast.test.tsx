// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../messages/en.json';
import { GrievanceSubmittedCard } from './GrievanceSubmittedCard';

const LINK = 'https://grievance.example.org/g/3001002A0#k=Xk3pQ9vT2mLr8WzA1bNc4e';

function renderCard(guestAccess?: { link: string; pin: string }) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GrievanceSubmittedCard
        result={{ ticket_number: '3-001-002A-0', status: 'Submitted', status_pin: '111111', guest_access: guestAccess }}
      />
    </NextIntlClientProvider>
  );
}

describe('GuestLinkToast on the submitted screen', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the link and PIN of a sensitive anonymous case and lets them be copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderCard({ link: LINK, pin: '482913' });

    expect(screen.getByText('Your grievance link and PIN')).toBeInTheDocument();
    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(screen.getByText('482913')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy PIN' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK));
    expect(writeText).toHaveBeenCalledWith('482913');
  });

  it('stays until it is closed', () => {
    renderCard({ link: LINK, pin: '482913' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(LINK)).toBeNull();
  });

  it('is not there when the backend sent no link', () => {
    renderCard();
    expect(screen.queryByText('Your grievance link and PIN')).toBeNull();
  });
});
