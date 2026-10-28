import { describe, expect, it } from 'vitest';
import { MAX_ATTACHMENT_BYTES, screenAttachments, WIZARD_ATTACHMENT_MIME_TYPES } from './attachments';

const file = (name: string, type: string, size = 1024) => new File([new Uint8Array(size)], name, { type });

describe('screenAttachments', () => {
  it('accepts the backend allow-list within the size limit', () => {
    const files = [file('a.pdf', 'application/pdf'), file('b.jpg', 'image/jpeg'), file('c.png', 'image/png')];
    expect(screenAttachments(files).accepted).toEqual(files);
  });

  it('refuses MP3 unless the caller allows it, as the wizard does for voice notes', () => {
    const mp3 = file('note.mp3', 'audio/mpeg');
    expect(screenAttachments([mp3]).wrongType).toEqual([mp3]);
    expect(screenAttachments([mp3], WIZARD_ATTACHMENT_MIME_TYPES).accepted).toEqual([mp3]);
  });

  it('separates a wrong type from an oversized file, by file', () => {
    const exe = file('x.exe', 'application/x-msdownload');
    const big = file('big.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1);
    const ok = file('ok.png', 'image/png');
    expect(screenAttachments([exe, big, ok])).toEqual({ accepted: [ok], wrongType: [exe], tooLarge: [big] });
  });

  it('accepts a file of exactly the size limit', () => {
    const exact = file('exact.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES);
    expect(screenAttachments([exact]).accepted).toEqual([exact]);
  });

  it('reports a wrong-type file as that even when it is also too big', () => {
    const both = file('huge.zip', 'application/zip', MAX_ATTACHMENT_BYTES + 1);
    const result = screenAttachments([both]);
    expect(result.wrongType).toEqual([both]);
    expect(result.tooLarge).toEqual([]);
  });
});
