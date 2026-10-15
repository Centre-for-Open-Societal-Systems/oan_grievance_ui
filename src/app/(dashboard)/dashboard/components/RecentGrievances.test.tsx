// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import { RecentGrievances } from './RecentGrievances';

const fetchGrievances = vi.fn();
vi.mock('@/features/all-grievances/api/grievanceApi', () => ({
  fetchGrievances: (...args: unknown[]) => fetchGrievances(...args),
}));

const ROW = {
  name: 'GRV-0001',
  ticket_number: 'OR-INP-0001',
  ticket_number_display: 'OR-INP-0001',
  status: 'Require More Info',
  escalated: false,
  description: 'Seed delivery is two weeks late\nMore detail here',
  submitted_on: '2026-10-14 09:30:00',
};

function renderWidget() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecentGrievances />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RecentGrievances', () => {
  it('asks for the newest grievances first and lists them', async () => {
    fetchGrievances.mockResolvedValue({ items: [ROW], pagination: {} });
    renderWidget();
    expect(await screen.findByText('Seed delivery is two weeks late')).toBeInTheDocument();
    expect(screen.getByText('OR-INP-0001')).toBeInTheDocument();
    expect(screen.getByText('Require More Info')).toHaveClass('bg-orange-50');
    expect(fetchGrievances).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 10, sort_by: 'creation', sort_order: 'desc' }),
      expect.anything()
    );
  });

  it('says so when there are none', async () => {
    fetchGrievances.mockResolvedValue({ items: [], pagination: {} });
    renderWidget();
    expect(await screen.findByText('No grievances yet.')).toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    fetchGrievances.mockRejectedValueOnce(new Error('AUTH_ERROR')).mockResolvedValue({ items: [ROW], pagination: {} });
    renderWidget();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load recent grievances.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Seed delivery is two weeks late')).toBeInTheDocument());
  });
});
