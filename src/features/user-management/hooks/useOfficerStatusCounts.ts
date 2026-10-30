'use client';

import { useEffect, useState } from 'react';
import { fetchOfficerStatusCounts } from '../api/officerApi';
import type { OfficerLevel, OfficerRole } from '../types';

export interface OfficerStatusCounts {
  active: number;
  onLeave: number;
  inactive: number;
}

const ZERO_COUNTS: OfficerStatusCounts = { active: 0, onLeave: 0, inactive: 0 };

/**
 * The true Active/On Leave/Inactive breakdown for a tab, across every officer regardless of
 * page — one call to `GET /api/v1/officers/status-counts`, which takes the same role/level
 * filters as the list itself (minus `status`, which this breaks down by).
 *
 * `enabled` lets the caller skip the request entirely while a different tab is active.
 */
export function useOfficerStatusCounts(role: OfficerRole, level: OfficerLevel | undefined, enabled: boolean): OfficerStatusCounts {
  // Only ever set from the fetch's own then/catch below, never reset directly for the
  // `!enabled` case — that keeps this hook from needing a setState call in the effect's
  // early-return branch (see useWiredCategoryOptions for the same shape).
  const [fetchedCounts, setFetchedCounts] = useState<OfficerStatusCounts>(ZERO_COUNTS);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchOfficerStatusCounts({ role, level: role === 'Officer' ? level : undefined }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setFetchedCounts({ active: data.active, onLeave: data.on_leave, inactive: data.inactive });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchedCounts(ZERO_COUNTS);
      });
    return () => controller.abort();
  }, [role, level, enabled]);

  return enabled ? fetchedCounts : ZERO_COUNTS;
}
