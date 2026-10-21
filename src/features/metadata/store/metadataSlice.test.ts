import { describe, it, expect } from 'vitest';
import {
  normalizeSubmitterType,
  selectGrievanceTypeOptions,
  selectStatusFilterOptions,
  selectSubmissionChannelOptions,
  type MetadataRootState,
  type MetadataState,
} from './metadataSlice';

function createMockRootState(metadataOverrides: Partial<MetadataState> = {}): MetadataRootState {
  return {
    metadata: {
      submitterOptions: null,
      submitterOptionsStatus: 'idle',
      submitterOptionsError: null,
      grievanceOptions: null,
      grievanceOptionsStatus: 'idle',
      grievanceOptionsError: null,
      ...metadataOverrides,
    },
  };
}

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

describe('selectSubmissionChannelOptions', () => {
  const submitterOptions = (submission_types: NonNullable<MetadataState['submitterOptions']>['submission_types']) => ({
    submitter_types: [],
    submission_types,
    preferred_languages: [],
    service_categories: [],
    grievance_types: [],
  });

  it('lists every channel the API returns, with its code-based value and its name as the label', () => {
    const state = createMockRootState({
      submitterOptions: submitterOptions([
        { type_name: 'Development Agent Assisted', code: 'DA', description: '' },
        { type_name: 'IVR Helpline', code: 'IVR', description: '' },
        { type_name: 'Mobile App', code: 'APP', description: '' },
        { type_name: 'Mobile Call', code: 'CALL', description: '' },
        { type_name: 'Web Portal', code: 'WEB', description: '' },
      ]),
    });

    expect(selectSubmissionChannelOptions(state)).toEqual([
      { value: 'field_officer', label: 'Development Agent Assisted' },
      { value: 'ivr', label: 'IVR Helpline' },
      { value: 'mobile', label: 'Mobile App' },
      { value: 'call', label: 'Mobile Call' },
      { value: 'web', label: 'Web Portal' },
    ]);
  });

  it('falls back to the grievance options’ channels when submission_types is empty, not just when it is missing', () => {
    const grievanceOptions = {
      statuses: [],
      departments: [],
      service_categories: [],
      grievance_types: [],
      submission_channels: ['Web Portal', 'IVR Helpline'],
    } as unknown as NonNullable<MetadataState['grievanceOptions']>;

    const empty = createMockRootState({ submitterOptions: submitterOptions([]), grievanceOptions });
    expect(selectSubmissionChannelOptions(empty)).toEqual([
      { value: 'web', label: 'Web Portal' },
      { value: 'ivr', label: 'IVR Helpline' },
    ]);

    const missing = createMockRootState({ submitterOptions: null, grievanceOptions });
    expect(selectSubmissionChannelOptions(missing)).toEqual(selectSubmissionChannelOptions(empty));
  });

  it('is empty when neither source has a channel', () => {
    expect(selectSubmissionChannelOptions(createMockRootState({ submitterOptions: submitterOptions([]) }))).toEqual([]);
    expect(selectSubmissionChannelOptions(createMockRootState())).toEqual([]);
  });
});

describe('normalizeSubmitterType', () => {
  it('keeps the backend\'s separate Cooperative and FPO types apart, so the dropdown never selects both', () => {
    expect(normalizeSubmitterType('Cooperative')).toBe('cooperative');
    expect(normalizeSubmitterType('FPO')).toBe('fpo');
  });
});

describe('selectStatusFilterOptions', () => {
  it('leaves out the backend\'s "All" card, since the filter dropdowns add their own All row', () => {
    const state = createMockRootState({
      grievanceOptions: {
        departments: [],
        service_categories: [],
        grievance_types: [],
        submission_channels: [],
        statuses: [
          { status: 'All', label: 'All', is_open: 1, is_terminal: 0 },
          { status: 'Assigned', label: 'Assigned', is_open: 1, is_terminal: 0 },
          { status: 'Resolved', label: 'Resolved', is_open: 0, is_terminal: 1 },
        ],
      },
    });

    expect(selectStatusFilterOptions(state)).toEqual([
      { value: 'Assigned', label: 'Assigned' },
      { value: 'Resolved', label: 'Resolved' },
    ]);
  });
});
