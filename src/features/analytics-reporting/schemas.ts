import { z } from 'zod';

/**
 * Rows of the Analytics & Reporting charts `GET /api/v1/charts` returns, as the
 * service builds them (`oan_grievance_service/services/dashboard.py`). Each chart
 * is parsed on its own, so one malformed or failed chart leaves the others usable.
 */
const count = z.number().int().nonnegative();

export const performanceKpiRowSchema = z.object({
  metric: z.string(),
  /** Null when the month has nothing to measure (no resolved cases, no submissions, no feedback). */
  value: z.number().finite().nullable(),
  unit: z.string(),
  /** This month minus last month; null when there is no previous month. `satisfaction` has none. */
  delta: z.number().finite().nullable().optional(),
  /** Number of feedback responses — `satisfaction` only. */
  basis: count.optional(),
});

export const weeklyTrendRowSchema = z.object({
  /** `YYYY-MM-DD`, the Monday of an ISO week. */
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  received: count,
  resolved: count,
});

export const regionResolutionRowSchema = z.object({
  region_code: z.string().min(1),
  region_name: z.string().nullable().optional(),
  resolved: count,
  total: count,
  /** Already a percentage with one decimal. */
  rate: z.number().finite().min(0).max(100),
});

export const categoryResolutionRowSchema = z.object({
  category: z.string().nullable(),
  filed: count,
  resolved: count,
  resolved_on_time: count,
  resolved_breached: count,
});

export const avgResolutionRowSchema = z.object({
  category: z.string().nullable(),
  /** Cases behind the average. */
  resolved: count,
  /** Days from filing to resolution, one decimal. */
  avg_resolution_days: z.number().finite().nonnegative(),
});

/** The radar's axes, in the order it reads clockwise from the top. */
export const PERFORMANCE_SCORE_AXES = [
  'timeliness',
  'resolution_rate',
  'satisfaction',
  'transparency',
  'follow_up',
  'coverage',
] as const;

export const performanceScoreRowSchema = z.object({
  axis: z.string(),
  /** 0 to 100; null when `basis` is 0, which is a gap, not a zero. */
  score: z.number().finite().min(0).max(100).nullable(),
  /** Number of cases the score is a share of. */
  basis: count,
});

/** The charts the page asks for, with the schema of each one's rows. */
export const ANALYTICS_CHART_SCHEMAS = {
  grvPerformanceKpis: z.array(performanceKpiRowSchema),
  grvWeeklyTrend: z.array(weeklyTrendRowSchema),
  grvResolutionRateByRegion: z.array(regionResolutionRowSchema),
  grvCategoryResolution: z.array(categoryResolutionRowSchema),
  grvAvgResolutionByCategory: z.array(avgResolutionRowSchema),
  grvPerformanceScore: z.array(performanceScoreRowSchema),
} as const;

export type AnalyticsChartId = keyof typeof ANALYTICS_CHART_SCHEMAS;

export type PerformanceKpiRow = z.infer<typeof performanceKpiRowSchema>;
export type WeeklyTrendRow = z.infer<typeof weeklyTrendRowSchema>;
export type RegionResolutionRow = z.infer<typeof regionResolutionRowSchema>;
export type CategoryResolutionRow = z.infer<typeof categoryResolutionRowSchema>;
export type AvgResolutionRow = z.infer<typeof avgResolutionRowSchema>;
export type PerformanceScoreRow = z.infer<typeof performanceScoreRowSchema>;

/** Every chart's rows, or `null` when the service could not build it, left it out or sent rows that do not match. */
export type AnalyticsCharts = {
  [Id in AnalyticsChartId]: z.infer<(typeof ANALYTICS_CHART_SCHEMAS)[Id]> | null;
};
