import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentMonth } from '../utils/months';
import {
  fetchAnalyticsCharts,
  fetchFilterOptions,
  monthRange,
  parseAnalyticsCharts,
  parseAsOf,
} from './analyticsApi';

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
          meta: {
            as_of: {
              grvPerformanceKpis: '2026-10-22T10:15:00+03:00',
              grvWeeklyTrend: '2026-10-22T09:45:00+03:00',
            },
            errors: { grvWeeklyTrend: 'This chart could not be built' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { charts: data, asOf } = await fetchAnalyticsCharts({ month: '2026-04' });

    expect(asOf).toBe('2026-10-22T09:45:00+03:00');

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

    const { charts: data } = await fetchAnalyticsCharts({ month: '2026-04' });

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

describe('filters', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const okResponse = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  it('sends only the filters that are set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'success', data: {} }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchAnalyticsCharts({
      month: '2026-04',
      filters: { region: 'ET14', serviceCategory: 'Inputs', assignedDept: '' },
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('region')).toBe('ET14');
    expect(url.searchParams.get('service_category')).toBe('Inputs');
    expect(url.searchParams.has('assigned_dept')).toBe(false);
  });

  it('keeps the filters when it asks again for the established charts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(okResponse({ status: 'success', data: {} }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchAnalyticsCharts({ filters: { region: 'ET14', serviceCategory: '', assignedDept: '' } });

    const retried = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(retried.searchParams.get('region')).toBe('ET14');
  });

  it('reads each option list with its own request, naming a region by its name or else its code', async () => {
    const lists: Record<string, unknown> = {
      grvFilterRegions: [
        { region_code: 'ET14', region_name: 'Addis Ababa', grievances: 5 },
        { region_code: 'ET99', region_name: null, grievances: 1 },
      ],
      grvFilterCategories: [{ category: 'Inputs', grievances: 3 }],
    };
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const id = new URL(String(input)).searchParams.get('charts') ?? '';
      return okResponse({ status: 'success', data: { [id]: lists[id] } });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const options = await fetchFilterOptions({ includeDepartments: false });

    const asked = fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('charts'));
    expect(asked.sort()).toEqual(['grvFilterCategories', 'grvFilterRegions']);
    expect(options.regions).toEqual([
      { value: 'ET14', label: 'Addis Ababa' },
      { value: 'ET99', label: 'ET99' },
    ]);
    expect(options.categories).toEqual([{ value: 'Inputs', label: 'Inputs' }]);
    expect(options.departments).toBeNull();
  });

  it('keeps the other lists when one is refused (e.g. an unknown chart id answers 404)', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const id = new URL(String(input)).searchParams.get('charts');
      if (id === 'grvFilterDepartments') {
        return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      const rows = id === 'grvFilterRegions' ? [{ region_code: 'ET14', grievances: 5 }] : [{ category: 'Inputs', grievances: 3 }];
      return okResponse({ status: 'success', data: { [id as string]: rows } });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const options = await fetchFilterOptions({ includeDepartments: true });

    expect(options.departments).toBeNull();
    expect(options.regions).toEqual([{ value: 'ET14', label: 'ET14' }]);
    expect(options.categories).toEqual([{ value: 'Inputs', label: 'Inputs' }]);
  });

  it('asks for the department list only for an admin', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const id = new URL(String(input)).searchParams.get('charts') as string;
      const rows = id === 'grvFilterDepartments' ? [{ department: 'Extension', grievances: 3 }] : [];
      return okResponse({ status: 'success', data: { [id]: rows } });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const options = await fetchFilterOptions({ includeDepartments: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(options.departments).toEqual([{ value: 'Extension', label: 'Extension' }]);

    fetchMock.mockClear();
    await fetchFilterOptions({ includeDepartments: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('leaves month and to to the service for the current month, so its own clock decides', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ status: 'success', data: {} }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchAnalyticsCharts({ month: currentMonth() });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.has('month')).toBe(false);
    expect(url.searchParams.has('to')).toBe(false);
    expect(url.searchParams.get('from')).toBe(`${currentMonth()}-01`);
  });
});
describe('parseAsOf', () => {
  it('is the oldest chart refresh, since the page is only as fresh as its stalest chart', () => {
    expect(
      parseAsOf({
        meta: { as_of: { a: '2026-10-22T10:15:00+03:00', b: '2026-10-22T09:45:00+03:00', c: null, d: 'soon' } },
      })
    ).toBe('2026-10-22T09:45:00+03:00');
  });

  it('is null when the service sent no refresh time', () => {
    expect(parseAsOf({})).toBeNull();
    expect(parseAsOf({ meta: { as_of: {} } })).toBeNull();
    expect(parseAsOf({ meta: { as_of: [] } })).toBeNull();
    expect(parseAsOf(null)).toBeNull();
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
