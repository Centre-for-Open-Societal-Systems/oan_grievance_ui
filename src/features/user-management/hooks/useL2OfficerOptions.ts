'use client';

import { useEffect, useState } from 'react';
import { fetchOfficers } from '../api/officerApi';
import type { OfficerLevel } from '../types';

export interface OfficerOption {
  value: string;
  label: string;
}

/**
 * Officers of the next rung up for the "Reports To" dropdown on a first-rung officer's form — only that
 * rung reports to someone, and that someone must already be an active officer of the rung above
 * (`services/officer.py`'s `_resolve_supervisor`). Sent back to the API by `value` (the officer's
 * email/user id). `level` is that rung's role level code; it defaults to the second rung, L2.
 */
export function useL2OfficerOptions(
  enabled: boolean,
  level: OfficerLevel = 'L2',
  /** Only officers placed at this area or under it (`area_id`); the list is empty until one is given when `requireArea` is set. */
  areaId?: string,
  requireArea = false,
  /** The categories the new officer covers: a supervisor must sit on each (the service refuses one who does not). Waits for at least one when `requireCategories` is set. */
  categories: string[] = [],
  requireCategories = false,
  /** Only officers of this department. */
  department?: string
): { options: OfficerOption[]; isLoading: boolean } {
  const [options, setOptions] = useState<OfficerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const categoryKey = JSON.stringify(categories);
  const hasCategories = categories.length > 0;

  useEffect(() => {
    if (!enabled || (requireArea && !areaId) || (requireCategories && !hasCategories)) return;
    const wanted: Array<string | undefined> = hasCategories ? (JSON.parse(categoryKey) as string[]) : [undefined];

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    // page_size is capped at 100 server-side (ListOfficers' own validation) — asking for
    // more fails the whole request with a 400, which the catch below then silently turns
    // into an empty dropdown instead of a visible error.
    Promise.all(
      wanted.map((service_category) =>
        fetchOfficers(
          { level, status: 'Active', region: areaId || undefined, department: department || undefined, service_category, page: 1, page_size: 100 },
          { signal: controller.signal }
        )
      )
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        // Someone who covers every category is in every answer.
        const [first, ...rest] = results.map((data) => data.officers);
        const shared = (first ?? []).filter((officer) => rest.every((others) => others.some((o) => o.name === officer.name)));
        setOptions(shared.map((officer) => ({ value: officer.name, label: officer.full_name })));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [enabled, level, areaId, requireArea, categoryKey, hasCategories, requireCategories, department]);

  const waiting = (requireArea && !areaId) || (requireCategories && !hasCategories);
  return { options: waiting ? [] : options, isLoading };
}
