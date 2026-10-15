/**
 * Rows of the dashboard charts `GET /api/v1/charts` returns, as the service
 * builds them (`oan_grievance_service/services/dashboard.py`). A chart that
 * failed to build comes back as `null` and the others still render.
 */
export interface KpiRow {
  metric: string;
  value: number;
  /** Percent change against last month — `total` only; null when there was nothing last month. */
  delta_pct?: number | null;
  /** Absolute change this week — `awaiting_action` and `resolved`. */
  delta?: number;
}

export interface StatusRow {
  status: string;
  count: number;
}

export interface CategoryRow {
  category: string | null;
  count: number;
}

export interface MonthlyTrendRow {
  /** `YYYY-MM`. */
  month: string;
  submitted: number;
  resolved: number;
}

export interface DashboardChartsData {
  grvKpis?: KpiRow[] | null;
  grvStatusDistribution?: StatusRow[] | null;
  grvByCategory?: CategoryRow[] | null;
  grvMonthlyTrend?: MonthlyTrendRow[] | null;
}

export type KpiMetric = 'total' | 'awaiting_action' | 'resolved' | 'escalated';

/** `percentage` and `number` deltas read "+N from…", `alert` is the escalated card's fixed SLA caption. */
export type KpiKind = 'percentage' | 'number' | 'alert';

export interface KpiCard {
  metric: KpiMetric;
  title: string;
  value: number;
  /** Null when the service sent no delta, so the card shows only its caption. */
  trend: number | null;
  type: KpiKind;
}

export interface MonthlyTrendPoint {
  month: string;
  submitted: number;
  resolved: number;
}

export interface StatusDistributionSlice {
  name: string;
  value: number;
  color: string;
}

export interface ServiceCategoryStat {
  name: string;
  value: number;
  /** The largest count in the list — the full width of a bar. */
  max: number;
  color: string;
}

export interface DashboardStatistics {
  kpis: KpiCard[];
  monthlyTrend: MonthlyTrendPoint[];
  statusDistribution: StatusDistributionSlice[];
  serviceCategories: ServiceCategoryStat[];
  /** Open escalated cases — drives the banner. */
  escalated: number;
}
