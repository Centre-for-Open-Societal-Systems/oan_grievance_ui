/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGrievanceMetrics } from './useGrievanceMetrics';
import type { GrievanceSummaryData } from '../types';

vi.mock('../api/grievanceApi', () => ({
  fetchGrievanceSummary: vi.fn(),
  fetchGrievances: vi.fn(),
}));

import { fetchGrievances, fetchGrievanceSummary } from '../api/grievanceApi';

const mockFetchSummary = vi.mocked(fetchGrievanceSummary);
const mockFetchGrievances = vi.mocked(fetchGrievances);

const listWithTotal = (total: number) =>
  ({ items: [], pagination: { total_count: total } }) as unknown as Awaited<ReturnType<typeof fetchGrievances>>;

const summaryPayload: GrievanceSummaryData = {
  cards: [
    { status: 'Resolved', label: 'Resolved', order: 5, is_open: 1, is_terminal: 0, count: 8 },
    { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 42 },
    { status: 'In Progress', label: 'In Progress', order: 2, is_open: 1, is_terminal: 0, count: 20 },
  ],
};

describe('useGrievanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads KPI cards sorted by order and derives totalCount from All', async () => {
    mockFetchSummary.mockResolvedValue(summaryPayload);

    const { result } = renderHook(() => useGrievanceMetrics());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.totalCount).toBe(42);
    expect(result.current.cards.map((card) => card.status)).toEqual([
      'All',
      'In Progress',
      'Resolved',
    ]);
    expect(mockFetchSummary).toHaveBeenCalledTimes(1);
  });

  it('folds More Info Needed into the In Progress card, reading its count from the list', async () => {
    mockFetchSummary.mockResolvedValue(summaryPayload);
    mockFetchGrievances.mockResolvedValue(listWithTotal(3));

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.cards.find((c) => c.status === 'In Progress')?.count).toBe(23);
    });
    const card = result.current.cards.find((c) => c.status === 'In Progress');
    expect(card?.breakdown).toEqual([
      { label: 'In Progress', count: 20 },
      { label: 'More Info Needed', count: 3 },
    ]);
    expect(mockFetchGrievances).toHaveBeenCalledWith(
      { status: ['More Info Needed'], page_size: 1 },
      expect.anything()
    );
  });

  it('shows the cards once, with the final In Progress total, rather than changing it a moment later', async () => {
    mockFetchSummary.mockResolvedValue(summaryPayload);
    mockFetchGrievances.mockResolvedValue(listWithTotal(3));
    const totals: Array<number | undefined> = [];

    const { result } = renderHook(() => {
      const metrics = useGrievanceMetrics();
      if (!metrics.isLoading) totals.push(metrics.cards.find((c) => c.status === 'In Progress')?.count);
      return metrics;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(new Set(totals)).toEqual(new Set([23]));
  });

  it('keeps the summary and shows a dash for More Info when its count cannot be read', async () => {
    mockFetchSummary.mockResolvedValue(summaryPayload);
    mockFetchGrievances.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    const card = result.current.cards.find((c) => c.status === 'In Progress');
    expect(card?.count).toBe(20);
    expect(card?.breakdown?.[1]).toEqual({ label: 'More Info Needed', count: null });
  });

  it('uses the summary\'s own More Info card in preference to the list count, and does not list it twice', async () => {
    mockFetchGrievances.mockResolvedValue(listWithTotal(99));
    mockFetchSummary.mockResolvedValue({
      cards: [
        ...summaryPayload.cards,
        { status: 'Require More Info', label: 'Require More Info', order: 3, is_open: 1, is_terminal: 0, count: 4 },
      ],
    });

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cards.map((c) => c.status)).not.toContain('Require More Info');
    expect(result.current.cards.find((c) => c.status === 'In Progress')?.count).toBe(24);
  });

  it('surfaces an error and clears cards when the summary request fails', async () => {
    mockFetchSummary.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cards).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.error).toBe('Network down');
  });

  it('refetches when refetch is called', async () => {
    mockFetchSummary
      .mockResolvedValueOnce(summaryPayload)
      .mockResolvedValueOnce({
        cards: [
          { status: 'All', label: 'All', order: 1, is_open: 1, is_terminal: 0, count: 50 },
        ],
      });

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(42);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.totalCount).toBe(50);
    });

    expect(mockFetchSummary).toHaveBeenCalledTimes(2);
  });

  it('treats a missing cards array as an empty list', async () => {
    mockFetchSummary.mockResolvedValue({} as GrievanceSummaryData);

    const { result } = renderHook(() => useGrievanceMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cards).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.error).toBeNull();
  });
});
