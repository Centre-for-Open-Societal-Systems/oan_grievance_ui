/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfficerStatusCounts } from './useOfficerStatusCounts';

const fetchOfficerStatusCounts = vi.hoisted(() => vi.fn());
vi.mock('../api/officerApi', () => ({ fetchOfficerStatusCounts }));

describe('useOfficerStatusCounts', () => {
  it('maps the status-counts response to active/onLeave/inactive', async () => {
    fetchOfficerStatusCounts.mockResolvedValue({ active: 142, on_leave: 6, inactive: 3, total: 151 });

    const { result } = renderHook(() => useOfficerStatusCounts('Officer', 'L1', true));

    await waitFor(() => expect(result.current).toEqual({ active: 142, onLeave: 6, inactive: 3 }));

    expect(fetchOfficerStatusCounts).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Officer', level: 'L1' }),
      expect.anything()
    );
  });

  it('omits level for a Reviewer — the backend refuses one', async () => {
    fetchOfficerStatusCounts.mockResolvedValue({ active: 4, on_leave: 0, inactive: 1, total: 5 });

    renderHook(() => useOfficerStatusCounts('Reviewer', undefined, true));

    await waitFor(() =>
      expect(fetchOfficerStatusCounts).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Reviewer', level: undefined }),
        expect.anything()
      )
    );
  });

  it('skips fetching and returns zeros while a different tab is active', () => {
    fetchOfficerStatusCounts.mockClear();
    const { result } = renderHook(() => useOfficerStatusCounts('Officer', 'L1', false));

    expect(result.current).toEqual({ active: 0, onLeave: 0, inactive: 0 });
    expect(fetchOfficerStatusCounts).not.toHaveBeenCalled();
  });

  it('falls back to zeros if the request fails', async () => {
    fetchOfficerStatusCounts.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useOfficerStatusCounts('Officer', 'L2', true));

    await waitFor(() => expect(result.current).toEqual({ active: 0, onLeave: 0, inactive: 0 }));
  });
});
