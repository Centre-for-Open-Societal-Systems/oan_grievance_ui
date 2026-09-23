import { describe, it, expect } from 'vitest';
import {
  findFilingArea,
  selectRegionOptions,
  selectZoneOptions,
  selectZoneStatus,
  selectWoredaOptions,
  selectWoredaStatus,
  selectKebeleOptions,
  selectKebeleStatus,
  selectWoredaFilterOptions,
  selectKebeleFilterOptions,
  type MetadataState,
} from './metadataSlice';
import type { RootState } from '@/store';
import type { AdministrativeArea } from '../types';

const mockRegion: AdministrativeArea = {
  area_id: 'reg-oromia',
  area_name: 'Oromia',
  code: 'OR',
  path_code: 'ETH/OR',
  level_name: 'Region',
  is_group: 1,
  depth: 2,
};

const mockZone: AdministrativeArea = {
  area_id: 'zone-north-shewa',
  area_name: 'North Shewa',
  code: 'NSH',
  path_code: 'ETH/OR/NSH',
  level_name: 'Zone',
  parent_administrative_area: 'reg-oromia',
  is_group: 1,
  depth: 3,
};

const mockWoreda: AdministrativeArea = {
  area_id: 'wor-basona',
  area_name: 'Basona Werana',
  code: 'BW',
  path_code: 'ETH/OR/NSH/BW',
  level_name: 'Woreda',
  parent_administrative_area: 'zone-north-shewa',
  is_group: 0,
  depth: 4,
};

const mockKebele: AdministrativeArea = {
  area_id: 'keb-01',
  area_name: 'Kebele 01',
  code: 'K01',
  path_code: 'ETH/OR/NSH/BW/K01',
  level_name: 'Kebele',
  parent_administrative_area: 'wor-basona',
  is_group: 0,
  depth: 5,
};

function createMockRootState(metadataOverrides: Partial<MetadataState> = {}): RootState {
  return {
    auth: {
      user: null,
      status: 'idle',
      error: null,
    },
    metadata: {
      submitterOptions: null,
      submitterOptionsStatus: 'idle',
      submitterOptionsError: null,
      regions: [mockRegion],
      regionsStatus: 'succeeded',
      regionsError: null,
      woredas: [mockWoreda],
      woredasStatus: 'succeeded',
      woredasError: null,
      kebeles: [mockKebele],
      kebelesStatus: 'succeeded',
      kebelesError: null,
      childAreasByParent: {
        'reg-oromia': [mockZone],
        'reg-oromia_Zone': [mockZone],
        'reg-oromia_Woreda': [mockWoreda],
        'zone-north-shewa': [mockWoreda],
        'zone-north-shewa_Woreda': [mockWoreda],
        'wor-basona': [mockKebele],
        'wor-basona_Kebele': [mockKebele],
      },
      childAreasStatus: {
        'reg-oromia': 'succeeded',
        'reg-oromia_Zone': 'succeeded',
        'reg-oromia_Woreda': 'succeeded',
        'zone-north-shewa': 'succeeded',
        'zone-north-shewa_Woreda': 'succeeded',
        'wor-basona': 'succeeded',
        'wor-basona_Kebele': 'succeeded',
      },
      grievanceOptions: null,
      grievanceOptionsStatus: 'idle',
      grievanceOptionsError: null,
      ...metadataOverrides,
    },
    timeline: {
      selectedTicketNumber: null,
      timelineData: null,
      status: 'idle',
      error: null,
      isSubmitting: false,
      submitError: null,
    },
  };
}

describe('Administrative area cascading selectors', () => {
  it('selects region options correctly', () => {
    const state = createMockRootState();
    const regions = selectRegionOptions(state);
    expect(regions).toEqual([{ value: 'Oromia', label: 'Oromia' }]);
  });

  it('selects zone options based on selected region', () => {
    const state = createMockRootState();
    const zones = selectZoneOptions(state, 'Oromia');
    expect(zones).toEqual([{ value: 'North Shewa', label: 'North Shewa' }]);
  });

  it('returns empty zone options if no region selected', () => {
    const state = createMockRootState();
    expect(selectZoneOptions(state, undefined)).toEqual([]);
    expect(selectZoneOptions(state, '')).toEqual([]);
  });

  it('selects woreda options based on selected zone and region', () => {
    const state = createMockRootState();
    const woredas = selectWoredaOptions(state, 'North Shewa', 'Oromia');
    expect(woredas).toEqual([{ value: 'Basona Werana', label: 'Basona Werana' }]);
  });

  it('selects woreda options based on region when no zone is provided', () => {
    const state = createMockRootState();
    const woredas = selectWoredaOptions(state, undefined, 'Oromia');
    expect(woredas).toEqual([{ value: 'Basona Werana', label: 'Basona Werana' }]);
  });

  it('selects woreda options based on selected zone without regionValue', () => {
    const state = createMockRootState();
    const woredas = selectWoredaOptions(state, 'North Shewa');
    expect(woredas).toEqual([{ value: 'Basona Werana', label: 'Basona Werana' }]);
  });

  it('returns empty woreda options when neither zone nor region is selected', () => {
    const state = createMockRootState();
    expect(selectWoredaOptions(state, undefined, undefined)).toEqual([]);
    expect(selectWoredaOptions(state, '', '')).toEqual([]);
  });

  it('selects kebele options based on selected woreda', () => {
    const state = createMockRootState();
    const kebeles = selectKebeleOptions(state, 'Basona Werana', 'North Shewa', 'Oromia');
    expect(kebeles).toEqual([{ value: 'Kebele 01', label: 'Kebele 01' }]);
  });

  it('returns empty kebele options when woreda is not selected', () => {
    const state = createMockRootState();
    expect(selectKebeleOptions(state, undefined)).toEqual([]);
    expect(selectKebeleOptions(state, '')).toEqual([]);
  });

  it('returns correct loading statuses for zone, woreda, and kebele', () => {
    const state = createMockRootState({
      childAreasStatus: {
        'reg-oromia_Zone': 'loading',
        'zone-north-shewa_Woreda': 'loading',
        'wor-basona_Kebele': 'loading',
      },
    });
    expect(selectZoneStatus(state, 'Oromia')).toBe('loading');
    expect(selectWoredaStatus(state, 'North Shewa', 'Oromia')).toBe('loading');
    expect(selectKebeleStatus(state, 'Basona Werana')).toBe('loading');
  });

  it('selects woreda and kebele filter options correctly', () => {
    const state = createMockRootState();
    const woredas = selectWoredaFilterOptions(state);
    expect(woredas).toContainEqual({ value: 'Basona Werana', label: 'Basona Werana' });
    const kebeles = selectKebeleFilterOptions(state);
    expect(kebeles).toContainEqual({ value: 'Kebele 01', label: 'Kebele 01' });
  });
});

describe('findFilingArea', () => {
  const selection = { region: 'Oromia', zone: 'North Shewa', woreda: 'Basona Werana' };

  it('files against the kebele when one is chosen', () => {
    const state = createMockRootState();
    expect(findFilingArea(state, { ...selection, kebele: 'Kebele 01' })?.area_id).toBe('keb-01');
  });

  it('files against the woreda when no kebele is chosen', () => {
    const state = createMockRootState();
    expect(findFilingArea(state, selection)?.area_id).toBe('wor-basona');
    expect(findFilingArea(state, { ...selection, kebele: '' })?.area_id).toBe('wor-basona');
  });

  it('matches the kebele name case-insensitively', () => {
    const state = createMockRootState();
    expect(findFilingArea(state, { ...selection, kebele: '  kebele 01 ' })?.area_id).toBe('keb-01');
  });

  it('only looks for the kebele under the chosen woreda, so a same-named kebele elsewhere is never picked', () => {
    // Kebele names repeat across woredas ("1", "2", ...). A second woreda with
    // its own "Kebele 01" must not be matched when the first woreda is chosen.
    const otherWoreda: AdministrativeArea = { ...mockWoreda, area_id: 'wor-other', area_name: 'Other Woreda', path_code: 'ETH/OR/NSH/OW' };
    const otherKebele: AdministrativeArea = { ...mockKebele, area_id: 'keb-other-01', parent_administrative_area: 'wor-other' };
    const state = createMockRootState({
      childAreasByParent: {
        'reg-oromia': [mockZone],
        'zone-north-shewa_Woreda': [mockWoreda, otherWoreda],
        'wor-basona_Kebele': [mockKebele],
        'wor-other_Kebele': [otherKebele],
      },
    });

    expect(findFilingArea(state, { ...selection, kebele: 'Kebele 01' })?.area_id).toBe('keb-01');
    expect(
      findFilingArea(state, { ...selection, woreda: 'Other Woreda', kebele: 'Kebele 01' })?.area_id
    ).toBe('keb-other-01');
  });

  it('falls back to the woreda when the kebele is not in the loaded list', () => {
    const state = createMockRootState();
    expect(findFilingArea(state, { ...selection, kebele: 'Not A Real Kebele' })?.area_id).toBe('wor-basona');
  });

  it('returns undefined when no woreda is chosen or it cannot be resolved', () => {
    const state = createMockRootState();
    expect(findFilingArea(state, { region: 'Oromia', zone: 'North Shewa' })).toBeUndefined();
    expect(findFilingArea(state, { ...selection, woreda: 'Nowhere' })).toBeUndefined();
  });
});
