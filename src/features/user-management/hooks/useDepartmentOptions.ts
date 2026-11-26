'use client';

import { useEffect, useState } from 'react';
import { fetchGrievanceOptions } from '@/features/metadata';

export interface DepartmentOption {
  value: string;
  label: string;
}

/**
 * The departments an officer can be placed in: those the service lists in `GET /grievances/options`
 * (a department with a staffed desk). Sent back by `department_id`.
 */
export function useDepartmentOptions(enabled: boolean): { options: DepartmentOption[]; isLoading: boolean } {
  const [options, setOptions] = useState<DepartmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    fetchGrievanceOptions({}, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setOptions(
          (data?.departments ?? []).map((department) => ({
            value: department.department_id,
            label: department.department_name || department.department_id,
          }))
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [enabled]);

  return { options, isLoading };
}
