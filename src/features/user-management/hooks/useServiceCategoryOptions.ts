'use client';

import { useEffect, useState } from 'react';
import { fetchServiceCategoryNames } from '../api/officerApi';

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * The service categories an officer form offers. A category admin may take any category, so
 * pass `hasDesk` undefined for them; an officer or reviewer can only sit on a category that
 * already has an active desk, so pass `true`.
 */
export function useServiceCategoryOptions(hasDesk: boolean | undefined): {
  options: CategoryOption[];
  isLoading: boolean;
} {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchServiceCategoryNames({ hasDesk }, { signal: controller.signal })
      .then((names) => {
        if (!controller.signal.aborted) setOptions(names.map((name) => ({ value: name, label: name })));
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [hasDesk]);

  return { options, isLoading };
}
