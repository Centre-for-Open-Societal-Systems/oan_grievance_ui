'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdministrativeAreaAncestors,
  fetchAdministrativeAreas,
  fetchGrievanceOptions,
  fetchSubmitterOptions,
} from '../api/metadataApi';
import type {
  AdministrativeAreaAncestorsData,
  AdministrativeAreasData,
  AdministrativeAreasQueryParams,
  GrievanceOptionsData,
  GrievanceOptionsQueryParams,
  SubmitterOptionsData,
  SubmitterOptionsQueryParams,
} from '../types';

export interface UseAsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to retrieve public dropdown data for submitter types, intake channels,
 * preferred languages, service categories, grievance types, and phone extensions.
 */
export function useSubmitterOptions(
  params?: SubmitterOptionsQueryParams
): UseAsyncState<SubmitterOptionsData> {
  const [data, setData] = useState<SubmitterOptionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const searchCountry = params?.search_country;
  const country = params?.country;
  const includePhones = params?.include_phone_extensions;
  const serviceCategory = params?.service_category;

  useEffect(() => {
    let ignore = false;

    fetchSubmitterOptions({
      search_country: searchCountry,
      country,
      include_phone_extensions: includePhones,
      service_category: serviceCategory,
    })
      .then((result) => {
        if (!ignore) {
          setData(result);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load submitter options');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [searchCountry, country, includePhones, serviceCategory]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchSubmitterOptions({
        search_country: searchCountry,
        country,
        include_phone_extensions: includePhones,
        service_category: serviceCategory,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submitter options');
    } finally {
      setIsLoading(false);
    }
  }, [searchCountry, country, includePhones, serviceCategory]);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to retrieve administrative areas for cascading dropdowns (e.g. Region -> Zone -> Woreda -> Kebele).
 */
export function useAdministrativeAreas(
  params?: AdministrativeAreasQueryParams
): UseAsyncState<AdministrativeAreasData> {
  const [data, setData] = useState<AdministrativeAreasData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const parent = params?.parent;
  const levelName = params?.level_name;
  const search = params?.search;
  const ancestorsOf = params?.ancestors_of;
  const limit = params?.limit;

  useEffect(() => {
    let ignore = false;

    fetchAdministrativeAreas({
      parent,
      level_name: levelName,
      search,
      ancestors_of: ancestorsOf,
      limit,
    })
      .then((result) => {
        if (!ignore) {
          setData(result);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load administrative areas');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [parent, levelName, search, ancestorsOf, limit]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAdministrativeAreas({
        parent,
        level_name: levelName,
        search,
        ancestors_of: ancestorsOf,
        limit,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load administrative areas');
    } finally {
      setIsLoading(false);
    }
  }, [parent, levelName, search, ancestorsOf, limit]);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to retrieve ancestor breadcrumbs for a selected administrative area.
 */
export function useAdministrativeAreaAncestors(
  areaIdOrPath?: string | null
): UseAsyncState<AdministrativeAreaAncestorsData> {
  const [data, setData] = useState<AdministrativeAreaAncestorsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(areaIdOrPath));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaIdOrPath) {
      return;
    }

    let ignore = false;

    fetchAdministrativeAreaAncestors(areaIdOrPath)
      .then((result) => {
        if (!ignore) {
          setData(result);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load ancestors');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [areaIdOrPath]);

  const refetch = useCallback(async () => {
    if (!areaIdOrPath) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAdministrativeAreaAncestors(areaIdOrPath);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ancestors');
    } finally {
      setIsLoading(false);
    }
  }, [areaIdOrPath]);

  return { data, isLoading, error, refetch };
}

/**
 * Hook to retrieve staff-facing grievance options (departments, lifecycle statuses, categories, channels).
 */
export function useGrievanceOptions(
  params?: GrievanceOptionsQueryParams
): UseAsyncState<GrievanceOptionsData> {
  const [data, setData] = useState<GrievanceOptionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const serviceCategory = params?.service_category;

  useEffect(() => {
    let ignore = false;

    fetchGrievanceOptions({
      service_category: serviceCategory,
    })
      .then((result) => {
        if (!ignore) {
          setData(result);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load grievance options');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [serviceCategory]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchGrievanceOptions({
        service_category: serviceCategory,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grievance options');
    } finally {
      setIsLoading(false);
    }
  }, [serviceCategory]);

  return { data, isLoading, error, refetch };
}
