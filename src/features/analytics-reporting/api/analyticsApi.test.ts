import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAnalyticsCharts, monthRange, parseAnalyticsCharts } from './analyticsApi';

describe('fetchAnalyticsCharts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('asks the charts endpoint for exactly the analytics charts for one month and unwraps the envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            grvPerformanceKpis: [{ metric: 'resolution_rate', value: 37.5, unit: 'percent', delta: 4.2 }],
            grvWeeklyTrend: null,
          },
          meta: { as_of: {}, errors: { grvWeeklyTrend: 'This chart could not be built' } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await fetchAnalyticsCharts({ month: '2026-04' });

    const [calledUrl, calledInit] = fetchMock.mock.calls[0] ?? [];
    const url = new URL(String(calledUrl));
    expect(url.pathname).toBe('/api/proxy/api/v1/charts');
    expect(url.searchParams.get('charts')).toBe(
      'grvPerformanceKpis,grvWeeklyTrend,grvResolutionRateByRegion,grvCategoryResolution,grvAvgResolutionByCategory,grvPerformanceScore'
    );
    expect(url.searchParams.get('month')).toBe('2026-04');
    expect(url.searchParams.get('from')).toBe('2026-04-01');
    expect(url.searchParams.get('to')).toBe('2026-04-30');
    expect(calledInit).toMatchObject({ method: 'GET' });
    expect(data.grvPerformanceKpis).toEqual([
      { metric: 'resolution_rate', value: 37.5, unit: 'percent', delta: 4.2 },
    ]);
    expect(data.grvWeeklyTrend).toBeNull();
    expect(data.grvCategoryResolution).toBeNull();
  });

  it('asks again for the established charts when the service does not know the newer ones (404)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'error', code: 'NOT_FOUND', details: { unknown_charts: ['grvPerformanceScore'] } }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'success',
            data: { grvWeeklyTrend: [{ week_start: '2026-09-28', received: 1, resolved: 0 }] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await fetchAnalyticsCharts({ month: '2026-04' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retried = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(retried.searchParams.get('charts')).toBe(
      'grvPerformanceKpis,grvWeeklyTrend,grvResolutionRateByRegion,grvCategoryResolution'
    );
    expect(data.grvWeeklyTrend).toHaveLength(1);
    expect(data.grvAvgResolutionByCategory).toBeNull();
    expect(data.grvPerformanceScore).toBeNull();
  });

  it('does not retry a failure that is not a 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchAnalyticsCharts({ month: '2026-04' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves the month out when none is given, so the service uses the current one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchAnalyticsCharts();

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.has('month')).toBe(false);
    expect(url.searchParams.has('from')).toBe(false);
    expect(url.searchParams.has('to')).toBe(false);
  });
});

describe('monthRange', () => {
  it('spans the whole month, leap February included', () => {
    expect(monthRange('2026-10', new Date(2027, 0, 5))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2028-02', new Date(2029, 0, 1))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('stops at today for the current month, which the service would refuse past today', () => {
    expect(monthRange('2026-10', new Date(2026, 9, 22))).toEqual({ from: '2026-10-01', to: '2026-10-22' });
  });

  it('is null for anything that is not a month', () => {
    expect(monthRange('October')).toBeNull();
    expect(monthRange('2026-13')).toBeNull();
  });
});

describe('parseAnalyticsCharts', () => {
  const valid = {
    grvPerformanceKpis: [
      { metric: 'avg_resolution_time', value: 12.4, unit: 'days', delta: -2.1 },
      { metric: 'satisfaction', value: 50, unit: 'percent', basis: 2 },
    ],
    grvWeeklyTrend: [{ week_start: '2026-09-28', received: 68, resolved: 0 }],
    grvResolutionRateByRegion: [{ region_code: 'ET14', region_name: 'Addis Ababa', resolved: 1, total: 2, rate: 50 }],
    grvCategoryResolution: [
      { category: 'Inputs', filed: 121, resolved: 0, resolved_on_time: 0, resolved_breached: 0 },
    ],
    grvAvgResolutionByCategory: [{ category: 'Schemes', resolved: 40, avg_resolution_days: 16.8 }],
    grvPerformanceScore: [
      { axis: 'timeliness', score: 50, basis: 2 },
      { axis: 'coverage', score: null, basis: 0 },
    ],
  };

  it('keeps charts that match their schema', () => {
    expect(parseAnalyticsCharts(valid)).toEqual(valid);
  });

  it('accepts a KPI with no value or delta, which the service sends for an empty month', () => {
    const parsed = parseAnalyticsCharts({
      ...valid,
      grvPerformanceKpis: [{ metric: 'avg_resolution_time', value: null, unit: 'days', delta: null }],
    });

    expect(parsed.grvPerformanceKpis).toHaveLength(1);
  });

  it('turns a chart that is missing or null into null', () => {
    const parsed = parseAnalyticsCharts({ grvPerformanceKpis: valid.grvPerformanceKpis, grvWeeklyTrend: null });

    expect(parsed.grvPerformanceKpis).toEqual(valid.grvPerformanceKpis);
    expect(parsed.grvWeeklyTrend).toBeNull();
    expect(parsed.grvResolutionRateByRegion).toBeNull();
    expect(parsed.grvCategoryResolution).toBeNull();
    expect(parsed.grvAvgResolutionByCategory).toBeNull();
    expect(parsed.grvPerformanceScore).toBeNull();
  });

  it('rejects only the chart whose rows are the wrong shape, e.g. a renamed field', () => {
    const parsed = parseAnalyticsCharts({
      ...valid,
      grvResolutionRateByRegion: [{ region_code: 'ET14', resolved: 1, total: 2, percentage: 50 }],
      grvWeeklyTrend: [{ week_start: 'last week', received: 68, resolved: 0 }],
      grvPerformanceScore: [{ axis: 'timeliness', score: 150, basis: 2 }],
    });

    expect(parsed.grvPerformanceScore).toBeNull();

    expect(parsed.grvResolutionRateByRegion).toBeNull();
    expect(parsed.grvWeeklyTrend).toBeNull();
    expect(parsed.grvPerformanceKpis).toEqual(valid.grvPerformanceKpis);
    expect(parsed.grvCategoryResolution).toEqual(valid.grvCategoryResolution);
  });

  it('rejects counts that are not whole, non-negative numbers and rates outside 0-100', () => {
    const parsed = parseAnalyticsCharts({
      ...valid,
      grvCategoryResolution: [
        { category: 'Inputs', filed: -1, resolved: 0, resolved_on_time: 0, resolved_breached: 0 },
      ],
      grvResolutionRateByRegion: [{ region_code: 'ET14', resolved: 1, total: 2, rate: 5000 }],
    });

    expect(parsed.grvCategoryResolution).toBeNull();
    expect(parsed.grvResolutionRateByRegion).toBeNull();
  });

  it('throws when the response is not an object of charts at all', () => {
    expect(() => parseAnalyticsCharts(null)).toThrow();
    expect(() => parseAnalyticsCharts([])).toThrow();
    expect(() => parseAnalyticsCharts('ok')).toThrow();
  });
});
