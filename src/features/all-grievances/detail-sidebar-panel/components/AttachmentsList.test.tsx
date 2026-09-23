// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentRow } from '@/lib/attachments';

const getAttachments = vi.fn<(grievance: string) => Promise<AttachmentRow[]>>();
const deleteAttachment = vi.fn<(attachment: string) => Promise<void>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  getAttachments: (...args: [string]) => getAttachments(...args),
  deleteAttachment: (...args: [string]) => deleteAttachment(...args),
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
  servable: true,
};

describe('AttachmentsList', () => {
  beforeEach(() => {
    getAttachments.mockReset();
    deleteAttachment.mockReset();
  });

  it('loads and shows the case attachments, with file size and scan status', async () => {
    getAttachments.mockResolvedValue([ROW]);
    render(<AttachmentsList grievance="GRV-0001" canManageCase={false} />);

    expect(screen.getByText('Loading attachments…')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('id-card.pdf')).toBeInTheDocument());
    expect(screen.getByText('239.3 KB')).toBeInTheDocument();
    expect(screen.getByText('Clean')).toBeInTheDocument();
    expect(getAttachments).toHaveBeenCalledWith('GRV-0001');
  });

  it('shows an empty state when the case has no attachments', async () => {
    getAttachments.mockResolvedValue([]);
    render(<AttachmentsList grievance="GRV-0001" canManageCase={false} />);

    await waitFor(() => expect(screen.getByText('No attachments on this case.')).toBeInTheDocument());
  });

  it('shows an error state when the list fails to load', async () => {
    getAttachments.mockRejectedValue(new Error('network down'));
    render(<AttachmentsList grievance="GRV-0001" canManageCase={false} />);

    await waitFor(() => expect(screen.getByText('Could not load attachments for this case.')).toBeInTheDocument());
  });

  it('opens the document viewer with the real file on click, showing why preview/download are unavailable', async () => {
    getAttachments.mockResolvedValue([ROW]);
    render(<AttachmentsList grievance="GRV-0001" canManageCase={false} />);

    await waitFor(() => screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByText('id-card.pdf'));

    expect(screen.getByRole('heading', { name: 'id-card.pdf' })).toBeInTheDocument();
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
  });

  it('hides Delete for a viewer without case-management rights', async () => {
    getAttachments.mockResolvedValue([ROW]);
    render(<AttachmentsList grievance="GRV-0001" canManageCase={false} />);

    await waitFor(() => screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByText('id-card.pdf'));

    expect(screen.queryByTitle('Delete this attachment')).not.toBeInTheDocument();
  });

  it('deletes the attachment (with confirmation) and drops it from the list', async () => {
    getAttachments.mockResolvedValue([ROW]);
    deleteAttachment.mockResolvedValue(undefined);
    render(<AttachmentsList grievance="GRV-0001" canManageCase={true} />);

    await waitFor(() => screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByText('id-card.pdf'));

    fireEvent.click(screen.getByTitle('Delete this attachment'));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    await waitFor(() => expect(deleteAttachment).toHaveBeenCalledWith('ATT-0001'));
    await waitFor(() => expect(screen.queryByText('id-card.pdf')).not.toBeInTheDocument());
  });

  it('shows the backend error and leaves the row in place when delete fails', async () => {
    getAttachments.mockResolvedValue([ROW]);
    deleteAttachment.mockRejectedValue(new Error('Evidence cannot be removed once the grievance is Resolved.'));
    render(<AttachmentsList grievance="GRV-0001" canManageCase={true} />);

    await waitFor(() => screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByText('id-card.pdf'));
    fireEvent.click(screen.getByTitle('Delete this attachment'));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Evidence cannot be removed once the grievance is Resolved.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'id-card.pdf' })).toBeInTheDocument();
  });
});
