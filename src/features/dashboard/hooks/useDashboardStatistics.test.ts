/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { useDashboardStatistics } from './useDashboardStatistics';
import type { DashboardCharts } from '../types';

vi.mock('../api/dashboardApi', () => ({
  fetchDashboardCharts: vi.fn(),
}));

import { fetchDashboardCharts } from '../api/dashboardApi';

const mockFetch = vi.mocked(fetchDashboardCharts);

const charts: DashboardCharts = {
  grvKpis: [{ metric: 'escalated', value: 2 }],
  grvStatusDistribution: [{ status: 'Submitted', count: 4 }],
  grvByCategory: [{ category: 'Inputs', count: 4 }],
  grvMonthlyTrend: [{ month: '2026-04', submitted: 4, resolved: 1 }],
};

describe('useDashboardStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and maps the charts', async () => {
    mockFetch.mockResolvedValue(charts);

    const { result } = renderHook(() => useDashboardStatistics());

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));

    if (result.current.status !== 'ready') throw new Error('expected ready');
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.statistics.escalated).toBe(2);
    expect(result.current.statistics.statusDistribution).toEqual([
      { name: 'Submitted', value: 4, color: '#0ea5e9' },
    ]);
    expect(result.current.statistics.monthlyTrend?.[0]?.month).toBe('Apr 2026');
  });

  it('still reports the charts that built when one is unavailable', async () => {
    mockFetch.mockResolvedValue({ ...charts, grvByCategory: null });

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    if (result.current.status !== 'ready') throw new Error('expected ready');
    expect(result.current.statistics.serviceCategories).toBeNull();
    expect(result.current.statistics.escalated).toBe(2);
  });

  it('reports a failure when every chart is unavailable', async () => {
    mockFetch.mockResolvedValue({
      grvKpis: null,
      grvStatusDistribution: null,
      grvByCategory: null,
      grvMonthlyTrend: null,
    });

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current).toMatchObject({ status: 'error', error: 'failed' });
    expect('statistics' in result.current).toBe(false);
  });

  it('tells a 403 apart from other failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('FORBIDDEN'));

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current).toMatchObject({ status: 'error', error: 'forbidden' });
  });

  it('retries after a failure', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError('Boom', null, 500)).mockResolvedValueOnce(charts);

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the statistics on screen while a retry is in flight', async () => {
    let finishRetry: (value: DashboardCharts) => void = () => undefined;
    mockFetch
      .mockResolvedValueOnce({ ...charts, grvByCategory: null })
      .mockReturnValueOnce(new Promise<DashboardCharts>((resolve) => (finishRetry = resolve)));

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.retry());

    expect(result.current).toMatchObject({ status: 'ready', isRefreshing: true });

    await act(async () => finishRetry(charts));

    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', isRefreshing: false }));
    if (result.current.status !== 'ready') throw new Error('expected ready');
    expect(result.current.statistics.serviceCategories).toHaveLength(1);
  });

  it('reloads for a region, keeping the previous statistics on screen meanwhile', async () => {
    mockFetch.mockResolvedValueOnce(charts);
    const { result, rerender } = renderHook(({ region }) => useDashboardStatistics('en', region), {
      initialProps: { region: null as string | null },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockFetch).toHaveBeenLastCalledWith(expect.objectContaining({ region: null }));

    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    rerender({ region: 'ET04' });

    expect(mockFetch).toHaveBeenLastCalledWith(expect.objectContaining({ region: 'ET04' }));
    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', isRefreshing: true }));
  });
});
