/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { useDashboardStatistics } from './useDashboardStatistics';
import type { DashboardChartsData } from '../types';

vi.mock('../api/dashboardApi', () => ({
  fetchDashboardCharts: vi.fn(),
}));

import { fetchDashboardCharts } from '../api/dashboardApi';

const mockFetch = vi.mocked(fetchDashboardCharts);

const charts: DashboardChartsData = {
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

    expect(result.current.isLoading).toBe(true);
    expect(result.current.statistics).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.statistics?.escalated).toBe(2);
    expect(result.current.statistics?.statusDistribution).toEqual([
      { name: 'Submitted', value: 4, color: '#4f46e5' },
    ]);
    expect(result.current.statistics?.monthlyTrend[0]?.month).toBe('Apr 2026');
  });

  it('still renders the charts that built when one came back null', async () => {
    mockFetch.mockResolvedValue({ ...charts, grvByCategory: null });

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.statistics?.serviceCategories).toEqual([]);
    expect(result.current.statistics?.escalated).toBe(2);
  });

  it('reports a failure when every chart came back null', async () => {
    mockFetch.mockResolvedValue({ grvKpis: null, grvStatusDistribution: null });

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('failed');
    expect(result.current.statistics).toBeNull();
  });

  it('tells a 403 apart from other failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('FORBIDDEN'));

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('forbidden');
  });

  it('retries after a failure', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError('Boom', null, 500)).mockResolvedValueOnce(charts);

    const { result } = renderHook(() => useDashboardStatistics());
    await waitFor(() => expect(result.current.error).toBe('failed'));

    act(() => result.current.retry());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.statistics).not.toBeNull());
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
