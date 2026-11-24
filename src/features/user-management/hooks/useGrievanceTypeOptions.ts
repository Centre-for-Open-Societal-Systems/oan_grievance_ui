'use client';

import { useEffect, useState } from 'react';
import { fetchGrievanceTypeNames } from '../api/officerApi';

/** The grievance types under one service category; empty until a category is chosen. */
export function useGrievanceTypeOptions(category: string): { options: string[]; isLoading: boolean } {
  const [loaded, setLoaded] = useState<{ category: string; names: string[] } | null>(null);

  useEffect(() => {
    if (!category) return;
    const controller = new AbortController();
    fetchGrievanceTypeNames(category, { signal: controller.signal })
      .then((names) => {
        if (!controller.signal.aborted) setLoaded({ category, names });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ category, names: [] });
      });
    return () => controller.abort();
  }, [category]);

  const isCurrent = !!category && loaded?.category === category;
  return { options: isCurrent ? loaded.names : [], isLoading: !!category && !isCurrent };
}
