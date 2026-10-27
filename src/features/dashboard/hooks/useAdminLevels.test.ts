/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { useAdminLevels } from './useAdminLevels';

vi.mock('../api/dashboardApi', () => ({
  fetchAdminLevelChart: vi.fn(),
}));

import { fetchAdminLevelChart } from '../api/dashboardApi';

const mockFetch = vi.mocked(fetchAdminLevelChart);

const rows = [
  { level: 'federal', code: null, name: 'Ethiopia', count: 5 },
  { level: 'region', code: 'ET04', name: 'Oromia', count: 5, region_code: 'ET04' },
] as Awaited<ReturnType<typeof fetchAdminLevelChart>>;

describe('useAdminLevels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and maps the rows', async () => {
    mockFetch.mockResolvedValue(rows);

    const { result } = renderHook(() => useAdminLevels());
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status !== 'ready') throw new Error('expected ready');
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.statistics.federal).toEqual({ name: 'Ethiopia', value: 5 });
    expect(result.current.statistics.regions[0]?.code).toBe('ET04');
  });

  it('marks a 403 as forbidden', async () => {
    mockFetch.mockRejectedValue(new ApiError('no', undefined, 403));

    const { result } = renderHook(() => useAdminLevels());
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status !== 'error') throw new Error('expected error');
    expect(result.current.forbidden).toBe(true);
  });

  it('reports other failures as retryable, then recovers on retry', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(rows);

    const { result } = renderHook(() => useAdminLevels());
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status !== 'error') throw new Error('expected error');
    expect(result.current.forbidden).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the old numbers while a retry is in flight', async () => {
    mockFetch.mockResolvedValueOnce(rows).mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useAdminLevels());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.retry());
    expect(result.current.status).toBe('ready');
    if (result.current.status !== 'ready') throw new Error('expected ready');
    expect(result.current.isRefreshing).toBe(true);
  });

  it('aborts the request on unmount', async () => {
    let signal: AbortSignal | undefined;
    mockFetch.mockImplementation((opts) => {
      signal = opts?.signal;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useAdminLevels());
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
