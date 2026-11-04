import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { POST } from './route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/client-logs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

describe('POST /api/client-logs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a valid report through the server logger as a client event', async () => {
    const spy = vi.spyOn(logger, 'event').mockImplementation(() => undefined);
    const res = await post({ event: 'api.request_failed', requestId: 'abcd1234-ef56', status: 502, path: '/api/v1/x' });
    expect(res.status).toBe(204);
    expect(spy).toHaveBeenCalledWith('error', expect.objectContaining({ source: 'client', status: 502 }));
  });

  it('rejects an unknown event name, bad JSON and an oversized body', async () => {
    const spy = vi.spyOn(logger, 'event').mockImplementation(() => undefined);
    expect((await post({ event: 'anything.else' })).status).toBe(400);
    expect((await post('not json')).status).toBe(400);
    expect((await post({ event: 'render.error', message: 'x'.repeat(5000) })).status).toBe(413);
    expect(spy).not.toHaveBeenCalled();
  });
});
