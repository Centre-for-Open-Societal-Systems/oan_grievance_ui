import { describe, expect, it } from 'vitest';
import type { AnalyticsCharts } from '../types';
import { formatWeekStart, mapAnalyticsCharts } from './mapAnalyticsCharts';

const noCharts: AnalyticsCharts = {
  grvPerformanceKpis: null,
  grvWeeklyTrend: null,
  grvResolutionRateByRegion: null,
  grvCategoryResolution: null,
  grvAvgResolutionByCategory: null,
  grvPerformanceScore: null,
};

describe('mapAnalyticsCharts', () => {
  it('maps a chart that is unavailable to null, never to zeros', () => {
    expect(mapAnalyticsCharts(noCharts)).toEqual({
      kpis: null,
      weeklyTrend: null,
      regions: null,
      categories: null,
      avgResolution: null,
      performanceScore: null,
    });
  });

  it('weights a merged uncategorised average by the cases behind each row', () => {
    const { avgResolution } = mapAnalyticsCharts({
      ...noCharts,
      grvAvgResolutionByCategory: [
        { category: 'Schemes', resolved: 40, avg_resolution_days: 16.8 },
        { category: null, resolved: 1, avg_resolution_days: 10 },
        { category: ' ', resolved: 3, avg_resolution_days: 2 },
      ],
    });

    expect(avgResolution).toEqual([
      { category: 'Schemes', resolved: 40, days: 16.8 },
      { category: null, resolved: 4, days: 4 },
    ]);
  });

  it('always yields the six radar axes in order, with a gap — not a zero — where nothing is measured', () => {
    const { performanceScore } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceScore: [
        { axis: 'coverage', score: 100, basis: 4 },
        { axis: 'timeliness', score: 0, basis: 2 },
        { axis: 'transparency', score: null, basis: 0 },
      ],
    });

    expect(performanceScore?.map((row) => row.axis)).toEqual([
      'timeliness',
      'resolution_rate',
      'satisfaction',
      'transparency',
      'follow_up',
      'coverage',
    ]);
    expect(performanceScore?.find((row) => row.axis === 'timeliness')).toMatchObject({ score: 0, basis: 2 });
    expect(performanceScore?.find((row) => row.axis === 'transparency')?.score).toBeNull();
    expect(performanceScore?.find((row) => row.axis === 'follow_up')).toMatchObject({ score: null, basis: 0 });
  });

  it('always yields the four cards in the page order, whatever order the service sent them in', () => {
    const { kpis } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceKpis: [
        { metric: 'satisfaction', value: 50, unit: 'percent', basis: 2 },
        { metric: 'escalation_rate', value: 12.5, unit: 'percent', delta: 1.1 },
        { metric: 'avg_resolution_time', value: 12.4, unit: 'days', delta: -2.1 },
        { metric: 'resolution_rate', value: 37.5, unit: 'percent', delta: 4.2 },
      ],
    });

    expect(kpis?.map((kpi) => kpi.metric)).toEqual([
      'avg_resolution_time',
      'resolution_rate',
      'escalation_rate',
      'satisfaction',
    ]);
    expect(kpis?.find((kpi) => kpi.metric === 'satisfaction')?.basis).toBe(2);
  });

  it('judges a change by the metric: a fall in resolution time is good, a rise in escalations is bad', () => {
    const { kpis } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceKpis: [
        { metric: 'avg_resolution_time', value: 12.4, unit: 'days', delta: -2.1 },
        { metric: 'resolution_rate', value: 37.5, unit: 'percent', delta: 4.2 },
        { metric: 'escalation_rate', value: 12.5, unit: 'percent', delta: 1.1 },
        { metric: 'satisfaction', value: 50, unit: 'percent', basis: 2 },
      ],
    });
    const tones = Object.fromEntries((kpis ?? []).map((kpi) => [kpi.metric, kpi.tone]));

    expect(tones).toEqual({
      avg_resolution_time: 'good',
      resolution_rate: 'good',
      escalation_rate: 'bad',
      satisfaction: 'neutral',
    });
  });

  it('reads no change as neutral, and the opposite moves as the opposite tone', () => {
    const { kpis } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceKpis: [
        { metric: 'avg_resolution_time', value: 9, unit: 'days', delta: 3 },
        { metric: 'resolution_rate', value: 30, unit: 'percent', delta: -1 },
        { metric: 'escalation_rate', value: 10, unit: 'percent', delta: 0 },
        { metric: 'satisfaction', value: 50, unit: 'percent' },
      ],
    });

    expect(kpis?.map((kpi) => kpi.tone)).toEqual(['bad', 'bad', 'neutral', 'neutral']);
  });

  it('shows a change that rounds to nothing as no change, not as a coloured win or loss', () => {
    const { kpis } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceKpis: [
        { metric: 'avg_resolution_time', value: 9, unit: 'days', delta: -0.04 },
        { metric: 'resolution_rate', value: 30, unit: 'percent', delta: 0.04 },
        { metric: 'escalation_rate', value: 10, unit: 'percent', delta: 0.06 },
        { metric: 'satisfaction', value: 50, unit: 'percent' },
      ],
    });

    expect(kpis?.map((kpi) => [kpi.delta, kpi.tone])).toEqual([
      [0, 'neutral'],
      [0, 'neutral'],
      [0.1, 'bad'],
      [null, 'neutral'],
    ]);
    expect(Object.is(kpis?.[0]?.delta, -0)).toBe(false);
  });

  it('keeps the unit the service sends, and falls back to the metric’s usual one only when it sends none', () => {
    const { kpis } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceKpis: [
        { metric: 'avg_resolution_time', value: 9, unit: 'days' },
        { metric: 'resolution_rate', value: 30, unit: ' ' },
        { metric: 'satisfaction', value: 4.2, unit: 'rating' },
      ],
    });

    expect(kpis?.map((kpi) => kpi.unit)).toEqual(['days', 'percent', 'percent', 'rating']);
  });

  it('hides the comparison of a card that has no value, and fills in a card the service left out', () => {
    const { kpis } = mapAnalyticsCharts({
      ...noCharts,
      grvPerformanceKpis: [{ metric: 'avg_resolution_time', value: null, unit: 'days', delta: -2 }],
    });

    expect(kpis?.[0]).toMatchObject({ metric: 'avg_resolution_time', value: null, delta: null, tone: 'neutral' });
    expect(kpis?.[3]).toMatchObject({ metric: 'satisfaction', value: null, delta: null, basis: null });
  });

  it('labels weeks by their start date and keeps the order the service sent', () => {
    const { weeklyTrend } = mapAnalyticsCharts({
      ...noCharts,
      grvWeeklyTrend: [
        { week_start: '2026-09-28', received: 68, resolved: 0 },
        { week_start: '2026-10-05', received: 27, resolved: 0 },
      ],
    });

    expect(weeklyTrend).toEqual([
      { week: 'Sep 28', received: 68, resolved: 0 },
      { week: 'Oct 5', received: 27, resolved: 0 },
    ]);
  });

  it('names a region by its code when the service sends no name', () => {
    const { regions } = mapAnalyticsCharts({
      ...noCharts,
      grvResolutionRateByRegion: [
        { region_code: 'ET14', region_name: 'Addis Ababa', resolved: 1, total: 2, rate: 50 },
        { region_code: 'ET99', region_name: null, resolved: 0, total: 1, rate: 0 },
      ],
    });

    expect(regions?.map((region) => region.name)).toEqual(['Addis Ababa', 'ET99']);
  });

  it('adds up look-alike uncategorised rows into one and sorts by volume (6 uncategorised before 5 Inputs)', () => {
    const { categories } = mapAnalyticsCharts({
      ...noCharts,
      grvCategoryResolution: [
        { category: 'Inputs', filed: 5, resolved: 1, resolved_on_time: 1, resolved_breached: 0 },
        { category: null, filed: 2, resolved: 1, resolved_on_time: 0, resolved_breached: 1 },
        { category: '  ', filed: 4, resolved: 0, resolved_on_time: 0, resolved_breached: 0 },
      ],
    });

    expect(categories).toEqual([
      { category: null, filed: 6, resolved: 1, resolvedOnTime: 0, resolvedBreached: 1 },
      { category: 'Inputs', filed: 5, resolved: 1, resolvedOnTime: 1, resolvedBreached: 0 },
    ]);
  });
});

describe('formatWeekStart', () => {
  it('passes anything that is not a YYYY-MM-DD date through unchanged', () => {
    expect(formatWeekStart('last week')).toBe('last week');
    expect(formatWeekStart('2026-13-45')).toBe('2026-13-45');
  });
});
