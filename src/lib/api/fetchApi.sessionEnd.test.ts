// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_MESSAGES } from '@/lib/authMessages';
import { fetchApi, onSessionEnded } from './fetchApi';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('fetchApi when the session is over', () => {
  const fetchMock = vi.fn();
  const handler = vi.fn();
  let unregister: () => void;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    unregister = onSessionEnded(handler);
  });

  afterEach(() => {
    unregister();
    fetchMock.mockReset();
    handler.mockReset();
    vi.unstubAllGlobals();
  });

  /** Routes `/api/auth/refresh` to `refresh`, everything else to `data`. */
  function serve(data: () => Response, refresh: () => Response) {
    fetchMock.mockImplementation(async (url: string) => (String(url).includes('/api/auth/refresh') ? refresh() : data()));
  }

  it('reports an expired session once the refresh is refused', async () => {
    serve(() => json(401, { message: AUTH_MESSAGES.sessionExpired }), () => json(401, { message: AUTH_MESSAGES.sessionExpired }));
    await expect(fetchApi('api/v1/anything')).rejects.toThrow();
    expect(handler).toHaveBeenCalledWith('expired');
  });

  it("reports an idle kick from the proxy's own 401, though the refresh after it only sees no session", async () => {
    serve(() => json(401, { message: AUTH_MESSAGES.sessionExpiredIdle }), () => json(401, { message: AUTH_MESSAGES.sessionExpired }));
    await expect(fetchApi('api/v1/anything')).rejects.toThrow();
    expect(handler).toHaveBeenCalledWith('idle');
  });

  it('does not end the session when the refresh merely failed (server error)', async () => {
    serve(() => json(401, {}), () => json(500, {}));
    await expect(fetchApi('api/v1/anything')).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('retries and stays signed in when the refresh succeeds', async () => {
    let calls = 0;
    serve(() => (calls++ === 0 ? json(401, {}) : json(200, { data: { ok: true } })), () => json(200, { success: true }));
    await expect(fetchApi('api/v1/anything')).resolves.toEqual({ ok: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('never reports a 403 — signed in, just not allowed', async () => {
    serve(() => json(403, {}), () => json(200, {}));
    await expect(fetchApi('api/v1/anything')).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
