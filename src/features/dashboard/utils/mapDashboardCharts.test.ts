import { describe, expect, it } from 'vitest';
import { formatMonthKey, mapDashboardCharts, SERVICE_CATEGORY_LIMIT } from './mapDashboardCharts';
import type { DashboardChartsData } from '../types';

const charts: DashboardChartsData = {
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

    expect(kpis.map((card) => [card.metric, card.title, card.value, card.trend, card.type])).toEqual([
      ['total', 'Total Grievances', 128, 12.5, 'percentage'],
      ['awaiting_action', 'Awaiting Action', 40, 5, 'number'],
      ['resolved', 'Resolved', 48, 8, 'number'],
      ['escalated', 'Escalated', 1, null, 'alert'],
    ]);
    expect(escalated).toBe(1);
  });

  it('keeps a null month-over-month change as no trend', () => {
    const { kpis } = mapDashboardCharts({ grvKpis: [{ metric: 'total', value: 3, delta_pct: null }] });

    expect(kpis[0]).toMatchObject({ metric: 'total', value: 3, trend: null });
  });

  it('colours statuses by name and falls back to grey for a new one', () => {
    const { statusDistribution } = mapDashboardCharts(charts);

    expect(statusDistribution).toEqual([
      { name: 'Submitted', value: 64, color: '#4f46e5' },
      { name: 'Rejected', value: 2, color: '#ef4444' },
      { name: 'Something New', value: 1, color: '#9ca3af' },
    ]);
  });

  it('ranks categories by count, drops empty ones and scales the bars to the busiest', () => {
    const { serviceCategories } = mapDashboardCharts(charts);

    expect(serviceCategories.map((c) => [c.name, c.value, c.max])).toEqual([
      ['Inputs', 34, 34],
      ['Payments', 31, 34],
      ['Uncategorised', 3, 34],
    ]);
  });

  it('lists only the busiest categories', () => {
    const many = Array.from({ length: SERVICE_CATEGORY_LIMIT + 3 }, (_, i) => ({
      category: `C${i}`,
      count: i + 1,
    }));

    const { serviceCategories } = mapDashboardCharts({ grvByCategory: many });

    expect(serviceCategories).toHaveLength(SERVICE_CATEGORY_LIMIT);
    expect(serviceCategories[0]?.name).toBe(`C${SERVICE_CATEGORY_LIMIT + 2}`);
  });

  it('labels the monthly trend by month and year', () => {
    const { monthlyTrend } = mapDashboardCharts(charts);

    expect(monthlyTrend).toEqual([
      { month: 'Mar 2026', submitted: 85, resolved: 70 },
      { month: 'Apr 2026', submitted: 130, resolved: 115 },
    ]);
  });

  it('maps a chart that failed to build (null) or is absent to an empty one', () => {
    const stats = mapDashboardCharts({ grvKpis: null, grvStatusDistribution: null });

    expect(stats.statusDistribution).toEqual([]);
    expect(stats.serviceCategories).toEqual([]);
    expect(stats.monthlyTrend).toEqual([]);
    expect(stats.escalated).toBe(0);
    expect(stats.kpis.map((card) => card.value)).toEqual([0, 0, 0, 0]);
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
