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

/**
 * The only part of the store these selectors read. Typing them against this
 * instead of the whole `RootState` lets a caller holding just the metadata
 * slice pass `{ metadata }` without an `as RootState` cast — a cast that would
 * hide a selector later reaching into another slice. A full `RootState` still
 * satisfies it, so `useSelector(selectX)` call sites are unaffected.
 */
export type MetadataRootState = Pick<RootState, 'metadata'>;

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

export const selectSelectedLanguage = (state: MetadataRootState): string =>
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

export const selectSubmitterTypeOptions = (state: MetadataRootState): Array<{ value: string; label: string }> => {
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
  state: MetadataRootState
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

export const selectSubmissionChannelOptions = (state: MetadataRootState): Array<{ value: string; label: string }> => {
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

export const selectServiceCategoryOptions = (state: MetadataRootState): Array<{ value: string; label: string }> => {
  const backendCategories =
    state.metadata.submitterOptions?.service_categories ??
    state.metadata.grievanceOptions?.service_categories;

  if (backendCategories && backendCategories.length > 0) {
    return backendCategories.map((c) => ({
      value: c.category_name,
      label: c.category_name,
    }));
  }
  return [];
};

export const selectGrievanceTypeOptions = (
  state: MetadataRootState,
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
    // Unlike submission channel/submitter type/service category (each of
    // those doctypes autonames on its own display field, so the name IS the
    // label), Grievance Type autonames "format:GTYPE-{#####}" — its `name`
    // is a generated id, never the type_name. Sending the display text as
    // `grievance_type` (a Link field to Grievance Type) makes the backend
    // 404 with "Could not find Grievance Type: <label>" the moment a draft
    // is saved or the case is submitted, since Frappe validates a Link
    // field's value against the target doctype's actual `name`, not any of
    // its other fields.
    return filtered.map((t) => ({
      value: t.grievance_type_id,
      label: t.type_name,
    }));
  }

  return [];
};

export const selectRegionOptions = (state: MetadataRootState): Array<{ value: string; label: string }> => {
  if (state.metadata.regions.length > 0) {
    return state.metadata.regions.map((r) => ({
      value: r.area_name,
      label: r.area_name,
    }));
  }
  return [];
};

export const selectChildAreaOptions = (
  state: MetadataRootState,
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
  state: MetadataRootState,
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
  state: MetadataRootState,
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
  state: MetadataRootState,
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
  state: MetadataRootState,
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
  state: MetadataRootState,
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
  state: MetadataRootState,
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

function kebeleChildren(
  state: MetadataRootState,
  woredaNode: AdministrativeArea | undefined,
  woredaValue: string
): AdministrativeArea[] | undefined {
  const parentKey = woredaNode?.area_id || woredaValue;
  return (
    state.metadata.childAreasByParent[`${parentKey}_Kebele`] ||
    state.metadata.childAreasByParent[parentKey] ||
    (woredaNode?.path_code ? state.metadata.childAreasByParent[`${woredaNode.path_code}_Kebele`] : undefined) ||
    (woredaNode?.path_code ? state.metadata.childAreasByParent[woredaNode.path_code] : undefined)
  );
}

/**
 * Memoized with `createSelector` on just the `metadata` slice (rather than the
 * whole `RootState`, which is a fresh object on every dispatch) so an unrelated
 * store update doesn't hand the kebele dropdown a new array reference.
 */
export const selectKebeleOptions = createSelector(
  [
    (state: MetadataRootState) => state.metadata,
    (_state: MetadataRootState, woredaValue?: string) => woredaValue,
    (_state: MetadataRootState, _woredaValue?: string, zoneValue?: string) => zoneValue,
    (_state: MetadataRootState, _woredaValue?: string, _zoneValue?: string, regionValue?: string) => regionValue,
  ],
  (metadata, woredaValue, zoneValue, regionValue): Array<{ value: string; label: string }> => {
    if (!woredaValue) return [];

    const state = { metadata };
    const woredaNode = findWoredaNode(state, woredaValue, zoneValue, regionValue);
    const childAreas = kebeleChildren(state, woredaNode, woredaValue);

    if (childAreas && childAreas.length > 0) {
      return childAreas
        .filter((a) => !a.level_name || a.level_name === 'Kebele')
        .map((a) => ({
          value: a.area_name,
          label: a.area_name,
        }));
    }

    return [];
  }
);

/**
 * The administrative area a grievance is filed against: the chosen kebele if
 * there is one, otherwise the woreda. Those are the only two levels the
 * backend accepts (`ALLOWED_FILING_LEVELS` in oan_grievance_service's
 * identity.py); a region or zone is rejected.
 *
 * The wizard's dropdowns hold display names, but kebele names repeat across
 * woredas (over a hundred are just "1" or "2"), which is why the backend
 * refuses to resolve an area by name. The kebele is therefore looked up only
 * among the chosen woreda's own children, and the caller sends the returned
 * node's `area_id` rather than any name.
 *
 * Returns undefined when the woreda hasn't been resolved to a node yet.
 */
export function findFilingArea(
  state: MetadataRootState,
  selection: { region?: string; zone?: string; woreda?: string; kebele?: string }
): AdministrativeArea | undefined {
  const { region, zone, woreda, kebele } = selection;
  if (!woreda) return undefined;

  const woredaNode = findWoredaNode(state, woreda, zone, region);
  if (!woredaNode) return undefined;
  if (!kebele) return woredaNode;

  const normKebele = kebele.toLowerCase().trim();
  const kebeleNode = kebeleChildren(state, woredaNode, woreda)?.find(
    (a) => (!a.level_name || a.level_name === 'Kebele') && a.area_name.toLowerCase() === normKebele
  );
  return kebeleNode ?? woredaNode;
}

export const selectKebeleStatus = (
  state: MetadataRootState,
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

export function findKebeleNode(
  state: MetadataRootState,
  kebeleValue?: string,
  woredaValue?: string,
  zoneValue?: string,
  regionValue?: string
): AdministrativeArea | undefined {
  if (!kebeleValue) return undefined;
  const normKebele = kebeleValue.toLowerCase().trim();

  if (woredaValue) {
    const woredaNode = findWoredaNode(state, woredaValue, zoneValue, regionValue);
    const parentKey = woredaNode?.area_id || woredaValue;
    const kebeleChildren =
      state.metadata.childAreasByParent[`${parentKey}_Kebele`] ||
      state.metadata.childAreasByParent[parentKey] ||
      (woredaNode?.path_code ? state.metadata.childAreasByParent[`${woredaNode.path_code}_Kebele`] : undefined) ||
      (woredaNode?.path_code ? state.metadata.childAreasByParent[woredaNode.path_code] : undefined);
    const found = kebeleChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normKebele ||
        a.area_id.toLowerCase() === normKebele ||
        (a.code && a.code.toLowerCase() === normKebele) ||
        (a.path_code && a.path_code.toLowerCase() === normKebele)
    );
    if (found) return found;
  }

  for (const childList of Object.values(state.metadata.childAreasByParent)) {
    const found = childList.find(
      (a) =>
        a.area_name.toLowerCase() === normKebele ||
        a.area_id.toLowerCase() === normKebele ||
        (a.code && a.code.toLowerCase() === normKebele) ||
        (a.path_code && a.path_code.toLowerCase() === normKebele)
    );
    if (found) return found;
  }

  return undefined;
}

export function resolveAdministrativeAreaId(
  state: MetadataRootState,
  kebele?: string,
  woreda?: string,
  zone?: string,
  region?: string
): string | undefined {
  if (kebele) {
    const kebeleNode = findKebeleNode(state, kebele, woreda, zone, region);
    if (kebeleNode?.area_id || kebeleNode?.path_code) {
      return kebeleNode.area_id || kebeleNode.path_code;
    }
  }
  if (woreda) {
    const woredaNode = findWoredaNode(state, woreda, zone, region);
    if (woredaNode?.area_id || woredaNode?.path_code) {
      return woredaNode.area_id || woredaNode.path_code;
    }
  }
  if (zone) {
    const zoneNode = findZoneNode(state, zone, region);
    if (zoneNode?.area_id || zoneNode?.path_code) {
      return zoneNode.area_id || zoneNode.path_code;
    }
  }
  if (region) {
    const normRegion = region.toLowerCase().trim();
    const regionNode = state.metadata.regions.find(
      (r) =>
        r.area_name.toLowerCase() === normRegion ||
        r.area_id.toLowerCase() === normRegion ||
        (r.code && r.code.toLowerCase() === normRegion) ||
        (r.path_code && r.path_code.toLowerCase() === normRegion)
    );
    if (regionNode?.area_id || regionNode?.path_code) {
      return regionNode.area_id || regionNode.path_code;
    }
  }
  return undefined;
}

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
  [(state: MetadataRootState) => state.metadata.grievanceOptions?.statuses],
  (statuses): Array<{ value: string; label: string }> =>
    (statuses ?? []).map((s) => ({ value: s.status, label: s.label || s.status }))
);

export const selectCategoryFilterOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.service_categories ??
      state.metadata.grievanceOptions?.service_categories,
  ],
  (categories): Array<{ value: string; label: string }> =>
    (categories ?? []).map((c) => ({ value: c.category_name, label: c.category_name }))
);

export const selectRegionFilterOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.regions],
  (regions): Array<{ value: string; label: string }> =>
    regions.map((r) => ({ value: r.area_name, label: r.area_name }))
);
