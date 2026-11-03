import type {
  AnalyticsCharts,
  AnalyticsReport,
  AvgResolutionStat,
  CategoryResolutionStat,
  DeltaTone,
  PerformanceKpi,
  PerformanceMetric,
  PerformanceScoreAxis,
  RegionResolutionStat,
  WeeklyTrendPoint,
} from '../types';
import {
  PERFORMANCE_SCORE_AXES,
  type AvgResolutionRow,
  type CategoryResolutionRow,
  type PerformanceKpiRow,
  type PerformanceScoreRow,
  type RegionResolutionRow,
  type WeeklyTrendRow,
} from '../schemas';

/** The cards in the order the page shows them. */
const KPI_ORDER: PerformanceMetric[] = ['avg_resolution_time', 'resolution_rate', 'escalation_rate', 'satisfaction'];

/** Which direction of change is good news for each metric. */
const IMPROVES_WHEN: Record<PerformanceMetric, 'down' | 'up' | null> = {
  avg_resolution_time: 'down',
  resolution_rate: 'up',
  escalation_rate: 'down',
  satisfaction: null,
};

/** What each metric is measured in when the service does not say. */
const DEFAULT_UNITS: Record<PerformanceMetric, string> = {
  avg_resolution_time: 'days',
  resolution_rate: 'percent',
  escalation_rate: 'percent',
  satisfaction: 'percent',
};

/**
 * A change to the one decimal the cards show. Rounding comes before the tone is judged:
 * 0.04 reads as "0", which is no change, not a small win or loss to colour.
 */
function roundDelta(delta: number | null): number | null {
  if (delta === null) return null;
  const rounded = Math.round(delta * 10) / 10;
  return rounded === 0 ? 0 : rounded; // folds -0 into 0
}

function toneOf(metric: PerformanceMetric, delta: number | null): DeltaTone {
  const improves = IMPROVES_WHEN[metric];
  if (delta === null || delta === 0 || improves === null) return 'neutral';
  return (delta < 0) === (improves === 'down') ? 'good' : 'bad';
}

function mapKpis(rows: PerformanceKpiRow[] | null): PerformanceKpi[] | null {
  if (!rows) return null;
  const byMetric = new Map(rows.map((row) => [row.metric, row]));
  return KPI_ORDER.map((metric) => {
    const row = byMetric.get(metric);
    // A value that is missing hides its comparison too: "+4% vs last month" over a dash makes no sense.
    const value = row?.value ?? null;
    const delta = value === null ? null : roundDelta(row?.delta ?? null);
    return {
      metric,
      value,
      // The unit the service sent wins: a metric it reports on another scale (a 1-5 rating, say) must
      // not be shown as a percentage because this table says so.
      unit: row?.unit?.trim() || DEFAULT_UNITS[metric],
      delta,
      tone: toneOf(metric, delta),
      basis: row?.basis ?? null,
    };
  });
}

/** `2026-09-28` → `28 Sep`. Anything that is not a `YYYY-MM-DD` date passes through unchanged. */
export function formatWeekStart(date: string, locale = 'en'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  // `Date.UTC` rolls 2026-13-45 over to a real date; only a day that exists as written is a date.
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return date;
  }
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(parsed);
  } catch {
    return date;
  }
}

function mapWeeklyTrend(rows: WeeklyTrendRow[] | null, locale: string): WeeklyTrendPoint[] | null {
  if (!rows) return null;
  return rows.map((row) => ({
    week: formatWeekStart(row.week_start, locale),
    received: row.received,
    resolved: row.resolved,
  }));
}

function mapRegions(rows: RegionResolutionRow[] | null): RegionResolutionStat[] | null {
  if (!rows) return null;
  return rows.map((row) => ({
    code: row.region_code,
    name: row.region_name?.trim() || row.region_code,
    resolved: row.resolved,
    total: row.total,
    rate: row.rate,
  }));
}

function mapCategories(rows: CategoryResolutionRow[] | null): CategoryResolutionStat[] | null {
  if (!rows) return null;
  // A missing, null or blank category is one bucket, not several look-alike rows.
  const merged = new Map<string, CategoryResolutionStat>();
  for (const row of rows) {
    const category = row.category?.trim() || null;
    const key = category ?? '';
    const stat = merged.get(key) ?? {
      category,
      filed: 0,
      resolved: 0,
      resolvedOnTime: 0,
      resolvedBreached: 0,
    };
    stat.filed += row.filed;
    stat.resolved += row.resolved;
    stat.resolvedOnTime += row.resolved_on_time;
    stat.resolvedBreached += row.resolved_breached;
    merged.set(key, stat);
  }
  return [...merged.values()].sort((a, b) => b.filed - a.filed);
}

function mapAvgResolution(rows: AvgResolutionRow[] | null): AvgResolutionStat[] | null {
  if (!rows) return null;
  // A missing, null or blank category is one bucket; its average is weighted by the cases behind each row.
  const merged = new Map<string, { category: string | null; resolved: number; totalDays: number }>();
  for (const row of rows) {
    const category = row.category?.trim() || null;
    const key = category ?? '';
    const entry = merged.get(key) ?? { category, resolved: 0, totalDays: 0 };
    entry.resolved += row.resolved;
    entry.totalDays += row.avg_resolution_days * row.resolved;
    merged.set(key, entry);
  }
  return [...merged.values()]
    .filter((entry) => entry.resolved > 0)
    .map((entry) => ({
      category: entry.category,
      resolved: entry.resolved,
      days: Math.round((entry.totalDays / entry.resolved) * 10) / 10,
    }))
    .sort((a, b) => b.resolved - a.resolved);
}

function mapPerformanceScore(rows: PerformanceScoreRow[] | null): PerformanceScoreAxis[] | null {
  if (!rows) return null;
  // Always the six axes in radar order; one the service left out is a gap, not a zero.
  const byAxis = new Map(rows.map((row) => [row.axis, row]));
  return PERFORMANCE_SCORE_AXES.map((axis) => {
    const row = byAxis.get(axis);
    return { axis, score: row?.basis ? (row.score ?? null) : null, basis: row?.basis ?? 0 };
  });
}

/**
 * Turns the parsed charts into what the page draws. A chart that is unavailable
 * maps to `null` — never to zeros, which would read as "no cases".
 */
export function mapAnalyticsCharts(charts: AnalyticsCharts, locale = 'en'): AnalyticsReport {
  return {
    kpis: mapKpis(charts.grvPerformanceKpis),
    weeklyTrend: mapWeeklyTrend(charts.grvWeeklyTrend, locale),
    regions: mapRegions(charts.grvResolutionRateByRegion),
    categories: mapCategories(charts.grvCategoryResolution),
    avgResolution: mapAvgResolution(charts.grvAvgResolutionByCategory),
    performanceScore: mapPerformanceScore(charts.grvPerformanceScore),
  };
}
