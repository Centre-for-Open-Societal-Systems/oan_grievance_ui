// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentRow } from '@/lib/attachments';

const fetchAttachmentBlobUrl = vi.fn<(attachment: string, download?: boolean) => Promise<string>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  fetchAttachmentBlobUrl: (...args: [string, boolean?]) => fetchAttachmentBlobUrl(...args),
}));
import { AttachmentsList } from './AttachmentsList';

import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

function renderIntl(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={en}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}


afterEach(cleanup);

const ROW: AttachmentRow = {
  name: 'ATT-0001',
  file_name: 'id-card.pdf',
  mime_type: 'application/pdf',
  size_bytes: 245_000,
  document_type: null,
  response: null,
  scan_status: 'Clean',
  scanned_at: '2026-09-23T10:00:00Z',
  uploaded_by_user: null,
  uploaded_by_submitter: 'SUB-001',
  creation: '2026-09-23T09:59:00Z',
};

describe('AttachmentsList', () => {
  it('shows loading state when isLoading is true', () => {
    renderIntl(<AttachmentsList isLoading={true} />);
    expect(screen.getByText('Loading attachments…')).toBeInTheDocument();
  });

  it('shows the case attachments with file size and scan status', () => {
    renderIntl(<AttachmentsList attachments={[ROW]} />);

    expect(screen.getByText('id-card.pdf')).toBeInTheDocument();
    expect(screen.getByText('239.3 KB')).toBeInTheDocument();
    expect(screen.getByText('Clean')).toBeInTheDocument();
  });

  it('shows a distinct "Scan failed" badge for a Failed scan, not the Scanning… state', () => {
    renderIntl(<AttachmentsList attachments={[{ ...ROW, scan_status: 'Failed' }]} />);

    expect(screen.getByText('Scan failed')).toBeInTheDocument();
    expect(screen.queryByText('Scanning…')).not.toBeInTheDocument();
  });

  it('shows an empty state when the case has no attachments', () => {
    renderIntl(<AttachmentsList attachments={[]} />);

    expect(screen.getByText('No attachments on this case.')).toBeInTheDocument();
  });

  it('shows an error state when error is passed', () => {
    renderIntl(<AttachmentsList error="network down" />);

    expect(screen.getByText('Could not load attachments for this case.')).toBeInTheDocument();
  });

  it('opens the document viewer and keeps preview unavailable while the file has not scanned Clean', () => {
    renderIntl(<AttachmentsList attachments={[{ ...ROW, scan_status: 'Pending' }]} />);

    fireEvent.click(screen.getByText('id-card.pdf'));

    expect(screen.getByRole('heading', { name: 'id-card.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
    expect(fetchAttachmentBlobUrl).not.toHaveBeenCalled();
    expect(screen.queryByTitle('Delete this attachment')).not.toBeInTheDocument();
  });

  it('plays a clean voice recording inline so an officer can listen to it', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:voice');
    const voice: AttachmentRow = { ...ROW, name: 'ATT-0002', file_name: 'voice-grievance.mp3', mime_type: 'audio/mpeg' };
    renderIntl(<AttachmentsList attachments={[voice]} />);

    fireEvent.click(screen.getByText('voice-grievance.mp3'));

    const player = await screen.findByLabelText('voice-grievance.mp3', { selector: 'audio' });
    expect(player).toHaveAttribute('src', 'blob:voice');
    expect(fetchAttachmentBlobUrl).toHaveBeenCalledWith('ATT-0002', false);
  });

  it('never displays a delete button in the viewer popup for filed grievance attachments', () => {
    renderIntl(<AttachmentsList attachments={[ROW]} />);

    fireEvent.click(screen.getByText('id-card.pdf'));

    expect(screen.queryByTitle('Delete this attachment')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});

