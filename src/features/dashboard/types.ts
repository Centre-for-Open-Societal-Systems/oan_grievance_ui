export type {
  AdminLevelRow,
  DashboardCharts,
  KpiRow,
  StatusRow,
  CategoryRow,
  MonthlyTrendRow,
} from './schemas';

export type KpiMetric = 'total' | 'awaiting_action' | 'resolved' | 'escalated';

/** `percentage` and `number` deltas read "+N from…", `alert` is the escalated card's fixed SLA caption. */
export type KpiKind = 'percentage' | 'number' | 'alert';

export interface KpiCard {
  metric: KpiMetric;
  /** Null when the service did not report this metric — shown as unavailable, never as 0. */
  value: number | null;
  /** Null when there is nothing meaningful to show, so the card shows only its value. */
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

/**
 * One bar of the category card. `uncategorised` and `remainder` have no name of
 * their own — the card words them — and `remainder` stands for `categories` more.
 */
export interface ServiceCategoryStat {
  key: string;
  kind: 'category' | 'uncategorised' | 'remainder';
  name: string;
  value: number;
  /** The largest count in the list — the full width of a bar. */
  max: number;
  color: string;
  /** How many categories a `remainder` row adds up. */
  categories?: number;
}

/**
 * What the dashboard draws. A section is `null` when its chart is unavailable,
 * which is different from an empty list (nothing to show) — a failed chart must
 * never read as zero cases.
 */
export interface DashboardStatistics {
  kpis: KpiCard[] | null;
  monthlyTrend: MonthlyTrendPoint[] | null;
  statusDistribution: StatusDistributionSlice[] | null;
  serviceCategories: ServiceCategoryStat[] | null;
  /** Open escalated cases — drives the banner. Null when unknown. */
  escalated: number | null;
}

/** A region or woreda in the administrative-level card. */
export interface AdminAreaStat {
  /** The area's code, unique within its level. */
  code: string;
  /** Falls back to the code when the service sent no name. */
  name: string;
  value: number;
  /** The region it belongs to (its own code, for a region). */
  regionCode: string | null;
}

/**
 * What the administrative-level card draws. Each part is empty when the caller may not read
 * that level (a woreda officer reads no region or federal row), which is different from the
 * whole chart being unavailable.
 */
export interface AdminLevelStatistics {
  federal: { name: string | null; value: number } | null;
  regions: AdminAreaStat[];
  woredas: AdminAreaStat[];
}
