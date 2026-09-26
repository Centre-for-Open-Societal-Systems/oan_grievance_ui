import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@/features/auth/store/authSlice';
import { metadataReducer, type MetadataState } from '@/features/metadata/store/metadataSlice';
import type { AdministrativeArea } from '@/features/metadata/types';

// Reference data shared by the submit-grievance component tests: the areas
// and dropdown options the wizard's selects are populated from, in a store
// that looks as if they have already been loaded.

export const region: AdministrativeArea = {
  area_id: 'region-ET04', area_name: 'Oromia', code: 'ET04', path_code: 'ET.ET04',
  level_name: 'Region', is_group: 1, depth: 2,
};
export const zone: AdministrativeArea = {
  area_id: 'zone-ET0401', area_name: 'North Shewa', code: 'ET0401', path_code: 'ET.ET04.ET0401',
  level_name: 'Zone', parent_administrative_area: 'region-ET04', is_group: 1, depth: 3,
};
export const woreda: AdministrativeArea = {
  area_id: 'woreda-ET040101', area_name: 'Basona Werana', code: 'ET040101', path_code: 'ET.ET04.ET0401.ET040101',
  level_name: 'Woreda', parent_administrative_area: 'zone-ET0401', is_group: 0, depth: 4,
};
export const kebele: AdministrativeArea = {
  area_id: 'kebele-ET040101001', area_name: 'Kebele 01', code: 'ET040101001', path_code: 'ET.ET04.ET0401.ET040101.ET040101001',
  level_name: 'Kebele', parent_administrative_area: 'woreda-ET040101', is_group: 0, depth: 5,
};

/** A store holding that reference data, with every load already marked as succeeded. */
export function makeStore(overrides: Partial<MetadataState> = {}) {
  const metadata: MetadataState = {
    submitterOptions: {
      submitter_types: [{ type_name: 'Individual Farmer', code: 'IND', description: 'Farmer' }],
      submission_types: [{ type_name: 'Web Portal', code: 'WEB', description: '' }],
      preferred_languages: [],
      service_categories: [{ category_name: 'Inputs', code: '001', sort_order: 1 }],
      grievance_types: [{ grievance_type_id: 'GTYPE-00001', type_name: 'Fertilizer Shortage', service_category: 'Inputs' }],
    },
    submitterOptionsStatus: 'succeeded',
    submitterOptionsError: null,
    regions: [region],
    regionsStatus: 'succeeded',
    regionsError: null,
    woredas: [woreda],
    woredasStatus: 'succeeded',
    woredasError: null,
    kebeles: [kebele],
    kebelesStatus: 'succeeded',
    kebelesError: null,
    childAreasByParent: {
      'region-ET04_Zone': [zone],
      'zone-ET0401_Woreda': [woreda],
      'woreda-ET040101_Kebele': [kebele],
    },
    childAreasStatus: {
      'region-ET04_Zone': 'succeeded',
      'zone-ET0401_Woreda': 'succeeded',
      'woreda-ET040101_Kebele': 'succeeded',
    },
    grievanceOptions: null,
    grievanceOptionsStatus: 'idle',
    grievanceOptionsError: null,
    selectedLanguage: 'en',
    ...overrides,
  };
  return configureStore({ reducer: { auth: authReducer, metadata: metadataReducer }, preloadedState: { metadata } });
}
