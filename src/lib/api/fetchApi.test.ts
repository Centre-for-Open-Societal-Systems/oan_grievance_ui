import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, extractFieldErrors, fetchApi } from './fetchApi';

describe('fetchApi error messages', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function respond(status: number, body: unknown) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response);
  }

  const messageOf = async () => {
    try {
      await fetchApi('api/v1/anything');
    } catch (error) {
      return (error as Error).message;
    }
    return null;
  };

  it('reads per-field details from the top level, where the REST routes put them', async () => {
    respond(400, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { description: 'Description must be at least 20 characters.' },
    });
    expect(await messageOf()).toBe('Description: Description must be at least 20 characters.');
  });

  it('still reads details nested under message, where the RPC envelope puts them', async () => {
    respond(400, { message: { details: { grievance_type: 'Not valid for that category' } } });
    expect(await messageOf()).toBe('Grievance Type: Not valid for that category');
  });

  it('leads with the value alone for a cross-field rule that has no field name', async () => {
    respond(400, { message: 'Validation failed', details: { '': 'Provide either a key or an OTP' } });
    expect(await messageOf()).toBe('Provide either a key or an OTP');
  });

  it('falls back to the response message when the details map is empty', async () => {
    respond(400, { code: 'AUTHENTICATION_ERROR', message: 'Invalid login credentials', details: {} });
    expect(await messageOf()).toBe('Invalid login credentials');
  });

  it('uses the nested message when there are no details, and generic copy when there is nothing at all', async () => {
    respond(404, { message: { message: 'Draft not found' } });
    expect(await messageOf()).toBe('Draft not found');

    respond(404, {});
    expect(await messageOf()).toMatch(/could not find/i);
  });
});

describe('fetchApi utilities', () => {
  describe('ApiError', () => {
    it('constructs an ApiError with message, responseData, and status', () => {
      const err = new ApiError('Not found', { details: 'Missing' }, 404);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiError');
      expect(err.message).toBe('Not found');
      expect(err.responseData).toEqual({ details: 'Missing' });
      expect(err.status).toBe(404);
    });
  });

  describe('extractFieldErrors', () => {
    it('extracts string field errors from responseData message details', () => {
      const err = new ApiError('Validation Error', {
        message: {
          details: {
            title: 'Title is required',
            category: 'Invalid category',
            count: 42,
          },
        },
      });

      const extracted = extractFieldErrors(err);
      expect(extracted).toEqual({
        title: 'Title is required',
        category: 'Invalid category',
      });
    });

    it('also extracts them from the top level, where the REST routes put them', () => {
      const err = new ApiError('Validation failed', { code: 'VALIDATION_ERROR', details: { description: 'Too short' } });
      expect(extractFieldErrors(err)).toEqual({ description: 'Too short' });
    });

    it('returns empty object when no field details present', () => {
      expect(extractFieldErrors(new ApiError('Simple error'))).toEqual({});
      expect(extractFieldErrors(new Error('Standard error'))).toEqual({});
      expect(extractFieldErrors(null)).toEqual({});
    });
  });
});
