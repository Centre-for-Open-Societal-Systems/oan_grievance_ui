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

  woredas: AdministrativeArea[];
  woredasStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  woredasError: string | null;

  kebeles: AdministrativeArea[];
  kebelesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  kebelesError: string | null;

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

  woredas: [],
  woredasStatus: 'idle',
  woredasError: null,

  kebeles: [],
  kebelesStatus: 'idle',
  kebelesError: null,

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

export const fetchWoredasThunk = createAsyncThunk<
  AdministrativeAreasData,
  { parent?: string } | void,
  { rejectValue: string }
>('metadata/fetchWoredas', async (params, { rejectWithValue }) => {
  try {
    return await fetchAdministrativeAreas({
      level_name: 'Woreda',
      parent: params?.parent,
      limit: 1000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch woredas';
    return rejectWithValue(msg);
  }
});

export const fetchKebelesThunk = createAsyncThunk<
  AdministrativeAreasData,
  { parent?: string } | void,
  { rejectValue: string }
>('metadata/fetchKebeles', async (params, { rejectWithValue }) => {
  try {
    return await fetchAdministrativeAreas({
      level_name: 'Kebele',
      parent: params?.parent,
      limit: 1000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch kebeles';
    return rejectWithValue(msg);
  }
});

export const fetchChildAreasThunk = createAsyncThunk<
  {
    key: string;
    parent: string | string[];
    parentKeys: string[];
    level_name?: string;
    data: AdministrativeAreasData;
  },
  AdministrativeAreasQueryParams & { parent: string | string[] },
  { rejectValue: string }
>('metadata/fetchChildAreas', async (params, { rejectWithValue }) => {
  try {
    const data = await fetchAdministrativeAreas(params);
    const parentList = Array.isArray(params.parent)
      ? params.parent.filter(Boolean).map(String)
      : params.parent
      ? String(params.parent)
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    const parentStr = Array.isArray(params.parent) ? params.parent.join(',') : String(params.parent);
    const key = params.level_name ? `${parentStr}_${params.level_name}` : parentStr;
    return { key, parent: params.parent, parentKeys: parentList, level_name: params.level_name, data };
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
      state.woredasError = null;
      state.kebelesError = null;
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

    // Woredas
    builder.addCase(fetchWoredasThunk.pending, (state) => {
      state.woredasStatus = 'loading';
      state.woredasError = null;
    });
    builder.addCase(
      fetchWoredasThunk.fulfilled,
      (state, action: PayloadAction<AdministrativeAreasData>) => {
        state.woredasStatus = 'succeeded';
        state.woredas = action.payload.areas;
      }
    );
    builder.addCase(fetchWoredasThunk.rejected, (state, action) => {
      state.woredasStatus = 'failed';
      state.woredasError = action.payload ?? 'Error loading woredas';
    });

    // Kebeles
    builder.addCase(fetchKebelesThunk.pending, (state) => {
      state.kebelesStatus = 'loading';
      state.kebelesError = null;
    });
    builder.addCase(
      fetchKebelesThunk.fulfilled,
      (state, action: PayloadAction<AdministrativeAreasData>) => {
        state.kebelesStatus = 'succeeded';
        state.kebeles = action.payload.areas;
      }
    );
    builder.addCase(fetchKebelesThunk.rejected, (state, action) => {
      state.kebelesStatus = 'failed';
      state.kebelesError = action.payload ?? 'Error loading kebeles';
    });

    // Child Areas
    builder.addCase(fetchChildAreasThunk.pending, (state, action) => {
      const parent = action.meta.arg.parent;
      const parentList = Array.isArray(parent)
        ? parent
        : typeof parent === 'string' && parent.includes(',')
        ? parent.split(',').map((p) => p.trim())
        : [parent];
      const parentStr = Array.isArray(parent) ? parent.join(',') : String(parent);
      const levelName = action.meta.arg.level_name;
      const key = levelName ? `${parentStr}_${levelName}` : parentStr;

      state.childAreasStatus[parentStr] = 'loading';
      state.childAreasStatus[key] = 'loading';
      for (const p of parentList) {
        state.childAreasStatus[p] = 'loading';
        if (levelName) {
          state.childAreasStatus[`${p}_${levelName}`] = 'loading';
        }
      }
    });
    builder.addCase(fetchChildAreasThunk.fulfilled, (state, action) => {
      const { key, parent, parentKeys, level_name, data } = action.payload;
      const parentStr = Array.isArray(parent) ? parent.join(',') : String(parent);
      const areas = data.areas || [];

      state.childAreasStatus[parentStr] = 'succeeded';
      state.childAreasStatus[key] = 'succeeded';
      for (const p of parentKeys) {
        state.childAreasStatus[p] = 'succeeded';
        if (level_name) {
          state.childAreasStatus[`${p}_${level_name}`] = 'succeeded';
        }
      }

      // 1. Store under composite key and parent string
      state.childAreasByParent[key] = areas;
      state.childAreasByParent[parentStr] = areas;

      // 2. If data returned a parent in response (e.g. data.parent: "zone-ET1401" or ["zone-ET1401"])
      if (data.parent) {
        const respParents = Array.isArray(data.parent) ? data.parent : [data.parent];
        for (const rp of respParents) {
          state.childAreasStatus[rp] = 'succeeded';
          state.childAreasByParent[rp] = areas;
          if (level_name) {
            state.childAreasStatus[`${rp}_${level_name}`] = 'succeeded';
            state.childAreasByParent[`${rp}_${level_name}`] = areas;
          }
        }
      }

      // 3. Group and index by each area's parent_administrative_area
      const groupedByParent = new Map<string, AdministrativeArea[]>();
      for (const area of areas) {
        if (area.parent_administrative_area) {
          const list = groupedByParent.get(area.parent_administrative_area) || [];
          list.push(area);
          groupedByParent.set(area.parent_administrative_area, list);
        }
      }
      for (const [parentAreaId, childList] of groupedByParent.entries()) {
        state.childAreasStatus[parentAreaId] = 'succeeded';
        state.childAreasByParent[parentAreaId] = childList;
        if (level_name) {
          state.childAreasStatus[`${parentAreaId}_${level_name}`] = 'succeeded';
          state.childAreasByParent[`${parentAreaId}_${level_name}`] = childList;
        }
      }

      // 4. Also index by ancestor codes / path prefixes from area.path_code
      for (const area of areas) {
        if (area.path_code) {
          const parts = area.path_code.split('.');
          let runningPath = '';
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!part) continue;
            runningPath = runningPath ? `${runningPath}.${part}` : part;
            const lvl = area.level_name || level_name;

            // Index by path segment code (e.g. ET1401)
            const listByCode: AdministrativeArea[] = state.childAreasByParent[part] || [];
            if (!listByCode.some((a) => a.area_id === area.area_id)) {
              state.childAreasByParent[part] = [...listByCode, area];
            }
            if (lvl) {
              const listByCodeLvl: AdministrativeArea[] = state.childAreasByParent[`${part}_${lvl}`] || [];
              if (!listByCodeLvl.some((a) => a.area_id === area.area_id)) {
                state.childAreasByParent[`${part}_${lvl}`] = [...listByCodeLvl, area];
              }
            }

            // Index by running prefix path (e.g. ET.ET14.ET1401)
            const listByPath: AdministrativeArea[] = state.childAreasByParent[runningPath] || [];
            if (!listByPath.some((a) => a.area_id === area.area_id)) {
              state.childAreasByParent[runningPath] = [...listByPath, area];
            }
            if (lvl) {
              const listByPathLvl: AdministrativeArea[] = state.childAreasByParent[`${runningPath}_${lvl}`] || [];
              if (!listByPathLvl.some((a) => a.area_id === area.area_id)) {
                state.childAreasByParent[`${runningPath}_${lvl}`] = [...listByPathLvl, area];
              }
            }
          }
        }
      }

      // 5. Index aliases for known region nodes
      for (const p of parentKeys) {
        const normP = p.toLowerCase().trim();
        const regNode = state.regions.find(
          (r) =>
            r.area_id.toLowerCase() === normP ||
            r.area_name.toLowerCase() === normP ||
            (r.code && r.code.toLowerCase() === normP) ||
            (r.path_code && r.path_code.toLowerCase() === normP)
        );
        if (regNode) {
          const matchingAreas = parentKeys.length === 1 ? areas : areas.filter(
            (a) =>
              a.parent_administrative_area === regNode.area_id ||
              (regNode.code && a.path_code?.includes(regNode.code)) ||
              (regNode.path_code && a.path_code?.startsWith(regNode.path_code))
          );
          if (matchingAreas.length > 0) {
            const keysToSet = [regNode.area_name, regNode.area_id, regNode.code, regNode.path_code].filter(Boolean) as string[];
            for (const k of keysToSet) {
              state.childAreasByParent[k] = matchingAreas;
              if (level_name) {
                state.childAreasByParent[`${k}_${level_name}`] = matchingAreas;
              }
            }
          }
        }
      }
    });
    builder.addCase(fetchChildAreasThunk.rejected, (state, action) => {
      const parent = action.meta.arg.parent;
      const parentList = Array.isArray(parent)
        ? parent
        : typeof parent === 'string' && parent.includes(',')
        ? parent.split(',').map((p) => p.trim())
        : [parent];
      const parentStr = Array.isArray(parent) ? parent.join(',') : String(parent);
      const levelName = action.meta.arg.level_name;
      const key = levelName ? `${parentStr}_${levelName}` : parentStr;

      state.childAreasStatus[parentStr] = 'failed';
      state.childAreasStatus[key] = 'failed';
      for (const p of parentList) {
        state.childAreasStatus[p] = 'failed';
        if (levelName) {
          state.childAreasStatus[`${p}_${levelName}`] = 'failed';
        }
      }
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

export const selectSubmitterTypeOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.submitterOptions?.submitter_types],
  (backendTypes): Array<{ value: string; label: string }> => {
    if (backendTypes && backendTypes.length > 0) {
      return backendTypes.map((t) => ({
        value: normalizeSubmitterType(t.type_name || t.code),
        label: t.type_name,
      }));
    }
    return [];
  }
);

export const selectPreferredLanguageOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.submitterOptions?.preferred_languages],
  (backendLangs): Array<{ code: string; label: string; flag: string; flagUrl: string }> => {
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
  }
);

export const selectSubmissionChannelOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.submission_types ??
      state.metadata.grievanceOptions?.submission_channels,
  ],
  (backendChannels): Array<{ value: string; label: string }> => {
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
  }
);

export const selectServiceCategoryOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.service_categories ??
      state.metadata.grievanceOptions?.service_categories,
  ],
  (backendCategories): Array<{ value: string; label: string }> => {
    if (backendCategories && backendCategories.length > 0) {
      return backendCategories.map((c) => ({
        value: c.category_name,
        label: c.category_name,
      }));
    }
    return [];
  }
);

export const selectGrievanceTypeOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.grievance_types ??
      state.metadata.grievanceOptions?.grievance_types,
    (_state: MetadataRootState, selectedCategory?: string) => selectedCategory,
  ],
  (backendTypes, selectedCategory): Array<{ value: string; label: string }> => {
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
  }
);

export const selectRegionOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.regions],
  (regions): Array<{ value: string; label: string }> => {
    if (regions && regions.length > 0) {
      return regions.map((r) => ({
        value: r.area_name,
        label: r.area_name,
      }));
    }
    return [];
  }
);

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

function filterAreasByLevel(
  list: AdministrativeArea[] | undefined,
  level: string
): AdministrativeArea[] | undefined {
  if (!list || list.length === 0) return undefined;
  const filtered = list.filter((a) => !a.level_name || a.level_name === level);
  return filtered.length > 0 ? filtered : undefined;
}

export const selectZoneOptions = createSelector(
  [
    (state: MetadataRootState) => state.metadata,
    (_state: MetadataRootState, regionValue?: string) => regionValue,
  ],
  (metadata, regionValue): Array<{ value: string; label: string }> => {
    if (!regionValue) return [];

    const normalizedRegion = regionValue.toLowerCase().trim();
    const regionNode = metadata.regions.find(
      (r) =>
        r.area_id.toLowerCase() === normalizedRegion ||
        r.area_name.toLowerCase() === normalizedRegion ||
        (r.code && r.code.toLowerCase() === normalizedRegion) ||
        (r.path_code && r.path_code.toLowerCase() === normalizedRegion)
    );

    const parentKey = regionNode?.area_id || regionValue;
    const candidates = [
      metadata.childAreasByParent[`${parentKey}_Zone`],
      metadata.childAreasByParent[`${regionNode?.path_code}_Zone`],
      metadata.childAreasByParent[`${regionNode?.code}_Zone`],
      metadata.childAreasByParent[`${regionNode?.area_name}_Zone`],
      metadata.childAreasByParent[`${regionValue}_Zone`],
      metadata.childAreasByParent[parentKey],
      regionNode?.path_code ? metadata.childAreasByParent[regionNode.path_code] : undefined,
      regionNode?.code ? metadata.childAreasByParent[regionNode.code] : undefined,
      regionNode?.area_name ? metadata.childAreasByParent[regionNode.area_name] : undefined,
      metadata.childAreasByParent[regionValue],
    ];

    let childAreas: AdministrativeArea[] | undefined;
    for (const c of candidates) {
      const match = filterAreasByLevel(c, 'Zone');
      if (match) {
        childAreas = match;
        break;
      }
    }

    if (!childAreas || childAreas.length === 0) {
      const matched: AdministrativeArea[] = [];
      for (const list of Object.values(metadata.childAreasByParent)) {
        for (const a of list) {
          if (
            (!a.level_name || a.level_name === 'Zone') &&
            (a.parent_administrative_area === parentKey ||
              (regionNode && a.parent_administrative_area === regionNode.area_id) ||
              (regionNode?.code && a.path_code?.includes(regionNode.code)) ||
              (regionNode?.path_code && a.path_code?.startsWith(regionNode.path_code)) ||
              a.parent_administrative_area?.toLowerCase() === normalizedRegion)
          ) {
            if (!matched.some((m) => m.area_id === a.area_id)) {
              matched.push(a);
            }
          }
        }
      }
      if (matched.length > 0) {
        childAreas = matched;
      }
    }

    if (childAreas && childAreas.length > 0) {
      const seen = new Set<string>();
      const result: Array<{ value: string; label: string }> = [];
      for (const a of childAreas) {
        if (!seen.has(a.area_name)) {
          seen.add(a.area_name);
          result.push({ value: a.area_name, label: a.area_name });
        }
      }
      return result;
    }

    return [];
  }
);

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
    state.metadata.childAreasStatus[`${regionValue}_Zone`] ||
    state.metadata.childAreasStatus[regionValue] ||
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
      (regionNode?.path_code ? state.metadata.childAreasByParent[`${regionNode.path_code}_Zone`] : undefined) ||
      (regionNode?.path_code ? state.metadata.childAreasByParent[regionNode.path_code] : undefined) ||
      (regionNode?.code ? state.metadata.childAreasByParent[`${regionNode.code}_Zone`] : undefined) ||
      (regionNode?.code ? state.metadata.childAreasByParent[regionNode.code] : undefined) ||
      (regionNode?.area_name ? state.metadata.childAreasByParent[`${regionNode.area_name}_Zone`] : undefined) ||
      (regionNode?.area_name ? state.metadata.childAreasByParent[regionNode.area_name] : undefined);
    const found = regionChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normZone ||
        a.area_id.toLowerCase() === normZone ||
        (a.code && a.code.toLowerCase() === normZone) ||
        (a.path_code && a.path_code.toLowerCase() === normZone)
    );
    if (found) return found;
  }

  for (const childList of Object.values(state.metadata.childAreasByParent)) {
    const found = childList.find(
      (a) =>
        a.area_name.toLowerCase() === normZone ||
        a.area_id.toLowerCase() === normZone ||
        (a.code && a.code.toLowerCase() === normZone) ||
        (a.path_code && a.path_code.toLowerCase() === normZone)
    );
    if (found) return found;
  }

  return undefined;
}

export const selectWoredaOptions = createSelector(
  [
    (state: MetadataRootState) => state.metadata,
    (_state: MetadataRootState, zoneValue?: string) => zoneValue,
    (_state: MetadataRootState, _zoneValue?: string, regionValue?: string) => regionValue,
  ],
  (metadata, zoneValue, regionValue): Array<{ value: string; label: string }> => {
    let childAreas: AdministrativeArea[] | undefined;
    const state = { metadata };

    if (zoneValue) {
      const zoneNode = findZoneNode(state, zoneValue, regionValue);
      const parentKey = zoneNode?.area_id || zoneValue;
      const candidates = [
        metadata.childAreasByParent[`${parentKey}_Woreda`],
        metadata.childAreasByParent[`${zoneNode?.path_code}_Woreda`],
        metadata.childAreasByParent[`${zoneNode?.code}_Woreda`],
        metadata.childAreasByParent[`${zoneNode?.area_name}_Woreda`],
        metadata.childAreasByParent[`${zoneValue}_Woreda`],
        metadata.childAreasByParent[parentKey],
        zoneNode?.path_code ? metadata.childAreasByParent[zoneNode.path_code] : undefined,
        zoneNode?.code ? metadata.childAreasByParent[zoneNode.code] : undefined,
        zoneNode?.area_name ? metadata.childAreasByParent[zoneNode.area_name] : undefined,
        metadata.childAreasByParent[zoneValue],
      ];

      for (const c of candidates) {
        const match = filterAreasByLevel(c, 'Woreda');
        if (match) {
          childAreas = match;
          break;
        }
      }

      if (!childAreas || childAreas.length === 0) {
        const normZone = zoneValue.toLowerCase().trim();
        const matched: AdministrativeArea[] = [];
        for (const list of Object.values(metadata.childAreasByParent)) {
          for (const a of list) {
            if (
              (!a.level_name || a.level_name === 'Woreda') &&
              (a.parent_administrative_area === parentKey ||
                (zoneNode && a.parent_administrative_area === zoneNode.area_id) ||
                (zoneNode?.code && a.path_code?.includes(zoneNode.code)) ||
                (zoneNode?.path_code && a.path_code?.startsWith(zoneNode.path_code)) ||
                a.parent_administrative_area?.toLowerCase() === normZone)
            ) {
              if (!matched.some((m) => m.area_id === a.area_id)) {
                matched.push(a);
              }
            }
          }
        }
        if (matched.length > 0) {
          childAreas = matched;
        }
      }
    }

    if ((!childAreas || childAreas.length === 0) && regionValue) {
      const normalizedRegion = regionValue.toLowerCase().trim();
      const regionNode = metadata.regions.find(
        (r) =>
          r.area_id.toLowerCase() === normalizedRegion ||
          r.area_name.toLowerCase() === normalizedRegion ||
          (r.code && r.code.toLowerCase() === normalizedRegion) ||
          (r.path_code && r.path_code.toLowerCase() === normalizedRegion)
      );
      const parentKey = regionNode?.area_id || regionValue;
      const regionCandidates = [
        metadata.childAreasByParent[`${parentKey}_Woreda`],
        metadata.childAreasByParent[`${regionNode?.path_code}_Woreda`],
        metadata.childAreasByParent[`${regionNode?.code}_Woreda`],
        metadata.childAreasByParent[`${regionNode?.area_name}_Woreda`],
        metadata.childAreasByParent[`${regionValue}_Woreda`],
        metadata.childAreasByParent[parentKey],
        regionNode?.path_code ? metadata.childAreasByParent[regionNode.path_code] : undefined,
        regionNode?.code ? metadata.childAreasByParent[regionNode.code] : undefined,
        regionNode?.area_name ? metadata.childAreasByParent[regionNode.area_name] : undefined,
        metadata.childAreasByParent[regionValue],
      ];

      for (const c of regionCandidates) {
        const match = filterAreasByLevel(c, 'Woreda');
        if (match) {
          childAreas = match;
          break;
        }
      }

      if (!childAreas || childAreas.length === 0) {
        const matched: AdministrativeArea[] = [];
        for (const list of Object.values(metadata.childAreasByParent)) {
          for (const a of list) {
            if (
              (!a.level_name || a.level_name === 'Woreda') &&
              (a.parent_administrative_area === parentKey ||
                (regionNode && a.parent_administrative_area === regionNode.area_id) ||
                (regionNode?.code && a.path_code?.includes(regionNode.code)) ||
                (regionNode?.path_code && a.path_code?.startsWith(regionNode.path_code)) ||
                a.parent_administrative_area?.toLowerCase() === normalizedRegion)
            ) {
              if (!matched.some((m) => m.area_id === a.area_id)) {
                matched.push(a);
              }
            }
          }
        }
        if (matched.length > 0) {
          childAreas = matched;
        }
      }
    }

    if (childAreas && childAreas.length > 0) {
      const seen = new Set<string>();
      const result: Array<{ value: string; label: string }> = [];
      for (const a of childAreas) {
        if (!seen.has(a.area_name)) {
          seen.add(a.area_name);
          result.push({
            value: a.area_name,
            label: a.area_name,
          });
        }
      }
      return result;
    }

    return [];
  }
);

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
      state.metadata.childAreasStatus[`${zoneValue}_Woreda`] ||
      state.metadata.childAreasStatus[zoneValue] ||
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
      state.metadata.childAreasStatus[`${regionValue}_Woreda`] ||
      state.metadata.childAreasStatus[regionValue] ||
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
      state.metadata.childAreasByParent[parentKey] ||
      (zoneNode?.path_code ? state.metadata.childAreasByParent[`${zoneNode.path_code}_Woreda`] : undefined) ||
      (zoneNode?.path_code ? state.metadata.childAreasByParent[zoneNode.path_code] : undefined) ||
      (zoneNode?.code ? state.metadata.childAreasByParent[`${zoneNode.code}_Woreda`] : undefined) ||
      (zoneNode?.code ? state.metadata.childAreasByParent[zoneNode.code] : undefined) ||
      (zoneNode?.area_name ? state.metadata.childAreasByParent[`${zoneNode.area_name}_Woreda`] : undefined) ||
      (zoneNode?.area_name ? state.metadata.childAreasByParent[zoneNode.area_name] : undefined);
    const found = zoneChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda) ||
        (a.path_code && a.path_code.toLowerCase() === normWoreda)
    );
    if (found) return found;
  }

  if (regionValue) {
    const normalizedRegion = regionValue.toLowerCase().trim();
    const regionNode = state.metadata.regions.find(
      (r) =>
        r.area_id.toLowerCase() === normalizedRegion ||
        r.area_name.toLowerCase() === normalizedRegion ||
        (r.code && r.code.toLowerCase() === normalizedRegion) ||
        (r.path_code && r.path_code.toLowerCase() === normalizedRegion)
    );
    const parentKey = regionNode?.area_id || regionValue;
    const regionChildren =
      state.metadata.childAreasByParent[`${parentKey}_Woreda`] ||
      state.metadata.childAreasByParent[parentKey] ||
      (regionNode?.path_code ? state.metadata.childAreasByParent[`${regionNode.path_code}_Woreda`] : undefined) ||
      (regionNode?.path_code ? state.metadata.childAreasByParent[regionNode.path_code] : undefined) ||
      (regionNode?.code ? state.metadata.childAreasByParent[`${regionNode.code}_Woreda`] : undefined) ||
      (regionNode?.code ? state.metadata.childAreasByParent[regionNode.code] : undefined) ||
      (regionNode?.area_name ? state.metadata.childAreasByParent[`${regionNode.area_name}_Woreda`] : undefined) ||
      (regionNode?.area_name ? state.metadata.childAreasByParent[regionNode.area_name] : undefined);
    const found = regionChildren?.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda) ||
        (a.path_code && a.path_code.toLowerCase() === normWoreda)
    );
    if (found) return found;
  }

  if (state.metadata.woredas?.length > 0) {
    const found = state.metadata.woredas.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda) ||
        (a.path_code && a.path_code.toLowerCase() === normWoreda)
    );
    if (found) return found;
  }

  for (const childList of Object.values(state.metadata.childAreasByParent)) {
    const found = childList.find(
      (a) =>
        a.area_name.toLowerCase() === normWoreda ||
        a.area_id.toLowerCase() === normWoreda ||
        (a.code && a.code.toLowerCase() === normWoreda) ||
        (a.path_code && a.path_code.toLowerCase() === normWoreda)
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
  const candidates = [
    state.metadata.childAreasByParent[`${parentKey}_Kebele`],
    state.metadata.childAreasByParent[`${woredaNode?.path_code}_Kebele`],
    state.metadata.childAreasByParent[`${woredaNode?.code}_Kebele`],
    state.metadata.childAreasByParent[`${woredaNode?.area_name}_Kebele`],
    state.metadata.childAreasByParent[`${woredaValue}_Kebele`],
    state.metadata.childAreasByParent[parentKey],
    woredaNode?.path_code ? state.metadata.childAreasByParent[woredaNode.path_code] : undefined,
    woredaNode?.code ? state.metadata.childAreasByParent[woredaNode.code] : undefined,
    woredaNode?.area_name ? state.metadata.childAreasByParent[woredaNode.area_name] : undefined,
    state.metadata.childAreasByParent[woredaValue],
  ];

  for (const c of candidates) {
    const match = filterAreasByLevel(c, 'Kebele');
    if (match) {
      return match;
    }
  }

  const normWoreda = woredaValue.toLowerCase().trim();
  const matched: AdministrativeArea[] = [];
  for (const list of Object.values(state.metadata.childAreasByParent)) {
    for (const a of list) {
      if (
        (!a.level_name || a.level_name === 'Kebele') &&
        (a.parent_administrative_area === parentKey ||
          (woredaNode && a.parent_administrative_area === woredaNode.area_id) ||
          (woredaNode?.code && a.path_code?.includes(woredaNode.code)) ||
          (woredaNode?.path_code && a.path_code?.startsWith(woredaNode.path_code)) ||
          a.parent_administrative_area?.toLowerCase() === normWoreda)
      ) {
        if (!matched.some((m) => m.area_id === a.area_id)) {
          matched.push(a);
        }
      }
    }
  }
  return matched.length > 0 ? matched : undefined;
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
      const seen = new Set<string>();
      const result: Array<{ value: string; label: string }> = [];
      for (const a of childAreas) {
        if (!a.level_name || a.level_name === 'Kebele') {
          if (!seen.has(a.area_name)) {
            seen.add(a.area_name);
            result.push({
              value: a.area_name,
              label: a.area_name,
            });
          }
        }
      }
      return result;
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
  if (!woreda && !kebele) return undefined;

  if (woreda) {
    const woredaNode = findWoredaNode(state, woreda, zone, region);
    if (woredaNode) {
      if (!kebele) return woredaNode;

      const normKebele = kebele.toLowerCase().trim();
      const kebeleNode = kebeleChildren(state, woredaNode, woreda)?.find(
        (a) =>
          (!a.level_name || a.level_name === 'Kebele') &&
          (a.area_name.toLowerCase() === normKebele ||
            a.area_id.toLowerCase() === normKebele ||
            (a.code && a.code.toLowerCase() === normKebele) ||
            (a.path_code && a.path_code.toLowerCase() === normKebele))
      );
      return kebeleNode ?? woredaNode;
    }
  }

  if (kebele) {
    const kebeleNode = findKebeleNode(state, kebele, woreda, zone, region);
    if (kebeleNode) return kebeleNode;
  }

  return undefined;
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
    state.metadata.childAreasStatus[`${woredaValue}_Kebele`] ||
    state.metadata.childAreasStatus[woredaValue] ||
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
    const kebeleChildrenList =
      state.metadata.childAreasByParent[`${parentKey}_Kebele`] ||
      state.metadata.childAreasByParent[parentKey] ||
      (woredaNode?.path_code ? state.metadata.childAreasByParent[`${woredaNode.path_code}_Kebele`] : undefined) ||
      (woredaNode?.path_code ? state.metadata.childAreasByParent[woredaNode.path_code] : undefined) ||
      (woredaNode?.code ? state.metadata.childAreasByParent[`${woredaNode.code}_Kebele`] : undefined) ||
      (woredaNode?.code ? state.metadata.childAreasByParent[woredaNode.code] : undefined) ||
      (woredaNode?.area_name ? state.metadata.childAreasByParent[`${woredaNode.area_name}_Kebele`] : undefined) ||
      (woredaNode?.area_name ? state.metadata.childAreasByParent[woredaNode.area_name] : undefined);
    const found = kebeleChildrenList?.find(
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
  (statuses): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();
    for (const s of statuses ?? []) {
      if (s.status && !map.has(s.status)) {
        map.set(s.status, s.label || s.status);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }
);

export const selectCategoryFilterOptions = createSelector(
  [
    (state: MetadataRootState) =>
      state.metadata.submitterOptions?.service_categories ??
      state.metadata.grievanceOptions?.service_categories,
  ],
  (categories): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();
    for (const c of categories ?? []) {
      if (c.category_name && !map.has(c.category_name)) {
        map.set(c.category_name, c.category_name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }
);

export const selectRegionFilterOptions = createSelector(
  [(state: MetadataRootState) => state.metadata.regions],
  (regions): Array<{ value: string; label: string }> => {
    const map = new Map<string, string>();
    for (const r of regions ?? []) {
      if (r.area_name && !map.has(r.area_name)) {
        map.set(r.area_name, r.area_name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }
);

export const selectWoredaFilterOptions = createSelector(
  [
    (state: MetadataRootState) => state.metadata,
    (_state: MetadataRootState, selectedRegions?: string[]) => selectedRegions,
  ],
  (metadata, selectedRegions): Array<{ value: string; label: string }> => {
    const woredaMap = new Map<string, string>();

    if (selectedRegions && selectedRegions.length > 0) {
      for (const regName of selectedRegions) {
        const norm = regName.toLowerCase().trim();
        const regNode = metadata.regions.find(
          (r) =>
            r.area_name.toLowerCase() === norm ||
            r.area_id.toLowerCase() === norm ||
            (r.code && r.code.toLowerCase() === norm) ||
            (r.path_code && r.path_code.toLowerCase() === norm)
        );
        const parentKey = regNode?.area_id || regName;
        const areas =
          metadata.childAreasByParent[`${parentKey}_Woreda`] ||
          metadata.childAreasByParent[parentKey] ||
          (regNode?.path_code ? metadata.childAreasByParent[`${regNode.path_code}_Woreda`] : undefined) ||
          (regNode?.path_code ? metadata.childAreasByParent[regNode.path_code] : undefined) ||
          (regNode?.code ? metadata.childAreasByParent[`${regNode.code}_Woreda`] : undefined) ||
          (regNode?.code ? metadata.childAreasByParent[regNode.code] : undefined) ||
          (regNode?.area_name ? metadata.childAreasByParent[`${regNode.area_name}_Woreda`] : undefined) ||
          (regNode?.area_name ? metadata.childAreasByParent[regNode.area_name] : undefined) ||
          metadata.childAreasByParent[`${regName}_Woreda`] ||
          metadata.childAreasByParent[regName];

        if (areas) {
          for (const area of areas) {
            if (!area.level_name || area.level_name === 'Woreda') {
              woredaMap.set(area.area_name, area.area_name);
            }
          }
        }

        // Also check all child areas for matching region code or path
        for (const childList of Object.values(metadata.childAreasByParent)) {
          for (const area of childList) {
            if (!area.level_name || area.level_name === 'Woreda') {
              if (
                area.parent_administrative_area === parentKey ||
                (regNode && area.parent_administrative_area === regNode.area_id) ||
                (regNode?.code && area.path_code?.includes(regNode.code)) ||
                (regNode?.path_code && area.path_code?.startsWith(regNode.path_code)) ||
                area.parent_administrative_area?.toLowerCase() === norm
              ) {
                woredaMap.set(area.area_name, area.area_name);
              }
            }
          }
        }
      }

      return Array.from(woredaMap.values())
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name }));
    }

    for (const areas of Object.values(metadata.childAreasByParent)) {
      for (const area of areas) {
        if (!area.level_name || area.level_name === 'Woreda') {
          woredaMap.set(area.area_name, area.area_name);
        }
      }
    }

    if (metadata.woredas) {
      for (const area of metadata.woredas) {
        if (!area.level_name || area.level_name === 'Woreda') {
          woredaMap.set(area.area_name, area.area_name);
        }
      }
    }

    return Array.from(woredaMap.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }
);

export const selectKebeleFilterOptions = createSelector(
  [
    (state: MetadataRootState) => state.metadata,
    (_state: MetadataRootState, selectedWoredas?: string[]) => selectedWoredas,
  ],
  (metadata, selectedWoredas): Array<{ value: string; label: string }> => {
    const kebeleMap = new Map<string, string>();

    if (selectedWoredas && selectedWoredas.length > 0) {
      const state = { metadata };
      for (const woredaName of selectedWoredas) {
        const woredaNode = findWoredaNode(state, woredaName);
        const parentKey = woredaNode?.area_id || woredaName;
        const areas =
          metadata.childAreasByParent[`${parentKey}_Kebele`] ||
          metadata.childAreasByParent[parentKey] ||
          (woredaNode?.path_code ? metadata.childAreasByParent[`${woredaNode.path_code}_Kebele`] : undefined) ||
          (woredaNode?.path_code ? metadata.childAreasByParent[woredaNode.path_code] : undefined) ||
          (woredaNode?.code ? metadata.childAreasByParent[`${woredaNode.code}_Kebele`] : undefined) ||
          (woredaNode?.code ? metadata.childAreasByParent[woredaNode.code] : undefined) ||
          (woredaNode?.area_name ? metadata.childAreasByParent[`${woredaNode.area_name}_Kebele`] : undefined) ||
          (woredaNode?.area_name ? metadata.childAreasByParent[woredaNode.area_name] : undefined) ||
          metadata.childAreasByParent[`${woredaName}_Kebele`] ||
          metadata.childAreasByParent[woredaName];

        if (areas) {
          for (const area of areas) {
            if (!area.level_name || area.level_name === 'Kebele') {
              kebeleMap.set(area.area_name, area.area_name);
            }
          }
        }

        const normWoreda = woredaName.toLowerCase().trim();
        for (const childList of Object.values(metadata.childAreasByParent)) {
          for (const area of childList) {
            if (!area.level_name || area.level_name === 'Kebele') {
              if (
                area.parent_administrative_area === parentKey ||
                (woredaNode && area.parent_administrative_area === woredaNode.area_id) ||
                (woredaNode?.code && area.path_code?.includes(woredaNode.code)) ||
                (woredaNode?.path_code && area.path_code?.startsWith(woredaNode.path_code)) ||
                area.parent_administrative_area?.toLowerCase() === normWoreda
              ) {
                kebeleMap.set(area.area_name, area.area_name);
              }
            }
          }
        }
      }

      return Array.from(kebeleMap.values())
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name }));
    }

    for (const areas of Object.values(metadata.childAreasByParent)) {
      for (const area of areas) {
        if (!area.level_name || area.level_name === 'Kebele') {
          kebeleMap.set(area.area_name, area.area_name);
        }
      }
    }

    if (metadata.kebeles) {
      for (const area of metadata.kebeles) {
        if (!area.level_name || area.level_name === 'Kebele') {
          kebeleMap.set(area.area_name, area.area_name);
        }
      }
    }

    return Array.from(kebeleMap.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }
);
