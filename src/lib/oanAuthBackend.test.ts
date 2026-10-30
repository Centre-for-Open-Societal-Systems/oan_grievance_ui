import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendAuthError, callBackendAuth, type TokenPair } from './oanAuthBackend';

describe('callBackendAuth', () => {
  const originalFetch = global.fetch;

  const originalEnvUrl = process.env.AUTH_API_BASE_URL;

  beforeEach(() => {
    process.env.AUTH_API_BASE_URL = 'http://auth.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.AUTH_API_BASE_URL = originalEnvUrl;
    vi.restoreAllMocks();
  });

  function mockResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status,
      headers: new Headers(),
      json: async () => body,
    } as Response);
  }

  it('unwraps data from a standard REST envelope on success', async () => {
    const expectedTokenPair: TokenPair = {
      access_token: 'at-123',
      refresh_token: 'rt-456',
      user: 'test@example.com',
      roles: ['Officer'],
    };

    mockResponse(200, {
      status: 'success',
      data: expectedTokenPair,
      message: 'Logged in successfully',
    });

    const result = await callBackendAuth<TokenPair>('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '127.0.0.1');
    expect(result).toEqual(expectedTokenPair);
  });

  it('returns flat response data when data key is not present', async () => {
    const flatData = {
      access_token: 'at-123',
      refresh_token: 'rt-456',
      user: 'test@example.com',
      roles: ['Officer'],
    };

    mockResponse(200, flatData);

    const result = await callBackendAuth<TokenPair>('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '127.0.0.1');
    expect(result).toEqual(flatData);
  });

  it('throws BackendAuthError with message and code on non-ok HTTP response', async () => {
    mockResponse(403, {
      message: 'Temporary password must be changed before login',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });

    await expect(
      callBackendAuth('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '10.0.0.1')
    ).rejects.toThrow(BackendAuthError);

    try {
      await callBackendAuth('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '10.0.0.1');
    } catch (err) {
      const error = err as BackendAuthError;
      expect(error.message).toBe('Temporary password must be changed before login');
      expect(error.status).toBe(403);
      expect(error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    }
  });

  it('throws BackendAuthError when response status is error even with HTTP 200', async () => {
    mockResponse(200, {
      status: 'error',
      message: 'Account disabled',
      code: 'ACCOUNT_DISABLED',
    });

    await expect(
      callBackendAuth('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '10.0.0.1')
    ).rejects.toThrow('Account disabled');
  });

  it('falls back to generic HTTP status message when response body has no message', async () => {
    mockResponse(500, {});

    try {
      await callBackendAuth('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '10.0.0.1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      const error = err as BackendAuthError;
      expect(error.message).toBe('Request failed with status 500');
      expect(error.status).toBe(500);
    }
  });

  it('handles non-JSON error responses gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers(),
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as unknown as Response);

    await expect(
      callBackendAuth('/api/v1/auth/login', { usr: 'test', pwd: 'pass' }, '10.0.0.1')
    ).rejects.toThrow('Request failed with status 502');
  });

  it('sends proper headers including X-Forwarded-For and Content-Type', async () => {
    mockResponse(200, { success: true });

    await callBackendAuth('/api/v1/auth/logout', { refresh_token: 'rt-123' }, '192.168.1.50');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Forwarded-For': '192.168.1.50',
        },
        body: JSON.stringify({ refresh_token: 'rt-123' }),
      })
    );
  });
});
