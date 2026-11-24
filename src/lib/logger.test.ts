import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the stack and status of an error in the log, with secrets scrubbed', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.error('Call failed for a@b.com', Object.assign(new Error('boom'), { status: 502 }));
    const [message, detail] = spy.mock.calls[0] as [string, Record<string, unknown>];
    expect(message).toBe('Call failed for [redacted]');
    expect(detail).toMatchObject({ name: 'Error', message: 'boom', status: 502 });
    expect(typeof detail.stack).toBe('string');
  });

  it('writes an event as one JSON line, redacted, with a numeric request id intact', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.event('error', { event: 'x.failed', requestId: '1234567890', token: 'secret' });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toMatchObject({ level: 'error', event: 'x.failed', requestId: '1234567890', token: '[redacted]' });
  });
});
