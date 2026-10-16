import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboardCharts, parseDashboardCharts } from './dashboardApi';

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
    expect(data.grvMonthlyTrend).toBeNull();
  });
});

describe('parseDashboardCharts', () => {
  const valid = {
    grvKpis: [{ metric: 'total', value: 5, delta_pct: null }],
    grvStatusDistribution: [{ status: 'Submitted', count: 5 }],
    grvByCategory: [{ category: null, count: 5 }],
    grvMonthlyTrend: [{ month: '2026-10', submitted: 5, resolved: 0 }],
  };

  it('keeps charts that match their schema', () => {
    expect(parseDashboardCharts(valid)).toEqual(valid);
  });

  it('turns a chart that is missing or null into null', () => {
    const parsed = parseDashboardCharts({ grvKpis: valid.grvKpis, grvByCategory: null });

    expect(parsed.grvKpis).toEqual(valid.grvKpis);
    expect(parsed.grvByCategory).toBeNull();
    expect(parsed.grvStatusDistribution).toBeNull();
    expect(parsed.grvMonthlyTrend).toBeNull();
  });

  it('rejects only the chart whose rows are the wrong shape, e.g. a renamed field', () => {
    const parsed = parseDashboardCharts({
      ...valid,
      grvStatusDistribution: [{ status: 'Submitted', total: 5 }],
      grvMonthlyTrend: [{ month: 'October', submitted: 5, resolved: 0 }],
    });

    expect(parsed.grvStatusDistribution).toBeNull();
    expect(parsed.grvMonthlyTrend).toBeNull();
    expect(parsed.grvKpis).toEqual(valid.grvKpis);
    expect(parsed.grvByCategory).toEqual(valid.grvByCategory);
  });

  it('rejects counts that are not whole, non-negative numbers', () => {
    const parsed = parseDashboardCharts({
      ...valid,
      grvKpis: [{ metric: 'total', value: '5' }],
      grvByCategory: [{ category: 'Inputs', count: -1 }],
    });

    expect(parsed.grvKpis).toBeNull();
    expect(parsed.grvByCategory).toBeNull();
  });

  it('throws when the response is not an object of charts at all', () => {
    expect(() => parseDashboardCharts(null)).toThrow();
    expect(() => parseDashboardCharts([])).toThrow();
    expect(() => parseDashboardCharts('ok')).toThrow();
  });
});
