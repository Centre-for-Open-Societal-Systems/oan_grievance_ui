// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentRow } from '@/lib/attachments';

const getAttachments = vi.fn<(grievance: string) => Promise<AttachmentRow[]>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  getAttachments: (...args: [string]) => getAttachments(...args),
}));

import { AttachmentsList } from './AttachmentsList';

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
  beforeEach(() => {
    getAttachments.mockReset();
  });

  it('loads and shows the case attachments, with file size and scan status', async () => {
    getAttachments.mockResolvedValue([ROW]);
    render(<AttachmentsList grievance="GRV-0001" />);

    expect(screen.getByText('Loading attachments…')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('id-card.pdf')).toBeInTheDocument());
    expect(screen.getByText('239.3 KB')).toBeInTheDocument();
    expect(screen.getByText('Clean')).toBeInTheDocument();
    expect(getAttachments).toHaveBeenCalledWith('GRV-0001');
  });

  it('shows a distinct "Scan failed" badge for a Failed scan, not the Scanning… state', async () => {
    getAttachments.mockResolvedValue([{ ...ROW, scan_status: 'Failed' }]);
    render(<AttachmentsList grievance="GRV-0001" />);

    await waitFor(() => expect(screen.getByText('Scan failed')).toBeInTheDocument());
    expect(screen.queryByText('Scanning…')).not.toBeInTheDocument();
  });

  it('shows an empty state when the case has no attachments', async () => {
    getAttachments.mockResolvedValue([]);
    render(<AttachmentsList grievance="GRV-0001" />);

    await waitFor(() => expect(screen.getByText('No attachments on this case.')).toBeInTheDocument());
  });

  it('shows an error state when the list fails to load', async () => {
    getAttachments.mockRejectedValue(new Error('network down'));
    render(<AttachmentsList grievance="GRV-0001" />);

    await waitFor(() => expect(screen.getByText('Could not load attachments for this case.')).toBeInTheDocument());
  });

  it('opens the document viewer with the real file on click, showing why preview/download are unavailable', async () => {
    getAttachments.mockResolvedValue([ROW]);
    render(<AttachmentsList grievance="GRV-0001" />);

    await waitFor(() => screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByText('id-card.pdf'));

    expect(screen.getByRole('heading', { name: 'id-card.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
    expect(screen.queryByTitle('Delete this attachment')).not.toBeInTheDocument();
  });

  it('never displays a delete button in the viewer popup for filed grievance attachments', async () => {
    getAttachments.mockResolvedValue([ROW]);
    render(<AttachmentsList grievance="GRV-0001" />);

    await waitFor(() => screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByText('id-card.pdf'));

    expect(screen.queryByTitle('Delete this attachment')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
