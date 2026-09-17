import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  fetchAdministrativeAreas,
  fetchGrievanceOptions,
  fetchSubmitterOptions,
} from '../api/metadataApi';
import type {
  AdministrativeArea,
  AdministrativeAreasData,
  AdministrativeAreasQueryParams,
  GrievanceOptionsData,
  GrievanceOptionsQueryParams,
  SubmitterOptionsData,
  SubmitterOptionsQueryParams,
} from '../types';

export interface MetadataState {
  submitterOptions: SubmitterOptionsData | null;
  submitterOptionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  submitterOptionsError: string | null;

  regions: AdministrativeArea[];
  regionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  regionsError: string | null;

  childAreasByParent: Record<string, AdministrativeArea[]>;
  childAreasStatus: Record<string, 'idle' | 'loading' | 'succeeded' | 'failed'>;

  grievanceOptions: GrievanceOptionsData | null;
  grievanceOptionsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  grievanceOptionsError: string | null;

  selectedLanguage?: string;
}

const initialState: MetadataState = {
  submitterOptions: null,
  submitterOptionsStatus: 'idle',
  submitterOptionsError: null,

  regions: [],
  regionsStatus: 'idle',
  regionsError: null,

  childAreasByParent: {},
  childAreasStatus: {},

  grievanceOptions: null,
  grievanceOptionsStatus: 'idle',
  grievanceOptionsError: null,

  selectedLanguage: 'en',
};

export const fetchSubmitterOptionsThunk = createAsyncThunk<
  SubmitterOptionsData,
  SubmitterOptionsQueryParams | undefined,
  { rejectValue: string }
>('metadata/fetchSubmitterOptions', async (params, { rejectWithValue }) => {
  try {
    return await fetchSubmitterOptions(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch submitter options';
    return rejectWithValue(msg);
  }
});

export const fetchRegionsThunk = createAsyncThunk<
  AdministrativeAreasData,
  void,
  { rejectValue: string }
>('metadata/fetchRegions', async (_, { rejectWithValue }) => {
  try {
    return await fetchAdministrativeAreas({ level_name: 'Region', limit: 100 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch regions';
    return rejectWithValue(msg);
  }
});

export const fetchChildAreasThunk = createAsyncThunk<
  { key: string; parent: string; level_name?: string; data: AdministrativeAreasData },
  AdministrativeAreasQueryParams & { parent: string },
  { rejectValue: string }
>('metadata/fetchChildAreas', async (params, { rejectWithValue }) => {
  try {
    const data = await fetchAdministrativeAreas(params);
    const key = params.level_name ? `${params.parent}_${params.level_name}` : params.parent;
    return { key, parent: params.parent, level_name: params.level_name, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch child areas';
    return rejectWithValue(msg);
  }
});

export const fetchGrievanceOptionsThunk = createAsyncThunk<
  GrievanceOptionsData,
  GrievanceOptionsQueryParams | undefined,
  { rejectValue: string }
>('metadata/fetchGrievanceOptions', async (params, { rejectWithValue }) => {
  try {
    return await fetchGrievanceOptions(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch grievance options';
    return rejectWithValue(msg);
  }
});

const metadataSlice = createSlice({
  name: 'metadata',
  initialState,
  reducers: {
    clearMetadataErrors(state) {
      state.submitterOptionsError = null;
      state.regionsError = null;
      state.grievanceOptionsError = null;
    },
    setSelectedLanguage(state, action: PayloadAction<string>) {
      state.selectedLanguage = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Submitter Options
    builder.addCase(fetchSubmitterOptionsThunk.pending, (state) => {
      state.submitterOptionsStatus = 'loading';
      state.submitterOptionsError = null;
    });
    builder.addCase(
      fetchSubmitterOptionsThunk.fulfilled,
      (state, action: PayloadAction<SubmitterOptionsData>) => {
        state.submitterOptionsStatus = 'succeeded';
        state.submitterOptions = action.payload;
      }
    );
    builder.addCase(fetchSubmitterOptionsThunk.rejected, (state, action) => {
      state.submitterOptionsStatus = 'failed';
      state.submitterOptionsError = action.payload ?? 'Error loading submitter options';
    });

    // Regions
    builder.addCase(fetchRegionsThunk.pending, (state) => {
      state.regionsStatus = 'loading';
      state.regionsError = null;
    });
    builder.addCase(
      fetchRegionsThunk.fulfilled,
      (state, action: PayloadAction<AdministrativeAreasData>) => {
        state.regionsStatus = 'succeeded';
        state.regions = action.payload.areas;
      }
    );
    builder.addCase(fetchRegionsThunk.rejected, (state, action) => {
      state.regionsStatus = 'failed';
      state.regionsError = action.payload ?? 'Error loading regions';
    });

    // Child Areas
    builder.addCase(fetchChildAreasThunk.pending, (state, action) => {
      const parent = action.meta.arg.parent;
      const key = action.meta.arg.level_name ? `${parent}_${action.meta.arg.level_name}` : parent;
      state.childAreasStatus[parent] = 'loading';
      state.childAreasStatus[key] = 'loading';
    });
    builder.addCase(fetchChildAreasThunk.fulfilled, (state, action) => {
      const { key, parent, data } = action.payload;
      state.childAreasStatus[parent] = 'succeeded';
      state.childAreasStatus[key] = 'succeeded';
      state.childAreasByParent[key] = data.areas;
      if (!state.childAreasByParent[parent] || state.childAreasByParent[parent].length === 0) {
        state.childAreasByParent[parent] = data.areas;
      }
    });
    builder.addCase(fetchChildAreasThunk.rejected, (state, action) => {
      const parent = action.meta.arg.parent;
      const key = action.meta.arg.level_name ? `${parent}_${action.meta.arg.level_name}` : parent;
      state.childAreasStatus[parent] = 'failed';
      state.childAreasStatus[key] = 'failed';
    });

    // Grievance Options
    builder.addCase(fetchGrievanceOptionsThunk.pending, (state) => {
      state.grievanceOptionsStatus = 'loading';
      state.grievanceOptionsError = null;
    });
    builder.addCase(
      fetchGrievanceOptionsThunk.fulfilled,
      (state, action: PayloadAction<GrievanceOptionsData>) => {
        state.grievanceOptionsStatus = 'succeeded';
        state.grievanceOptions = action.payload;
      }
    );
    builder.addCase(fetchGrievanceOptionsThunk.rejected, (state, action) => {
      state.grievanceOptionsStatus = 'failed';
      state.grievanceOptionsError = action.payload ?? 'Error loading grievance options';
    });

    // Matchers must be added AFTER all addCase calls in Redux Toolkit
    // User Preferred Language from auth/me or login (matched by action type to preserve feature isolation)
    builder.addMatcher(
      (action): action is PayloadAction<{ preferred_language?: string }> =>
        action.type === 'auth/getMe/fulfilled' || action.type === 'auth/login/fulfilled',
      (state, action) => {
        if (action.payload?.preferred_language) {
          state.selectedLanguage = action.payload.preferred_language;
        }
      }
    );
  },
});

export const { clearMetadataErrors, setSelectedLanguage } = metadataSlice.actions;
export const metadataReducer = metadataSlice.reducer;

// --- Selectors ---

export const selectSelectedLanguage = (state: RootState): string =>
  state.metadata.selectedLanguage || 'en';

/** Normalizes backend submitter type string to internal key if needed */
export function normalizeSubmitterType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('farmer') || lower === 'ind' || lower === 'individual') return 'individual';
  if (lower.includes('coop') || lower.includes('fpo') || lower === 'cooperative') return 'cooperative';
  if (lower.includes('ngo')) return 'ngo';
  if (lower.includes('woreda') || lower.includes('kebele') || lower.includes('body')) return 'woreda_kebele';
  if (lower.includes('development') || lower.includes('agent') || lower === 'da') return 'development_agent';
  return raw;
}

/** Normalizes backend submission channel string to internal key if needed */
export function normalizeSubmissionChannel(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower === 'web' || lower.includes('web')) return 'web';
  if (lower === 'app' || lower.includes('mobile app') || lower === 'mobile') return 'mobile';
  if (lower.includes('mobile call') || lower === 'call' || (lower.includes('call') && !lower.includes('ivr'))) return 'call';
  if (lower.includes('ivr') || lower.includes('helpline')) return 'ivr';
  if (lower.includes('officer') || lower.includes('assisted') || lower.includes('da') || lower.includes('development')) return 'field_officer';
  return lower.replace(/\s+/g, '_');
}

export const selectSubmitterTypeOptions = (state: RootState): Array<{ value: string; label: string }> => {
  const backendTypes = state.metadata.submitterOptions?.submitter_types;
  if (backendTypes && backendTypes.length > 0) {
    return backendTypes.map((t) => ({
      value: normalizeSubmitterType(t.type_name || t.code),
      label: t.type_name,
    }));
  }
  return [];
};

export const selectPreferredLanguageOptions = (
  state: RootState
): Array<{ code: string; label: string; flag: string; flagUrl: string }> => {
  const backendLangs = state.metadata.submitterOptions?.preferred_languages;
  if (backendLangs && backendLangs.length > 0) {
    const flagMap: Record<string, string> = {
      en: '🇺🇸',
      am: '🇪🇹',
      om: '🇪🇹',
      ti: '🇪🇹',
      so: '🇸🇴',
      ar: '🇸🇦',
    };
    const flagUrlMap: Record<string, string> = {
      en: '/images/flags/us.svg',
      am: '/images/flags/et.svg',
      om: '/images/flags/et.svg',
      ti: '/images/flags/et.svg',
      so: '/images/flags/et.svg',
      ar: '/images/flags/et.svg',
    };
    return backendLangs.map((lang) => {
      const codeLower = lang.code.toLowerCase();
      return {
        code: lang.code,
        label: lang.label,
        flag: flagMap[codeLower] || '🌐',
        flagUrl: flagUrlMap[codeLower] || '/images/flags/et.svg',
      };
    });
  }
  return [];
};

export const selectSubmissionChannelOptions = (state: RootState): Array<{ value: string; label: string }> => {
  const backendChannels =
    state.metadata.submitterOptions?.submission_types ??
    state.metadata.grievanceOptions?.submission_channels;

  if (backendChannels && backendChannels.length > 0) {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];

    for (const c of backendChannels) {
      const name = typeof c === 'string' ? c : c.type_name;
      const code = typeof c === 'object' && c.code ? c.code : undefined;
      const baseVal = normalizeSubmissionChannel(code || name);
      let val = baseVal;
      let counter = 1;
      while (seen.has(val)) {
        val = `${baseVal}_${counter++}`;
      }
      seen.add(val);
      options.push({
        value: val,
        label: name,
      });
    }
    return options;
  }
  return [];
};

export const selectServiceCategoryOptions = (state: RootState): Array<{ value: string; label: string }> => {
  const backendCategories =
    state.metadata.submitterOptions?.service_categories ??
    state.metadata.grievanceOptions?.service_categories;

  if (backendCategories && backendCategories.length > 0) {
    return backendCategories.map((c) => ({
      value: c.category_name.toLowerCase(),
      label: c.category_name,
    }));
  }
  return [];
};

export const selectGrievanceTypeOptions = (
  state: RootState,
  selectedCategory?: string
): Array<{ value: string; label: string }> => {
  const backendTypes =
    state.metadata.submitterOptions?.grievance_types ??
    state.metadata.grievanceOptions?.grievance_types;

  if (backendTypes && backendTypes.length > 0) {
    let filtered = backendTypes;
    if (selectedCategory) {
      const matchCat = selectedCategory.toLowerCase();
      filtered = backendTypes.filter(
        (t) => t.service_category.toLowerCase() === matchCat
      );
    }
    return filtered.map((t) => ({
      value: t.type_name,
      label: t.type_name,
    }));
  }

  return [];
};

export const selectRegionOptions = (state: RootState): Array<{ value: string; label: string }> => {
  if (state.metadata.regions.length > 0) {
    return state.metadata.regions.map((r) => ({
      value: r.area_name,
      label: r.area_name,
    }));
  }
  return [];
};

export const selectChildAreaOptions = (
  state: RootState,
  parentId?: string
): Array<{ value: string; label: string }> => {
  if (!parentId) return [];
  const children = state.metadata.childAreasByParent[parentId];
  if (children && children.length > 0) {
    return children.map((a) => ({
      value: a.area_name,
      label: a.area_name,
    }));
  }
  return [];
};

export const selectZoneOptions = (
  state: RootState,
  regionValue?: string
): Array<{ value: string; label: string }> => {
  if (!regionValue) return [];

  const normalizedRegion = regionValue.toLowerCase().trim();
  const regionNode = state.metadata.regions.find(
    (r) =>
      r.area_id.toLowerCase() === normalizedRegion ||
      r.area_name.toLowerCase() === normalizedRegion ||
      (r.code && r.code.toLowerCase() === normalizedRegion) ||
      (r.path_code && r.path_code.toLowerCase() === normalizedRegion)
  );

  const parentKey = regionNode?.area_id || regionValue;
  const childAreas =
    state.metadata.childAreasByParent[`${parentKey}_Zone`] ||
    state.metadata.childAreasByParent[parentKey] ||
    (regionNode?.path_code ? state.metadata.childAreasByParent[`${regionNode.path_code}_Zone`] : undefined) ||
    (regionNode?.path_code ? state.metadata.childAreasByParent[regionNode.path_code] : undefined);

  if (childAreas && childAreas.length > 0) {
    return childAreas
      .filter((a) => !a.level_name || a.level_name === 'Zone')
      .map((a) => ({
        value: a.area_name,
        label: a.area_name,
      }));
  }

  return [];
};

export const selectZoneStatus = (
  state: RootState,
  regionValue?: string
): 'idle' | 'loading' | 'succeeded' | 'failed' => {
  if (!regionValue) return 'idle';
  const regionNode = state.metadata.regions.find(
    (r) =>
      r.area_id.toLowerCase() === regionValue.toLowerCase() ||
      r.area_name.toLowerCase() === regionValue.toLowerCase()
  );
  const parentKey = regionNode?.area_id || regionValue;
  return (
    state.metadata.childAreasStatus[`${parentKey}_Zone`] ||
    state.metadata.childAreasStatus[parentKey] ||
    'idle'
  );
};

export function findZoneNode(
  state: RootState,
  zoneValue?: string,
  regionValue?: string
): AdministrativeArea | undefined {
  if (!zoneValue) return undefined;
  const normZone = zoneValue.toLowerCase().trim();

  if (regionValue) {
    const normRegion = regionValue.toLowerCase().trim();
    const regionNode = state.metadata.regions.find(
      (r) =>
        r.area_id.toLowerCase() === normRegion ||
        r.area_name.toLowerCase() === normRegion ||
        (r.code && r.code.toLowerCase() === normRegion) ||
        (r.path_code && r.path_code.toLowerCase() === normRegion)
    );
    const parentKey = regionNode?.area_id || regionValue;
    const regionChildren =
      state.metadata.childAreasByParent[`${parentKey}_Zone`] ||
      state.metadata.childAreasByParent[parentKey] ||
      (regionNode?.path_code ? state.metadata.childAreasByParent[regionNode.path_code] : undefined);
    const found = regionChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normZone ||
        a.area_id.toLowerCase() === normZone ||
        (a.code && a.code.toLowerCase() === normZone)
    );
    if (found) return found;
  }

  for (const childList of Object.values(state.metadata.childAreasByParent)) {
    const found = childList.find(
      (a) =>
        a.area_name.toLowerCase() === normZone ||
        a.area_id.toLowerCase() === normZone ||
        (a.code && a.code.toLowerCase() === normZone)
    );
    if (found) return found;
  }

  return undefined;
}

export const selectWoredaOptions = (
  state: RootState,
  zoneValue?: string,
  regionValue?: string
): Array<{ value: string; label: string }> => {
  let childAreas: AdministrativeArea[] | undefined;

  if (zoneValue) {
    const zoneNode = findZoneNode(state, zoneValue, regionValue);
    const parentKey = zoneNode?.area_id || zoneValue;
    childAreas =
      state.metadata.childAreasByParent[`${parentKey}_Woreda`] ||
      state.metadata.childAreasByParent[parentKey] ||
      (zoneNode?.path_code ? state.metadata.childAreasByParent[`${zoneNode.path_code}_Woreda`] : undefined) ||
      (zoneNode?.path_code ? state.metadata.childAreasByParent[zoneNode.path_code] : undefined);
  }

  if ((!childAreas || childAreas.length === 0) && regionValue) {
    const normalizedRegion = regionValue.toLowerCase().trim();
    const regionNode = state.metadata.regions.find(
      (r) =>
        r.area_id.toLowerCase() === normalizedRegion ||
        r.area_name.toLowerCase() === normalizedRegion ||
        (r.code && r.code.toLowerCase() === normalizedRegion) ||
        (r.path_code && r.path_code.toLowerCase() === normalizedRegion)
    );
    const parentKey = regionNode?.area_id || regionValue;
    childAreas =
      state.metadata.childAreasByParent[`${parentKey}_Woreda`] ||
      state.metadata.childAreasByParent[parentKey];
  }

  if (childAreas && childAreas.length > 0) {
    return childAreas
      .filter((a) => !a.level_name || a.level_name === 'Woreda')
      .map((a) => ({
        value: a.area_name,
        label: a.area_name,
      }));
  }

  return [];
};

export const selectWoredaStatus = (
  state: RootState,
  zoneValue?: string,
  regionValue?: string
): 'idle' | 'loading' | 'succeeded' | 'failed' => {
  if (zoneValue) {
    const zoneNode = findZoneNode(state, zoneValue, regionValue);
    const parentKey = zoneNode?.area_id || zoneValue;
    return (
      state.metadata.childAreasStatus[`${parentKey}_Woreda`] ||
      state.metadata.childAreasStatus[parentKey] ||
      'idle'
    );
  }
  if (regionValue) {
    const regionNode = state.metadata.regions.find(
      (r) =>
        r.area_id.toLowerCase() === regionValue.toLowerCase() ||
        r.area_name.toLowerCase() === regionValue.toLowerCase()
    );
    const parentKey = regionNode?.area_id || regionValue;
    return (
      state.metadata.childAreasStatus[`${parentKey}_Woreda`] ||
      state.metadata.childAreasStatus[parentKey] ||
      'idle'
    );
  }
  return 'idle';
};

export function findWoredaNode(
  state: RootState,
  woredaValue?: string,
  zoneValue?: string,
  regionValue?: string
): AdministrativeArea | undefined {
  if (!woredaValue) return undefined;
  const normWoreda = woredaValue.toLowerCase().trim();

  if (zoneValue) {
    const zoneNode = findZoneNode(state, zoneValue, regionValue);
    const parentKey = zoneNode?.area_id || zoneValue;
    const zoneChildren =
      state.metadata.childAreasByParent[`${parentKey}_Woreda`] ||
      state.metadata.childAreasByParent[parentKey];
    const found = zoneChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda)
    );
    if (found) return found;
  }

  if (regionValue) {
    const normalizedRegion = regionValue.toLowerCase().trim();
    const regionNode = state.metadata.regions.find(
      (r) =>
        r.area_id.toLowerCase() === normalizedRegion ||
        r.area_name.toLowerCase() === normalizedRegion
    );
    const parentKey = regionNode?.area_id || regionValue;
    const regionChildren =
      state.metadata.childAreasByParent[`${parentKey}_Woreda`] ||
      state.metadata.childAreasByParent[parentKey];
    const found = regionChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda)
    );
    if (found) return found;
  }

  for (const childList of Object.values(state.metadata.childAreasByParent)) {
    const found = childList.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda)
    );
    if (found) return found;
  }

  return undefined;
}

export const selectKebeleOptions = (
  state: RootState,
  woredaValue?: string,
  zoneValue?: string,
  regionValue?: string
): Array<{ value: string; label: string }> => {
  if (!woredaValue) return [];

  const woredaNode = findWoredaNode(state, woredaValue, zoneValue, regionValue);
  const parentKey = woredaNode?.area_id || woredaValue;
  const childAreas =
    state.metadata.childAreasByParent[`${parentKey}_Kebele`] ||
    state.metadata.childAreasByParent[parentKey] ||
    (woredaNode?.path_code ? state.metadata.childAreasByParent[`${woredaNode.path_code}_Kebele`] : undefined) ||
    (woredaNode?.path_code ? state.metadata.childAreasByParent[woredaNode.path_code] : undefined);

  if (childAreas && childAreas.length > 0) {
    return childAreas
      .filter((a) => !a.level_name || a.level_name === 'Kebele')
      .map((a) => ({
        value: a.area_name,
        label: a.area_name,
      }));
  }

  return [];
};

export const selectKebeleStatus = (
  state: RootState,
  woredaValue?: string,
  zoneValue?: string,
  regionValue?: string
): 'idle' | 'loading' | 'succeeded' | 'failed' => {
  if (!woredaValue) return 'idle';
  const woredaNode = findWoredaNode(state, woredaValue, zoneValue, regionValue);
  const parentKey = woredaNode?.area_id || woredaValue;
  return (
    state.metadata.childAreasStatus[`${parentKey}_Kebele`] ||
    state.metadata.childAreasStatus[parentKey] ||
    'idle'
  );
};

/**
 * Filter option lists for the grievance list screen.
 *
 * `value` is what the list API (`GET /api/v1/grievances`) expects for the matching query
 * parameter; `label` is what the user sees. The two differ for statuses, whose display
 * labels are translated server-side. The "All" pseudo-option is added by the dropdown
 * itself rather than living in the data.
 *
 * Memoized with `createSelector` so the array identity stays stable across renders.
 */
export const selectStatusFilterOptions = createSelector(
  [(state: RootState) => state.metadata.grievanceOptions?.statuses],
  (statuses): Array<{ value: string; label: string }> =>
    (statuses ?? []).map((s) => ({ value: s.status, label: s.label || s.status }))
);

export const selectCategoryFilterOptions = createSelector(
  [
    (state: RootState) =>
      state.metadata.submitterOptions?.service_categories ??
      state.metadata.grievanceOptions?.service_categories,
  ],
  (categories): Array<{ value: string; label: string }> =>
    (categories ?? []).map((c) => ({ value: c.category_name, label: c.category_name }))
);

export const selectRegionFilterOptions = createSelector(
  [(state: RootState) => state.metadata.regions],
  (regions): Array<{ value: string; label: string }> =>
    regions.map((r) => ({ value: r.area_name, label: r.area_name }))
);
