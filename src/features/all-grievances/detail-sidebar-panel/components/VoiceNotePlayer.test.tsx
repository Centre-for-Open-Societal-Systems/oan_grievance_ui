// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';
import type { GrievanceTimelineAttachment } from '../../types';

const fetchAttachmentBlobUrl = vi.fn<(attachment: string, download?: boolean) => Promise<string>>();
vi.mock('@/lib/attachments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/attachments')>()),
  fetchAttachmentBlobUrl: (...args: [string, boolean?]) => fetchAttachmentBlobUrl(...args),
}));
import { audioAttachments, VoiceNotePlayer } from './VoiceNotePlayer';

function renderIntl(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={en}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const VOICE: GrievanceTimelineAttachment = {
  name: 'ATT-0009',
  file_name: 'voice-grievance-1.mp3',
  mime_type: 'audio/mpeg',
  scan_status: 'Clean',
};

describe('audioAttachments', () => {
  it('keeps only the audio files', () => {
    const pdf = { name: 'ATT-0001', file_name: 'id.pdf', mime_type: 'application/pdf' };
    expect(audioAttachments([pdf, VOICE])).toEqual([VOICE]);
    expect(audioAttachments(null)).toEqual([]);
  });
});

describe('VoiceNotePlayer', () => {
  it('loads nothing until the officer asks, then shows a player they press play on', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:voice');
    renderIntl(<VoiceNotePlayer attachment={VOICE} />);

    expect(fetchAttachmentBlobUrl).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Voice recording', { selector: 'audio' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));
    const player = await screen.findByLabelText('Voice recording', { selector: 'audio' });
    expect(player).toHaveAttribute('src', 'blob:voice');
    expect(player).not.toHaveAttribute('autoplay');
    expect(fetchAttachmentBlobUrl).toHaveBeenCalledWith('ATT-0009', false);
  });

  it('moves focus to the player once it loads, so a keyboard user does not lose their place', async () => {
    fetchAttachmentBlobUrl.mockResolvedValue('blob:voice');
    renderIntl(<VoiceNotePlayer attachment={VOICE} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));
    const player = await screen.findByLabelText('Voice recording', { selector: 'audio' });

    await waitFor(() => expect(player).toHaveFocus());
  });

  it('says so, and does not fetch, while the recording is still being scanned', () => {
    renderIntl(<VoiceNotePlayer attachment={{ ...VOICE, scan_status: 'Pending' }} />);

    expect(screen.getByText('Not available until the scan completes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play recording' })).not.toBeInTheDocument();
    expect(fetchAttachmentBlobUrl).not.toHaveBeenCalled();
  });

  it('says so when the recording cannot be loaded', async () => {
    fetchAttachmentBlobUrl.mockRejectedValue(new Error('boom'));
    renderIntl(<VoiceNotePlayer attachment={VOICE} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));

    await waitFor(() => expect(screen.getByText('Could not load this file right now.')).toBeInTheDocument());
  });
});
