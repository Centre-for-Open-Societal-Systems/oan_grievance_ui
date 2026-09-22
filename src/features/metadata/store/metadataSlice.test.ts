import { describe, it, expect } from 'vitest';
import {
  selectRegionOptions,
  selectZoneOptions,
  selectZoneStatus,
  selectWoredaOptions,
  selectWoredaStatus,
  selectKebeleOptions,
  selectKebeleStatus,
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
});
