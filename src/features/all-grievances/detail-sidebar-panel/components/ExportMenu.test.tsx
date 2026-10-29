// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import { ApiError } from '@/lib/api';
import { ExportMenu } from './ExportMenu';

const exportGrievance = vi.hoisted(() => vi.fn());
vi.mock('../../api/grievanceApi', () => ({ exportGrievance }));

function renderMenu(locale = 'en', ticketNumber = '3-001-002A-0') {
  const ui = (ticket: string) => (
    <NextIntlClientProvider locale={locale} messages={en}>
      <ExportMenu ticketNumber={ticket} />
    </NextIntlClientProvider>
  );
  const view = render(ui(ticketNumber));
  return { rerenderWith: (ticket: string) => view.rerender(ui(ticket)) };
}

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Export this case' }));

describe('ExportMenu', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    exportGrievance.mockReset();
  });

  it('downloads the chosen format in English and releases the blob URL afterwards', async () => {
    exportGrievance.mockResolvedValue({ blob: new Blob(['x']), fileName: 'grievance-3-001-002A-0.pdf' });
    renderMenu();

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Download as PDF' }));

    await waitFor(() =>
      expect(exportGrievance).toHaveBeenCalledWith(
        '3-001-002A-0',
        'pdf',
        'en',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    // Not revoked in the same tick as the click, which can cancel the download.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export'), { timeout: 2500 });
    expect(screen.queryByRole('button', { name: 'Download as PDF' })).not.toBeInTheDocument();
  });

  it('asks for the Amharic form when the portal is in Amharic', async () => {
    exportGrievance.mockResolvedValue({ blob: new Blob(['x']), fileName: 'grievance-3-001-002A-0-am.csv' });
    renderMenu('am');

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Download as CSV' }));

    await waitFor(() =>
      expect(exportGrievance).toHaveBeenCalledWith('3-001-002A-0', 'csv', 'am', expect.anything())
    );
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderMenu();
    open();
    expect(screen.getByRole('button', { name: 'Download as PDF' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'Download as PDF' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export this case' })).toHaveFocus();
  });

  it('shows translated copy for a missing case', async () => {
    exportGrievance.mockRejectedValue(new ApiError('Not found', null, 404));
    renderMenu();

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Download as PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.caseExport.notFound);
  });

  it('shows translated copy when the export is forbidden', async () => {
    exportGrievance.mockRejectedValue(new Error('FORBIDDEN'));
    renderMenu();

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Download as PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.caseExport.forbidden);
  });

  it('falls back to generic copy on a server error', async () => {
    exportGrievance.mockRejectedValue(new ApiError('boom', null, 500));
    renderMenu();

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Download as CSV' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.caseExport.failed);
  });

  it('drops an export that finishes after the case changed', async () => {
    let resolve!: (value: { blob: Blob; fileName: string }) => void;
    exportGrievance.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const { rerenderWith } = renderMenu();

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Download as PDF' }));
    await waitFor(() => expect(exportGrievance).toHaveBeenCalled());
    const signal = (exportGrievance.mock.calls[0]?.[3] as { signal: AbortSignal }).signal;

    rerenderWith('3-001-003B-0');
    expect(signal.aborted).toBe(true);
    resolve({ blob: new Blob(['x']), fileName: 'grievance-old.pdf' });
    await Promise.resolve();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export this case' })).toBeEnabled();
  });
});
