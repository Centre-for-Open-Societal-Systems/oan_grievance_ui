'use client';

export interface GrievanceMetrics {
  all: number;
  pending: number;
  inProgress: number;
  underReview: number;
  resolved: number;
  rejected: number;
}

type MetricBucket = keyof Omit<GrievanceMetrics, 'all'>;

export const EMPTY_METRICS: GrievanceMetrics = {
  all: 0,
  pending: 0,
  inProgress: 0,
  underReview: 0,
  resolved: 0,
  rejected: 0,
};

export const MOCK_METRICS: GrievanceMetrics = {
  all: 128,
  pending: 24,
  inProgress: 42,
  underReview: 18,
  resolved: 36,
  rejected: 8,
};

/**
 * The metric cards are fixed buckets, while the lifecycle statuses come from
 * GET /api/v1/grievances/options and can be renamed backend-side. Match statuses to
 * buckets by keyword so a status the backend adds still lands somewhere sensible.
 */
const BUCKET_PATTERNS: Array<[MetricBucket, RegExp]> = [
  ['underReview', /review|more info|awaiting|verif/i],
  ['inProgress', /progress|assigned|investigat|action/i],
  ['resolved', /resolved|closed|confirm/i],
  ['rejected', /rejected|declined|withdraw|invalid/i],
  ['pending', /submitted|pending|new|open/i],
];

export function bucketStatuses(statuses: string[]): Record<MetricBucket, string[]> {
  const buckets: Record<MetricBucket, string[]> = {
    pending: [],
    inProgress: [],
    underReview: [],
    resolved: [],
    rejected: [],
  };

  for (const status of statuses) {
    const match = BUCKET_PATTERNS.find(([, pattern]) => pattern.test(status));
    if (match) buckets[match[0]].push(status);
  }

  return buckets;
}

const noop = () => {};

/**
 * Counts for the metric cards.
 * Returns static mock data to avoid making multiple parallel requests.
 */
export function useGrievanceMetrics(_statuses?: string[]): {
  metrics: GrievanceMetrics;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  return {
    metrics: MOCK_METRICS,
    isLoading: false,
    error: null,
    refetch: noop,
  };
}
