'use client';

import { useEffect, useState } from 'react';
import { fetchGrievanceOptions } from '@/features/metadata';
import { fetchServiceCategoryNames } from '../api/officerApi';

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * The service categories an officer form offers. A category admin may take any category, so
 * pass `hasDesk` undefined for them; an officer or reviewer can only sit on a category that
 * already has an active desk, so pass `true`.
 *
 * With a `department`, only the categories that department has a staffed desk for
 * (`GET /grievances/options?department=`): the service refuses an officer on any other. That list is
 * already limited to staffed desks, so `hasDesk` only applies without a department.
 */
export function useServiceCategoryOptions(
  hasDesk: boolean | undefined,
  department?: string
): {
  options: CategoryOption[];
  isLoading: boolean;
} {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    // The previous department's categories must not stay pickable while the new ones load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions([]);
    setIsLoading(true);
    const names = department
      ? fetchGrievanceOptions({ department }, { signal: controller.signal }).then((data) =>
          (data?.service_categories ?? []).map((category) => category.category_name)
        )
      : fetchServiceCategoryNames({ hasDesk }, { signal: controller.signal });
    names
      .then((found) => {
        if (!controller.signal.aborted) setOptions(found.map((name) => ({ value: name, label: name })));
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [hasDesk, department]);

  return { options, isLoading };
}
