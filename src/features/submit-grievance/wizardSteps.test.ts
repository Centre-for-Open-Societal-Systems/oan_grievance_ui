import { describe, expect, it } from 'vitest';
import {
  FARMER_LOCKED_CATEGORY,
  FARMER_LOCKED_DETAILS,
  firstIncompleteStep,
  getDetailsErrors,
  type WizardFields,
} from './wizardSteps';

const area = (id: string) => ({ id, name: id, pathCode: '' });

const COMPLETE: WizardFields = {
  submitterType: 'individual',
  submissionChannel: 'web',
  identityValues: { fullName: 'Tigist Bekele', phoneCode: '+251', phoneNumber: '0911000000', faydaId: '1234567890123456', email: 'tigist@example.com' },
  serviceCategory: 'Inputs',
  grievanceType: 'GTYPE-00001',
  region: area('region-ET04'),
  zone: area('zone-ET0401'),
  woreda: area('woreda-ET040101'),
  description: 'Fertilizer allocated for the season has not reached the kebele store.',
};

describe('firstIncompleteStep', () => {
  it('allows Review & Submit only when every earlier step is valid', () => {
    expect(firstIncompleteStep(COMPLETE)).toBe(3);
  });

  it('stops at Step 1 when the submitter identity is incomplete', () => {
    expect(firstIncompleteStep({ ...COMPLETE, submissionChannel: '' })).toBe(1);
    expect(firstIncompleteStep({ ...COMPLETE, identityValues: {} })).toBe(1);
  });

  it('stops at Step 2 when a required detail is missing or the description is too short', () => {
    expect(firstIncompleteStep({ ...COMPLETE, woreda: null })).toBe(2);
    expect(firstIncompleteStep({ ...COMPLETE, description: 'Too short' })).toBe(2);
  });
});

describe('an individual farmer, whose details are read-only', () => {
  const EMPTY_FARMER: WizardFields = {
    ...COMPLETE,
    identityValues: {},
    serviceCategory: '',
    grievanceType: '',
    region: null,
    zone: null,
    woreda: null,
    readOnlyIdentityFields: ['fullName', 'faydaId', 'phoneNumber', 'email'],
    lockedDetailsFields: FARMER_LOCKED_DETAILS,
  };

  it('is not held on Step 1 or Step 2 by read-only fields that are empty', () => {
    expect(firstIncompleteStep(EMPTY_FARMER)).toBe(3);
  });

  it('still needs the description, which the farmer does write', () => {
    expect(firstIncompleteStep({ ...EMPTY_FARMER, description: '' })).toBe(2);
  });

  it('is still held on the location when only category and type are locked (a profile with no area)', () => {
    expect(firstIncompleteStep({ ...EMPTY_FARMER, lockedDetailsFields: FARMER_LOCKED_CATEGORY })).toBe(2);
  });

  it('is still held for the same fields when they are not read-only', () => {
    expect(firstIncompleteStep({ ...EMPTY_FARMER, readOnlyIdentityFields: undefined })).toBe(1);
    expect(firstIncompleteStep({ ...EMPTY_FARMER, lockedDetailsFields: undefined })).toBe(2);
  });
});

describe('getDetailsErrors', () => {
  it('does not require a locked field', () => {
    const fields = { serviceCategory: '', grievanceType: '', region: null, zone: null, woreda: null, description: '' };
    expect(Object.keys(getDetailsErrors(fields, undefined, false, FARMER_LOCKED_DETAILS))).toEqual(['description']);
  });

  it('flags every missing required field, and never the optional kebele', () => {
    const errors = getDetailsErrors({
      serviceCategory: '',
      grievanceType: '',
      region: null,
      zone: null,
      woreda: null,
      description: '',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['description', 'grievanceType', 'region', 'serviceCategory', 'woreda', 'zone'].sort()
    );
  });
});

describe('voice note in place of a description', () => {
  const noText = { ...COMPLETE, description: '' };

  it('requires a description without a recording', () => {
    expect(getDetailsErrors(noText)).toHaveProperty('description');
    expect(firstIncompleteStep(noText)).toBe(2);
  });

  it('does not require one with a recording', () => {
    expect(getDetailsErrors(noText, undefined, true)).not.toHaveProperty('description');
    expect(firstIncompleteStep({ ...noText, hasVoiceNote: true })).toBe(3);
  });
});
