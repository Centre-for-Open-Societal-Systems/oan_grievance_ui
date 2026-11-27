import { describe, expect, it } from 'vitest';
import { guestTimelineData } from './guestCaseData';

describe('guestTimelineData', () => {
  const data = guestTimelineData({
    ticket_number: '3-001-002A-0',
    status: 'In Progress',
    description: 'The fertiliser never arrived.',
    attachments: [{ name: 'att-1', file_name: 'receipt.jpg', file_size: 2048, scan_status: 'Clean' }],
    timeline: [
      {
        entry_type: 'message',
        body: null,
        author_type: 'submitter',
        created_on: '2026-11-26T10:00:00Z',
        attachments: [{ name: 'att-1', file_name: 'receipt.jpg' }],
      },
    ],
  });

  it('shows the submitter as anonymous and offers no actions', () => {
    expect(data.submitter).toEqual({ is_anonymous: true });
    expect(data.available_actions).toEqual([]);
    expect(data.assignment).toBeUndefined();
  });

  it('marks every entry public and offers no file to open from the timeline', () => {
    expect(data.timeline![0]).toMatchObject({ is_internal: false, body: '', entry_type: 'message', attachments: [] });
    expect(data.attachments).toBeUndefined();
    expect(data.summary?.description).toBe('The fertiliser never arrived.');
  });
});
