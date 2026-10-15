import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardCharts } from './dashboardApi';

describe('fetchDashboardCharts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('asks the charts endpoint for exactly the dashboard charts and unwraps the envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          data: { grvKpis: [{ metric: 'total', value: 5 }], grvByCategory: null },
          meta: { as_of: {}, errors: { grvByCategory: 'This chart could not be built' } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await fetchDashboardCharts();

    const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(calledUrl));
    expect(url.pathname).toBe('/api/proxy/api/v1/charts');
    expect(url.searchParams.get('charts')).toBe(
      'grvKpis,grvStatusDistribution,grvByCategory,grvMonthlyTrend'
    );
    expect(calledInit).toMatchObject({ method: 'GET' });
    expect(data.grvKpis).toEqual([{ metric: 'total', value: 5 }]);
    expect(data.grvByCategory).toBeNull();
  });
});
