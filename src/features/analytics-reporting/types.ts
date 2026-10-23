import type { PERFORMANCE_SCORE_AXES } from './schemas';

export type { AnalyticsCharts } from './schemas';

export type PerformanceMetric = 'avg_resolution_time' | 'resolution_rate' | 'escalation_rate' | 'satisfaction';

/** Whether a change is good news, bad news, or neither — it depends on the metric, not only the sign. */
export type DeltaTone = 'good' | 'bad' | 'neutral';

export interface PerformanceKpi {
  metric: PerformanceMetric;
  /** Null when the month has nothing to measure: shown as a dash. */
  value: number | null;
  /** `days` and `percent` are known; any other unit the service sends is shown as it came. */
  unit: string;
  /** Null when there is nothing to compare with, or the metric has no comparison. */
  delta: number | null;
  tone: DeltaTone;
  /** Feedback responses behind `satisfaction`; null for the other metrics. */
  basis: number | null;
}

export interface WeeklyTrendPoint {
  /** Axis label, e.g. `28 Sep`. */
  week: string;
  received: number;
  resolved: number;
}

export interface RegionResolutionStat {
  code: string;
  name: string;
  resolved: number;
  total: number;
  rate: number;
}

export interface CategoryResolutionStat {
  /** Null for cases filed without a category: the component names it. */
  category: string | null;
  filed: number;
  resolved: number;
  resolvedOnTime: number;
  resolvedBreached: number;
}

export interface AvgResolutionStat {
  /** Null for cases filed without a category: the component names it. */
  category: string | null;
  resolved: number;
  days: number;
}

export type ScoreAxis = (typeof PERFORMANCE_SCORE_AXES)[number];

export interface PerformanceScoreAxis {
  axis: ScoreAxis;
  /** Null when nothing is measured on this axis: a gap, never a zero. */
  score: number | null;
  basis: number;
}

/** One thing a filter can be set to. */
export interface FilterOption {
  value: string;
  label: string;
}

/** The filters in force; an empty value means "all". */
export interface AnalyticsFilters {
  region: string;
  serviceCategory: string;
  assignedDept: string;
}

export const NO_FILTERS: AnalyticsFilters = { region: '', serviceCategory: '', assignedDept: '' };

/** What each filter offers; a list is null when it could not be loaded, and that control is left out. */
export interface AnalyticsFilterOptions {
  regions: FilterOption[] | null;
  categories: FilterOption[] | null;
  /** Admin only. */
  departments: FilterOption[] | null;
  /** A list failed to load for a reason worth telling the user (not merely "the service has no such list"). */
  failed: boolean;
}

/** What the page draws. A chart that is unavailable is `null` — never zeros, which would read as "no cases". */
export interface AnalyticsReport {
  kpis: PerformanceKpi[] | null;
  weeklyTrend: WeeklyTrendPoint[] | null;
  regions: RegionResolutionStat[] | null;
  categories: CategoryResolutionStat[] | null;
  avgResolution: AvgResolutionStat[] | null;
  performanceScore: PerformanceScoreAxis[] | null;
}
