'use client';

import { useEffect, useState } from 'react';
import { fetchOfficerStatusCounts } from '../api/officerApi';
import type { OfficerLevel, OfficerRole } from '../types';

/**
 * The true total officer count for a tab, for its `(N)` badge — independent of whether that
 * tab is the active one. `useOfficerList` only fetches for the active tab (the right call
 * for its heavier list+stats data), so without this a tab you haven't clicked into yet would
 * have nothing to show its badge. `null` while unresolved, so the caller can render nothing
 * rather than a wrong number.
 */
/**
 * `enabled = false` skips the request entirely — for a tab that's hidden for the signed-in
 * role (the Reviewer tab, for a Review Officer: the backend refuses to even list those
 * accounts for that role, so firing the request would just be an always-403 network call
 * with no badge to show its result on).
 */
export function useOfficerCount(role: OfficerRole, level?: OfficerLevel, enabled = true): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchOfficerStatusCounts({ role, level: role === 'Officer' ? level : undefined }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCount(data.total);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCount(null);
      });
    return () => controller.abort();
  }, [role, level, enabled]);

  return enabled ? count : null;
}
