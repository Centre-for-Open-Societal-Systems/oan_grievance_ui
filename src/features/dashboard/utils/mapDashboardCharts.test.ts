import { describe, expect, it } from 'vitest';
import { formatMonthKey, mapDashboardCharts, SERVICE_CATEGORY_LIMIT } from './mapDashboardCharts';
import type { DashboardCharts } from '../types';

const NO_CHARTS: DashboardCharts = {
  grvKpis: null,
  grvStatusDistribution: null,
  grvByCategory: null,
  grvMonthlyTrend: null,
};

const charts: DashboardCharts = {
  grvKpis: [
    { metric: 'total', value: 128, delta_pct: 12.5 },
    { metric: 'awaiting_action', value: 40, delta: 5 },
    { metric: 'resolved', value: 48, delta: 8 },
    { metric: 'escalated', value: 1 },
  ],
  grvStatusDistribution: [
    { status: 'Submitted', count: 64 },
    { status: 'Rejected', count: 2 },
    { status: 'Something New', count: 1 },
  ],
  grvByCategory: [
    { category: 'Payments', count: 31 },
    { category: 'Inputs', count: 34 },
    { category: null, count: 3 },
    { category: 'Empty', count: 0 },
  ],
  grvMonthlyTrend: [
    { month: '2026-03', submitted: 85, resolved: 70 },
    { month: '2026-04', submitted: 130, resolved: 115 },
  ],
};

describe('mapDashboardCharts', () => {
  it('maps the KPI rows to the four cards in display order', () => {
    const { kpis, escalated } = mapDashboardCharts(charts);

    expect(kpis?.map((card) => [card.metric, card.value, card.trend, card.type])).toEqual([
      ['total', 128, 12.5, 'percentage'],
      ['awaiting_action', 40, 5, 'number'],
      ['resolved', 48, 8, 'number'],
      ['escalated', 1, null, 'alert'],
    ]);
    expect(escalated).toBe(1);
  });

  it('keeps a null month-over-month change as no trend', () => {
    const { kpis } = mapDashboardCharts({ ...NO_CHARTS, grvKpis: [{ metric: 'total', value: 3, delta_pct: null }] });

    expect(kpis?.[0]).toMatchObject({ metric: 'total', value: 3, trend: null });
  });

  it('keeps a decrease in the month-over-month change', () => {
    const { kpis } = mapDashboardCharts({ ...NO_CHARTS, grvKpis: [{ metric: 'total', value: 3, delta_pct: -4.5 }] });

    expect(kpis?.[0]?.trend).toBe(-4.5);
  });

  it('drops a negative weekly count, which is not a thing a count can be', () => {
    const { kpis } = mapDashboardCharts({
      ...NO_CHARTS,
      grvKpis: [
        { metric: 'awaiting_action', value: 4, delta: -3 },
        { metric: 'resolved', value: 2, delta: 0 },
      ],
    });

    expect(kpis?.find((card) => card.metric === 'awaiting_action')?.trend).toBeNull();
    expect(kpis?.find((card) => card.metric === 'resolved')?.trend).toBe(0);
  });

  it('leaves a metric the service did not report as unknown, not zero', () => {
    const { kpis, escalated } = mapDashboardCharts({
      ...NO_CHARTS,
      grvKpis: [{ metric: 'total', value: 9 }],
    });

    expect(kpis?.map((card) => card.value)).toEqual([9, null, null, null]);
    expect(escalated).toBeNull();
  });

  it('colours statuses by label, forgiving case and spacing, with grey for a new one', () => {
    const { statusDistribution } = mapDashboardCharts({
      ...NO_CHARTS,
      grvStatusDistribution: [...(charts.grvStatusDistribution ?? []), { status: 'in_progress', count: 5 }],
    });

    expect(statusDistribution).toEqual([
      { name: 'Submitted', value: 64, color: '#4f46e5' },
      { name: 'Rejected', value: 2, color: '#ef4444' },
      { name: 'Something New', value: 1, color: '#9ca3af' },
      { name: 'in_progress', value: 5, color: '#6366f1' },
    ]);
  });

  it('ranks categories by count, drops empty ones and scales the bars to the busiest', () => {
    const { serviceCategories } = mapDashboardCharts(charts);

    expect(serviceCategories?.map((c) => [c.kind, c.name, c.value, c.max])).toEqual([
      ['category', 'Inputs', 34, 34],
      ['category', 'Payments', 31, 34],
      ['uncategorised', '', 3, 34],
    ]);
  });

  it('adds a missing, null and blank category into one uncategorised row', () => {
    const { serviceCategories } = mapDashboardCharts({
      ...NO_CHARTS,
      grvByCategory: [
        { category: null, count: 2 },
        { category: '', count: 3 },
        { category: '  ', count: 4 },
        { category: 'Inputs', count: 1 },
      ],
    });

    expect(serviceCategories?.map((c) => [c.kind, c.value])).toEqual([
      ['uncategorised', 9],
      ['category', 1],
    ]);
  });

  it('adds up the categories beyond the limit instead of dropping them', () => {
    const many = Array.from({ length: SERVICE_CATEGORY_LIMIT + 3 }, (_, i) => ({
      category: `C${i}`,
      count: 10 * (i + 1),
    }));

    const { serviceCategories } = mapDashboardCharts({ ...NO_CHARTS, grvByCategory: many });

    expect(serviceCategories).toHaveLength(SERVICE_CATEGORY_LIMIT + 1);
    expect(serviceCategories?.[0]?.name).toBe(`C${SERVICE_CATEGORY_LIMIT + 2}`);
    const remainder = serviceCategories?.at(-1);
    expect(remainder).toMatchObject({ kind: 'remainder', categories: 3, value: 10 + 20 + 30 });
    const grandTotal = many.reduce((sum, row) => sum + row.count, 0);
    expect(serviceCategories?.reduce((sum, c) => sum + c.value, 0)).toBe(grandTotal);
  });

  it('labels the monthly trend by month and year', () => {
    const { monthlyTrend } = mapDashboardCharts(charts);

    expect(monthlyTrend).toEqual([
      { month: 'Mar 2026', submitted: 85, resolved: 70 },
      { month: 'Apr 2026', submitted: 130, resolved: 115 },
    ]);
  });

  it('maps a chart that is unavailable to null, never to zeros', () => {
    const stats = mapDashboardCharts(NO_CHARTS);

    expect(stats).toEqual({
      kpis: null,
      monthlyTrend: null,
      statusDistribution: null,
      serviceCategories: null,
      escalated: null,
    });
  });

  it('keeps an available but empty chart as an empty list', () => {
    const stats = mapDashboardCharts({ ...NO_CHARTS, grvByCategory: [], grvMonthlyTrend: [] });

    expect(stats.serviceCategories).toEqual([]);
    expect(stats.monthlyTrend).toEqual([]);
  });
});

describe('formatMonthKey', () => {
  it('passes anything that is not a YYYY-MM key through unchanged', () => {
    expect(formatMonthKey('2026-13')).toBe('2026-13');
    expect(formatMonthKey('March')).toBe('March');
  });

  it('formats the month without shifting it by timezone', () => {
    expect(formatMonthKey('2026-01', 'en')).toBe('Jan 2026');
  });

  it('falls back to the key for a locale Intl rejects', () => {
    expect(formatMonthKey('2026-01', 'not a locale')).toBe('2026-01');
  });
});
