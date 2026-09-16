import { describe, expect, it } from 'vitest';
import { ApiError, extractFieldErrors } from './fetchApi';

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

    it('returns empty object when no field details present', () => {
      expect(extractFieldErrors(new ApiError('Simple error'))).toEqual({});
      expect(extractFieldErrors(new Error('Standard error'))).toEqual({});
      expect(extractFieldErrors(null)).toEqual({});
    });
  });
});
