'use client';

import { useEffect, useState } from 'react';
import { fetchFilterOptions } from '../api/analyticsApi';
import type { AnalyticsFilterOptions } from '../types';

const NONE: AnalyticsFilterOptions = { regions: null, categories: null, departments: null, failed: false };

/**
 * What the filters can be set to. A request that fails leaves every control out
 * rather than blocking the page: the charts are still useful unfiltered.
 */
export function useAnalyticsFilterOptions(includeDepartments: boolean): AnalyticsFilterOptions {
  const [options, setOptions] = useState<AnalyticsFilterOptions>(NONE);

  useEffect(() => {
    const controller = new AbortController();

    fetchFilterOptions({ includeDepartments, signal: controller.signal })
      .then((loaded) => {
        if (!controller.signal.aborted) setOptions(loaded);
      })
      .catch(() => {
        // Every list failure is already folded into `failed`; only an abort rejects, and that is ignored.
      });

    return () => controller.abort();
  }, [includeDepartments]);

  return options;
}
