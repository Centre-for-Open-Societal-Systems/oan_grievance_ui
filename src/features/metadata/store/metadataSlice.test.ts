import { describe, it, expect } from 'vitest';
import {
  findFilingArea,
  selectGrievanceTypeOptions,
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

describe('selectGrievanceTypeOptions', () => {
  // Grievance Type autonames "format:GTYPE-{#####}" on the backend — its
  // `name` (what the grievance_type Link field must hold) is a generated id,
  // never the type_name. Sending the display text 404s the moment a draft is
  // saved or a case is submitted: "Could not find Grievance Type: <label>".
  // Unlike this one, submission channel/submitter type/service category each
  // autoname on their own display field, so their value IS their label —
  // don't "fix" this one to match those without checking the doctype first.
  it('uses grievance_type_id as the value and the display name as the label', () => {
    const state = createMockRootState({
      submitterOptions: {
        submitter_types: [],
        submission_types: [],
        preferred_languages: [],
        service_categories: [],
        grievance_types: [
          { grievance_type_id: 'GTYPE-00001', type_name: 'Fertilizer Shortage', service_category: 'Inputs' },
        ],
      },
    });

    expect(selectGrievanceTypeOptions(state)).toEqual([
      { value: 'GTYPE-00001', label: 'Fertilizer Shortage' },
    ]);
  });
});

describe('Multi-parent administrative areas and Sub-city woredas', () => {
  const addisAbabaRegion: AdministrativeArea = {
    area_id: 'region-ET14',
    area_name: 'Addis Ababa',
    code: 'ET14',
    path_code: 'ET.ET14',
    level_name: 'Region',
    is_group: 1,
    depth: 2,
  };

  const addisZone: AdministrativeArea = {
    area_id: 'zone-ET1401',
    area_name: 'Addis Ababa Zone',
    code: 'ET1401',
    path_code: 'ET.ET14.ET1401',
    level_name: 'Zone',
    parent_administrative_area: 'region-ET14',
    is_group: 1,
    depth: 3,
  };

  const addisKetemaWoreda: AdministrativeArea = {
    area_id: 'woreda-ET140108',
    area_name: 'Addis Ketema Sub City',
    code: 'ET140108',
    depth: 4,
    is_group: 1,
    level_name: 'Woreda',
    parent_administrative_area: 'zone-ET1401',
    path_code: 'ET.ET14.ET1401.ET140108',
  };

  const boleWoreda: AdministrativeArea = {
    area_id: 'woreda-ET140104',
    area_name: 'Bole Sub City',
    code: 'ET140104',
    depth: 4,
    is_group: 1,
    level_name: 'Woreda',
    parent_administrative_area: 'zone-ET1401',
    path_code: 'ET.ET14.ET1401.ET140104',
  };

  it('resolves woreda options when areas are indexed under zone or region path', () => {
    const state = createMockRootState({
      regions: [mockRegion, addisAbabaRegion],
      childAreasByParent: {
        'zone-ET1401_Woreda': [addisKetemaWoreda, boleWoreda],
        'zone-ET1401': [addisKetemaWoreda, boleWoreda],
        'region-ET14_Zone': [addisZone],
        'region-ET14': [addisZone],
      },
    });

    const woredasWithZone = selectWoredaOptions(state, 'Addis Ababa Zone', 'Addis Ababa');
    expect(woredasWithZone).toContainEqual({ value: 'Addis Ketema Sub City', label: 'Addis Ketema Sub City' });
    expect(woredasWithZone).toContainEqual({ value: 'Bole Sub City', label: 'Bole Sub City' });

    const woredasByRegion = selectWoredaOptions(state, undefined, 'Addis Ababa');
    expect(woredasByRegion).toContainEqual({ value: 'Addis Ketema Sub City', label: 'Addis Ketema Sub City' });
  });

  it('selects multi-region filter woredas across multiple selected regions', () => {
    const state = createMockRootState({
      regions: [mockRegion, addisAbabaRegion],
      childAreasByParent: {
        'reg-oromia_Woreda': [mockWoreda],
        'zone-ET1401_Woreda': [addisKetemaWoreda, boleWoreda],
      },
    });

    const filterOptions = selectWoredaFilterOptions(state, ['Oromia', 'Addis Ababa']);
    expect(filterOptions).toContainEqual({ value: 'Basona Werana', label: 'Basona Werana' });
    expect(filterOptions).toContainEqual({ value: 'Addis Ketema Sub City', label: 'Addis Ketema Sub City' });
    expect(filterOptions).toContainEqual({ value: 'Bole Sub City', label: 'Bole Sub City' });
  });

  it('selects multi-woreda filter kebeles across multiple selected woredas', () => {
    const addisKebele01: AdministrativeArea = {
      area_id: 'keb-ak-01',
      area_name: 'Woreda 01 Kebele',
      code: 'K01',
      path_code: 'ET.ET14.ET1401.ET140108.K01',
      level_name: 'Kebele',
      parent_administrative_area: 'woreda-ET140108',
      is_group: 0,
      depth: 5,
    };

    const state = createMockRootState({
      regions: [mockRegion, addisAbabaRegion],
      childAreasByParent: {
        'wor-basona_Kebele': [mockKebele],
        'woreda-ET140108_Kebele': [addisKebele01],
        'zone-ET1401_Woreda': [addisKetemaWoreda],
      },
    });

    const kebeles = selectKebeleFilterOptions(state, ['Basona Werana', 'Addis Ketema Sub City']);
    expect(kebeles).toContainEqual({ value: 'Kebele 01', label: 'Kebele 01' });
    expect(kebeles).toContainEqual({ value: 'Woreda 01 Kebele', label: 'Woreda 01 Kebele' });
  });
});
