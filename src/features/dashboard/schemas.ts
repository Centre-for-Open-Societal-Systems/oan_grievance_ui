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

/** Every chart's rows, or `null` when the service could not build it, left it out or sent rows that do not match. */
export type DashboardCharts = {
  [Id in DashboardChartId]: z.infer<(typeof DASHBOARD_CHART_SCHEMAS)[Id]> | null;
};
