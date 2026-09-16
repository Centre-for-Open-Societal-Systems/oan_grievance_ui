import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
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

// Fallback defaults matching design system and seeded masters
export const FALLBACK_SUBMITTER_TYPES = [
  { value: 'individual', label: 'Individual Farmer' },
  { value: 'cooperative', label: 'Cooperative / FPO' },
  { value: 'ngo', label: 'NGO' },
  { value: 'woreda_kebele', label: 'Woreda/Kebele Body' },
  { value: 'development_agent', label: 'Development Agent (on behalf)' },
];

export const FALLBACK_SUBMISSION_CHANNELS = [
  { value: 'web', label: 'Web Portal' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'ivr', label: 'IVR / Call Centre' },
  { value: 'field_officer', label: 'Field Officer Assisted' },
];

export const FALLBACK_SERVICE_CATEGORIES = [
  { value: 'inputs', label: 'Inputs' },
  { value: 'schemes', label: 'Schemes' },
  { value: 'payments', label: 'Payments' },
  { value: 'credit', label: 'Credit' },
  { value: 'markets', label: 'Markets' },
];

export const FALLBACK_GRIEVANCE_TYPES = [
  { value: 'Fertilizer Shortage', label: 'Fertilizer Shortage', category: 'inputs' },
  { value: 'Seed Quality Issue', label: 'Seed Quality Issue', category: 'inputs' },
  { value: 'Pesticide Availability', label: 'Pesticide Availability', category: 'inputs' },
  { value: 'Direct Benefit Transfer Delay', label: 'Direct Benefit Transfer Delay', category: 'schemes' },
  { value: 'Subsidy Allocation Issue', label: 'Subsidy Allocation Issue', category: 'schemes' },
  { value: 'Payment Failure', label: 'Payment Failure', category: 'payments' },
  { value: 'Delayed Payment Settlement', label: 'Delayed Payment Settlement', category: 'payments' },
  { value: 'Loan Disbursement Delay', label: 'Loan Disbursement Delay', category: 'credit' },
  { value: 'Interest Rate Discrepancy', label: 'Interest Rate Discrepancy', category: 'credit' },
  { value: 'Market access denied', label: 'Market access denied', category: 'markets' },
  { value: 'Market price manipulation', label: 'Market price manipulation', category: 'markets' },
  { value: 'Cooperative buyer default', label: 'Cooperative buyer default', category: 'markets' },
  { value: 'Weighing / measurement dispute', label: 'Weighing / measurement dispute', category: 'markets' },
  { value: 'Market infrastructure failure', label: 'Market infrastructure failure', category: 'markets' },
  { value: 'Export permit / certification delay', label: 'Export permit / certification delay', category: 'markets' },
];

export const FALLBACK_REGIONS = [
  { value: 'Addis Ababa', label: 'Addis Ababa' },
  { value: 'Amhara', label: 'Amhara' },
  { value: 'Oromia', label: 'Oromia' },
  { value: 'Tigray', label: 'Tigray' },
  { value: 'SNNPR', label: 'SNNPR' },
  { value: 'Sidama', label: 'Sidama' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Somali', label: 'Somali' },
  { value: 'Benishangul-Gumuz', label: 'Benishangul-Gumuz' },
  { value: 'Gambela', label: 'Gambela' },
  { value: 'Harari', label: 'Harari' },
  { value: 'Dire Dawa', label: 'Dire Dawa' },
];

export const FALLBACK_STATUSES = [
  'Submitted',
  'Assigned',
  'In Progress',
  'More Info Needed',
  'Pending Submitter',
  'Resolved',
  'Closed',
  'Rejected',
];

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
  { parent: string; data: AdministrativeAreasData },
  AdministrativeAreasQueryParams & { parent: string },
  { rejectValue: string }
>('metadata/fetchChildAreas', async (params, { rejectWithValue }) => {
  try {
    const data = await fetchAdministrativeAreas(params);
    return { parent: params.parent, data };
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
      state.childAreasStatus[parent] = 'loading';
    });
    builder.addCase(fetchChildAreasThunk.fulfilled, (state, action) => {
      const { parent, data } = action.payload;
      state.childAreasStatus[parent] = 'succeeded';
      state.childAreasByParent[parent] = data.areas;
    });
    builder.addCase(fetchChildAreasThunk.rejected, (state, action) => {
      const parent = action.meta.arg.parent;
      state.childAreasStatus[parent] = 'failed';
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
  },
});

export const { clearMetadataErrors } = metadataSlice.actions;
export const metadataReducer = metadataSlice.reducer;

// --- Selectors with Seamless Fallbacks ---

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
  if (lower.includes('web')) return 'web';
  if (lower.includes('app') || lower.includes('mobile app')) return 'mobile';
  if (lower.includes('ivr') || lower.includes('call')) return 'ivr';
  if (lower.includes('officer') || lower.includes('assisted') || lower.includes('da')) return 'field_officer';
  return raw;
}

export const selectSubmitterTypeOptions = (state: RootState): Array<{ value: string; label: string }> => {
  const backendTypes = state.metadata.submitterOptions?.submitter_types;
  if (backendTypes && backendTypes.length > 0) {
    return backendTypes.map((t) => ({
      value: normalizeSubmitterType(t.type_name || t.code),
      label: t.type_name,
    }));
  }
  return FALLBACK_SUBMITTER_TYPES;
};

export const selectSubmissionChannelOptions = (state: RootState): Array<{ value: string; label: string }> => {
  const backendChannels =
    state.metadata.submitterOptions?.submission_types ??
    state.metadata.grievanceOptions?.submission_channels;

  if (backendChannels && backendChannels.length > 0) {
    return backendChannels.map((c) => {
      const name = typeof c === 'string' ? c : c.type_name;
      return {
        value: normalizeSubmissionChannel(name),
        label: name,
      };
    });
  }
  return FALLBACK_SUBMISSION_CHANNELS;
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
  return FALLBACK_SERVICE_CATEGORIES;
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

  if (selectedCategory) {
    const matchCat = selectedCategory.toLowerCase();
    const filtered = FALLBACK_GRIEVANCE_TYPES.filter(
      (t) => t.category.toLowerCase() === matchCat
    );
    if (filtered.length > 0) {
      return filtered.map((t) => ({ value: t.value, label: t.label }));
    }
  }

  return FALLBACK_GRIEVANCE_TYPES.map((t) => ({ value: t.value, label: t.label }));
};

export const selectRegionOptions = (state: RootState): Array<{ value: string; label: string }> => {
  if (state.metadata.regions.length > 0) {
    return state.metadata.regions.map((r) => ({
      value: r.area_name,
      label: r.area_name,
    }));
  }
  return FALLBACK_REGIONS;
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

export const selectStatusFilterOptions = (state: RootState): string[] => {
  const backendStatuses = state.metadata.grievanceOptions?.statuses;
  if (backendStatuses && backendStatuses.length > 0) {
    return ['All', ...backendStatuses.map((s) => s.label)];
  }
  return ['All', ...FALLBACK_STATUSES];
};

export const selectCategoryFilterOptions = (state: RootState): string[] => {
  const categories = selectServiceCategoryOptions(state);
  return ['All', ...categories.map((c) => c.label)];
};

export const selectRegionFilterOptions = (state: RootState): string[] => {
  const regions = selectRegionOptions(state);
  return ['All', ...regions.map((r) => r.label)];
};
