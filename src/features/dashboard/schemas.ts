import { z } from 'zod';

/**
 * Rows of the dashboard charts `GET /api/v1/charts` returns, as the service
 * builds them (`oan_grievance_service/services/dashboard.py`). Each chart is
 * parsed on its own, so one malformed or failed chart leaves the others usable.
 */
const count = z.number().int().nonnegative();

export const kpiRowSchema = z.object({
  metric: z.string(),
  value: count,
  /** Percent change against last month — `total` only; null when there was nothing last month. */
  delta_pct: z.number().finite().nullable().optional(),
  /** New cases this week (`awaiting_action`) or resolved this week (`resolved`). */
  delta: z.number().int().optional(),
});

export const statusRowSchema = z.object({
  status: z.string().min(1),
  count,
});

export const categoryRowSchema = z.object({
  category: z.string().nullable(),
  count,
});

export const monthlyTrendRowSchema = z.object({
  /** `YYYY-MM`. */
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  submitted: count,
  resolved: count,
});

/**
 * One row of `grvByAdminLevel`: the federal total, a region or a woreda. `level` is left
 * open so a level this app has not met is skipped by the mapper, not a reason to drop the chart.
 */
export const adminLevelRowSchema = z.object({
  level: z.string(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  /** The region a woreda sits in; the region's own code on a region row; null on the federal row. */
  region_code: z.string().nullable(),
  count,
});

/**
 * `grvByAdminLevel` is requested on its own, not with the charts below: the service answers
 * 404 to a whole call that names a chart it does not know, so a service without it must not
 * take the rest of the dashboard down.
 */
export const ADMIN_LEVEL_CHART_ID = 'grvByAdminLevel';
export const adminLevelChartSchema = z.array(adminLevelRowSchema);

/** The charts the dashboard asks for, with the schema of each one's rows. */
export const DASHBOARD_CHART_SCHEMAS = {
  grvKpis: z.array(kpiRowSchema),
  grvStatusDistribution: z.array(statusRowSchema),
  grvByCategory: z.array(categoryRowSchema),
  grvMonthlyTrend: z.array(monthlyTrendRowSchema),
} as const;

export type DashboardChartId = keyof typeof DASHBOARD_CHART_SCHEMAS;

export type KpiRow = z.infer<typeof kpiRowSchema>;
export type StatusRow = z.infer<typeof statusRowSchema>;
export type CategoryRow = z.infer<typeof categoryRowSchema>;
export type MonthlyTrendRow = z.infer<typeof monthlyTrendRowSchema>;
export type AdminLevelRow = z.infer<typeof adminLevelRowSchema>;

/** Every chart's rows, or `null` when the service could not build it, left it out or sent rows that do not match. */
export type DashboardCharts = {
  [Id in DashboardChartId]: z.infer<(typeof DASHBOARD_CHART_SCHEMAS)[Id]> | null;
};
